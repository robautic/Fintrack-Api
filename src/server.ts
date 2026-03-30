import { buildApp } from './app'
import { env } from './env'

const app = buildApp()

app
  .listen({
    port: env.PORT,
  })
  .then(() => {
    console.log('HTTP server running!')
  })
