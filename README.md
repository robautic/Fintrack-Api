# Transactions API

API REST para controle de transações financeiras pessoais, construída com uma stack moderna de Node.js.

## Deploy

API disponível em: https://api-financeira-nodejs.onrender.com

## Tecnologias

| Ferramenta | Finalidade |
|------------|-----------|
| Node.js v20+ | Runtime |
| TypeScript | Tipagem estática |
| Fastify | Framework HTTP |
| Knex.js | Query builder SQL |
| Zod | Validação de schemas |
| SQLite | Banco de dados em desenvolvimento |
| PostgreSQL | Banco de dados em produção |
| Vitest + Supertest | Testes automatizados |

## Funcionalidades

O controle de sessão é feito automaticamente via cookies (`sessionId`). Um identificador único é gerado na primeira transação e persistido nas requisições seguintes.

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/transactions` | Cria uma nova transação |
| `GET` | `/transactions` | Lista todas as transações da sessão atual |
| `GET` | `/transactions/:id` | Retorna uma transação pelo ID |
| `GET` | `/transactions/summary` | Retorna o saldo consolidado (créditos menos débitos) |

**Corpo da requisição (POST):**
```json
{
  "title": "Pagamento freelance",
  "amount": 3000,
  "type": "credit"
}
```

## Como executar

**Pré-requisito:** Node.js >= 20.0.0

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
NODE_ENV=development
DATABASE_CLIENT=sqlite
DATABASE_URL="./db/app.db"
```

Para testes, crie um arquivo `.env.test`:

```env
NODE_ENV=test
DATABASE_CLIENT=sqlite
DATABASE_URL="./db/test.db"
```

### 3. Execute as migrations

```bash
npm run knex -- migrate:latest
```

### 4. Inicie o servidor

```bash
npm run dev
```

## Testes

```bash
npm run test
```

Os testes utilizam um banco de dados isolado definido no `.env.test` e são executados com Vitest + Supertest.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor em modo desenvolvimento com hot reload via `tsx` |
| `npm run build` | Compila o TypeScript para produção via `tsup` |
| `npm run knex` | Executa comandos do Knex CLI via `tsx` |
| `npm run lint` | Verifica e corrige o estilo do código com ESLint |

## Licença

ISC
