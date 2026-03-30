# Transactions API

REST API for personal financial transaction management, built with a modern Node.js stack.

## Tech Stack

| Tool | Purpose |
|------|---------|
| Node.js v20+ | Runtime |
| TypeScript | Static typing |
| Fastify | HTTP framework |
| Knex.js | SQL query builder |
| Zod | Schema validation |
| SQLite | Development database |
| PostgreSQL | Production database |
| Vitest + Supertest | Automated testing |

## Features

Session management is handled automatically via cookies (`sessionId`). A unique identifier is generated on the first transaction and persisted across requests.

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/transactions` | Create a new transaction |
| `GET` | `/transactions` | List all transactions for the current session |
| `GET` | `/transactions/:id` | Get a single transaction by ID |
| `GET` | `/transactions/summary` | Get consolidated balance (credits minus debits) |

**Transaction body:**
```json
{
  "title": "Freelance payment",
  "amount": 3000,
  "type": "credit"
}
```

## Getting Started

**Prerequisites:** Node.js >= 20.0.0

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file at the project root:

```env
NODE_ENV=development
DATABASE_CLIENT=sqlite
DATABASE_URL="./db/app.db"
```

For tests, create a `.env.test` file:

```env
NODE_ENV=test
DATABASE_CLIENT=sqlite
DATABASE_URL="./db/test.db"
```

### 3. Run database migrations

```bash
npm run knex -- migrate:latest
```

### 4. Start the development server

```bash
npm run dev
```

## Running Tests

```bash
npm run test
```

Tests use an isolated database defined in `.env.test` and are executed with Vitest + Supertest.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload via `tsx` |
| `npm run build` | Compile TypeScript to production via `tsup` |
| `npm run knex` | Run Knex CLI commands via `tsx` |
| `npm run lint` | Lint and fix code style with ESLint |

## License

ISC
