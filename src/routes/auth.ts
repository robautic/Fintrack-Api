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
    const { name, email, password } = schema.parse(request.body)

    try {
      const user = await registerUser(name, email, password)
      return reply.status(201).send({ user })
    } catch (err) {
      if (err === 'EMAIL_TAKEN') {
        return reply.status(409).send({ error: 'Email already registered' })
      }
      throw err
    }
  })
  app.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    })
    const { email, password } = schema.parse(request.body)

    try {
      const { accessToken, refreshToken } = await loginUser(email, password)

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/refresh',
        maxAge: 60 * 60 * 24 * 7,
      })
      return { accessToken }
    } catch {
      return reply.status(401).send({ error: 'Invalid credentials' })
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
        secure: process.env.NODE_ENV === 'produticion',
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
