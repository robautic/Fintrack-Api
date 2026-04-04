import { knex } from '../database'
import { categorizeTransaction } from './ai.service'

export async function processCategorizationBackground(
  transactionId: string,
  description: string,
) {
  try {
    const category = await categorizeTransaction(description)

    await knex('transactions').where({ id: transactionId }).update({ category })

    console.log(`[IA] Transação ${transactionId} atualizada para: ${category}`)
  } catch (error) {
    console.log(`[IA] Erro ao categorizar transação ${transactionId}:`, error)
  }
}
