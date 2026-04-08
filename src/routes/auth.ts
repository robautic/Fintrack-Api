import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { registerUser, loginUser } from '../services/auth.service'
import { verifyRefreshToken, generateTokens } from '../lib/jwt'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    })

    try {
      const { name, email, password } = schema.parse(request.body)
      console.log('[POST /register] Dados validados:', { name, email })

      const user = await registerUser(name, email, password)
      return reply.status(201).send({ user })
    } catch (err) {
      console.error('[POST /register] ERRO CAPTURADO:')
      console.error(err)

      if (err instanceof Error) {
        console.error('[POST /register] Tipo do erro:', err.constructor.name)
        console.error('[POST /register] Mensagem:', err.message)
        console.error('[POST /register] Stack:', err.stack)
      }

      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: err.issues,
        })
      }

      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        return reply.status(409).send({ error: 'Email already registered' })
      }

      return reply.status(500).send({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  })

  app.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    })

    try {
      const { email, password } = schema.parse(request.body)
      console.log('[POST /login] Tentativa de login:', email)

      const { accessToken, refreshToken } = await loginUser(email, password)

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/refresh',
        maxAge: 60 * 60 * 24 * 7,
      })

      console.log('[POST /login] Login bem-sucedido, accessToken gerado.')
      return { accessToken }
    } catch (err) {
      console.error('[POST /login] ERRO CAPTURADO:')
      console.error(err)

      if (err instanceof Error) {
        console.error('[POST /login] Mensagem:', err.message)
      }

      return reply.status(401).send({
        error: 'Invalid credentials',
        message: err instanceof Error ? err.message : undefined,
      })
    }
  })

  app.post('/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken

    if (!token) {
      return reply.status(401).send({ error: 'Refresh token not found' })
    }

    try {
      const payload = verifyRefreshToken(token)
      const { accessToken, refreshToken } = generateTokens(payload.sub)

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/refresh',
        maxAge: 60 * 60 * 24 * 7,
      })

      return { accessToken }
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })
}
