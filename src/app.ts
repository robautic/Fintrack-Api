import fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transactionsRoutes } from './routes/transactions.js'
import { authRoutes } from './routes/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function buildApp() {
  const app = fastify()

  app.register(cors, {
    origin: true,
    credentials: true,
  })

  app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
  })

  app.register(cookie)
  app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET! })

  app.addHook('preHandler', async (request) => {
    const apiKey = request.headers['x-api-key']
    if (apiKey && apiKey === process.env.FINTRACK_API_KEY) {
      request.user = { id: 'n8n-service-account' }
    }
  })

  app.register(authRoutes, { prefix: '/auth' })
  app.register(transactionsRoutes, { prefix: '/transactions' })

  return app
}
