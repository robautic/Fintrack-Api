# Fintrack AI

Sistema de controle financeiro pessoal que automatiza a captura de gastos via e-mail (Nubank e 99Pay), categoriza as transações com IA (Groq/Llama 3) e exibe tudo em um dashboard moderno.

![Dashboard](public/screenshot.png)

## Deploy

API: https://fintrack-api-a3by.onrender.com

## Como funciona

1. **Captura automática** — n8n monitora o Gmail a cada 5 minutos e detecta e-mails de gastos do Nubank e 99Pay
2. **Processamento** — um workflow extrai título e valor do e-mail e envia para a API via HTTP Request
3. **Categorização com IA** — a API recebe a transação e chama o Groq (Llama 3.3) em background para categorizar automaticamente
4. **Anti-duplicata** — cada e-mail tem um `email_id` único que impede a mesma transação de entrar duas vezes
5. **Dashboard** — tudo aparece em tempo real no frontend com gráficos, filtros por mês e lançamento manual

## Tecnologias

| Ferramenta | Finalidade |
|------------|-----------|
| Node.js v20+ | Runtime |
| TypeScript | Tipagem estática |
| Fastify | Framework HTTP |
| Knex.js | Query builder SQL |
| Zod | Validação de schemas |
| PostgreSQL | Banco de dados em produção |
| SQLite | Banco de dados em desenvolvimento |
| JWT | Autenticação com access token + refresh token |
| Groq / Llama 3.3 | Categorização de transações com IA |
| n8n | Automação Gmail → API |
| Chart.js | Gráficos no dashboard |

## Rotas

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/register` | Cadastro de usuário |
| `POST` | `/auth/login` | Login, retorna accessToken |
| `POST` | `/auth/refresh` | Renova o accessToken |

### Transações
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/transactions` | Lista todas as transações |
| `GET` | `/transactions/:id` | Busca transação por ID |
| `GET` | `/transactions/summary` | Saldo consolidado |
| `GET` | `/transactions/metrics/summary` | Métricas completas para o dashboard |
| `POST` | `/transactions` | Cria transação (usado pelo n8n) |
| `POST` | `/transactions/manual` | Lançamento manual via dashboard |
| `DELETE` | `/transactions/:id` | Remove uma transação |

## Como executar

**Pré-requisito:** Node.js >= 20.0.0

### 1. Instale as dependências
```bash
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
NODE_ENV=development
DATABASE_CLIENT=sqlite
DATABASE_URL="./db/app.db"
JWT_ACCESS_SECRET=sua_chave_aqui
JWT_REFRESH_SECRET=sua_chave_aqui
GROQ_API_KEY=sua_chave_aqui
FINTRACK_API_KEY=sua_chave_aqui
```

### 3. Execute as migrations
```bash
npm run knex -- migrate:latest
```

### 4. Inicie o servidor
```bash
npm run dev
```

## Configuração do n8n

O workflow do n8n realiza as seguintes etapas:

1. **Schedule Trigger** — executa a cada 5 minutos
2. **Gmail** — busca e-mails não lidos com filtro `newer_than:1d from:noreply@99app.com OR from:nubank.com.br`
3. **Code in JavaScript** — extrai título, valor e `email_id` do snippet do e-mail
4. **HTTP Request** — envia `POST /transactions` com `x-api-key` no header

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento com hot reload |
| `npm run build` | Compila TypeScript para produção via tsup |
| `npm run start` | Inicia o servidor compilado |
| `npm run knex` | Executa comandos do Knex CLI |
| `npm run lint` | Verifica o código com ESLint |

## Licença

ISC
