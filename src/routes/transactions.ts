import { knex } from '../database.js'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate.js'
import { processCategorizationBackground } from '../services/ai.service'

export async function transactionsRoutes(app: FastifyInstance) {
  // Rotas de configuração do usuário (saldo inicial)
  app.get('/config', { preHandler: [authenticate] }, async (request) => {
    const userId = (request.user as { id: string }).id
    const config = await knex('user_config').where({ user_id: userId }).first()
    return { initialBalance: config?.initial_balance || 0 }
  })

  app.post('/config', { preHandler: [authenticate] }, async (request) => {
    const schema = z.object({ initialBalance: z.number() })
    const { initialBalance } = schema.parse(request.body)
    const userId = (request.user as { id: string }).id

    await knex('user_config')
      .insert({ user_id: userId, initial_balance: initialBalance })
      .onConflict('user_id')
      .merge({ initial_balance: initialBalance })

    return { success: true }
  })

  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const userId = (request.user as { id: string }).id
    const transactions = await knex('transactions')
      .where('user_id', userId)
      .select()
    return { transactions }
  })

  app.get('/summary', { preHandler: [authenticate] }, async (request) => {
    const userId = (request.user as { id: string }).id
    const summary = await knex('transactions')
      .where('user_id', userId)
      .sum({ amount: 'amount' })
      .first()
    return { summary }
  })

  app.get(
    '/metrics/summary',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = (request.user as { id: string }).id

        if (!userId) {
          return {
            balance: 0,
            totalIncome: 0,
            totalExpenses: 0,
            categories: [],
            evolution: [],
          }
        }

        const { month, year } = request.query as {
          month?: string
          year?: string
        }

        let baseQuery = knex('transactions').where('user_id', userId)
        if (month && year) {
          const client = knex.client.config.client
          if (client === 'pg') {
            // PostgreSQL
            baseQuery = baseQuery.whereRaw(
              'EXTRACT(MONTH FROM created_at) = ? AND EXTRACT(YEAR FROM created_at) = ?',
              [month, year],
            )
          } else {
            // SQLite (desenvolvimento)
            baseQuery = baseQuery.whereRaw(
              "strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ?",
              [month.padStart(2, '0'), year],
            )
          }
        }

        const stats = await baseQuery
          .clone()
          .select(
            knex.raw(
              'SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as "totalIncome"',
            ),
            knex.raw(
              'SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as "totalExpenses"',
            ),
            knex.raw('SUM(amount) as balance'),
          )
          .first()

        interface CategoryResult {
          category: string
          total: number
        }

        const categories = (await baseQuery
          .clone()
          .where('amount', '<', 0)
          .select('category')
          .sum({ total: 'amount' })
          .groupBy('category')) as unknown as CategoryResult[]

        interface EvolutionResult {
          date: string
          amount: number
        }

        const evolution = (await baseQuery
          .clone()
          .select(knex.raw('DATE(created_at) as date'))
          .sum({ amount: 'amount' })
          .groupBy('date')
          .orderBy('date', 'asc')) as unknown as EvolutionResult[]

        const totalIncome = Number(stats?.totalIncome || 0)
        const totalExpenses = Number(stats?.totalExpenses || 0) // já é negativo
        const currentBalance = totalIncome + totalExpenses

        return {
          balance: currentBalance,
          totalIncome,
          totalExpenses: Math.abs(totalExpenses),
          categories: categories.map((c) => ({
            category: c.category,
            total: Math.abs(Number(c.total)),
          })),
          evolution: evolution.map((e) => ({
            date: e.date,
            amount: Number(e.amount),
          })),
        }
      } catch (error) {
        console.error('[metrics/summary] ERRO:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          reason: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        })
      }
    },
  )

  app.post(
    '/manual',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const schema = z.object({
        title: z.string(),
        amount: z.number(),
        type: z.enum(['credit', 'debit']),
      })
      const { title, amount, type } = schema.parse(request.body)
      const userId = (request.user as { id: string }).id

      const [transaction] = await knex('transactions')
        .insert({
          id: randomUUID(),
          title,
          amount: type === 'credit' ? amount : -amount,
          category: 'manual',
          user_id: userId,
        })
        .returning('*')

      return reply.status(201).send(transaction)
    },
  )

  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const getTransactionParamsSchema = z.object({ id: z.uuid() })
    const { id } = getTransactionParamsSchema.parse(request.params)
    const userId = (request.user as { id: string }).id

    const deleted = await knex('transactions')
      .where({ user_id: userId, id })
      .delete()

    if (!deleted) {
      return reply.status(404).send({ error: 'Transaction not found' })
    }

    return reply.status(204).send()
  })

  app.get('/:id', { preHandler: [authenticate] }, async (request) => {
    const getTransactionParamsSchema = z.object({ id: z.uuid() })
    const { id } = getTransactionParamsSchema.parse(request.params)
    const userId = (request.user as { id: string }).id
    const transaction = await knex('transactions')
      .where({ user_id: userId, id })
      .first()
    return { transaction }
  })

  app.post(
    '/',
    {
      preHandler: async (request, reply) => {
        const apiKey = request.headers['x-api-key']
        console.log(
          '[preHandler] API Key recebida:',
          apiKey ? 'presente' : 'ausente',
        )
        console.log(
          '[preHandler] N8N_USER_ID configurado:',
          process.env.N8N_USER_ID,
        )

        if (apiKey === process.env.FINTRACK_API_KEY) {
          console.log('[preHandler] API Key valida, buscando usuario...')
          try {
            const userRef = await knex('users')
              .where({
                id:
                  process.env.N8N_USER_ID ||
                  '31b1156d-b639-4810-90c5-2e2aaf6cec0a',
              })
              .first()
            if (!userRef) {
              console.error('[preHandler] Usuario nao encontrado para ID')
              return reply
                .status(500)
                .send({ error: 'No user found for automation' })
            }
            console.log('[preHandler] Usuario encontrado:', userRef.id)
            ;(request as typeof request & { user: { id: string } }).user = {
              id: userRef.id,
            }
            return
          } catch (err) {
            console.error('[preHandler] Erro ao buscar usuario:', err)
            return reply.status(500).send({ error: 'Database error' })
          }
        }
        console.log(
          '[preHandler] API Key invalida ou ausente, usando autenticacao JWT',
        )
        return authenticate(request, reply)
      },
    },
    async (request, reply) => {
      console.log(
        '[POST /transactions] Body recebido:',
        JSON.stringify(request.body, null, 2),
      )
      const createTransactionBodySchema = z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          amount: z.number(),
          type: z.enum(['credit', 'debit']).optional().default('debit'),
          category: z.string().optional(),
        })
        .transform((data) => ({
          ...data,
          title: data.title || data.description || 'Sem descrição',
        }))

      try {
        const { title, amount, type, category } =
          createTransactionBodySchema.parse(request.body)

        console.log('[POST /transactions] Dados validados:', {
          title,
          amount,
          type,
          category,
        })

        const [newTransaction] = await knex('transactions')
          .insert({
            id: randomUUID(),
            title,
            amount: type === 'credit' ? amount : amount * -1,
            category: category || 'pendente',
            user_id: (request.user as { id: string }).id,
          })
          .returning('*')

        console.log(
          '[POST /transactions] Transacao inserida:',
          newTransaction.id,
        )

        processCategorizationBackground(newTransaction.id, title)

        fetch('http://localhost:5678/webhook-test/nova-transacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newTransaction.id,
            title,
            amount: newTransaction.amount,
            category: newTransaction.category,
            userId: newTransaction.user_id,
            createdAt: newTransaction.created_at,
          }),
        }).catch(() => {
          console.log('[Webhook] n8n offline')
        })

        return reply.status(201).send(newTransaction)
      } catch (error) {
        console.error('[POST /transactions] Erro ao processar:', error)
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation error',
            details: error.issues,
          })
        }
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )
}
