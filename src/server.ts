import { buildApp } from './app'
import { env } from './env'

const app = buildApp()

const port = process.env.PORT ? Number(process.env.PORT) : env.PORT
const host = '0.0.0.0'

app.listen({ port, host }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server running at ${address}`)
})
