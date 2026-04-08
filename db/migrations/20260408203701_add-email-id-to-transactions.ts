import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.string('email_id').nullable().unique()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('email_id')
  })
}
