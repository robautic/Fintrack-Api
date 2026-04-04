import { groqClient } from '../lib/groq'
import { knex } from '../database'

export async function categorizeTransaction(
  description: string,
): Promise<string> {
  const completion = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a financial categorization assistant.
        Classify the transaction into ONLY ONE of these categories:
        Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Serviços, Outros.
        Answer with EXACTLY ONE category name. No quotes, no periods, no explanations.`,
      },
      {
        role: 'user',
        content: description,
      },
    ],
  })

  return completion.choices[0]?.message?.content?.trim() ?? 'outros'
}

export async function processCategorizationBackground(
  transactionId: string,
  description: string,
) {
  try {
    const category = await categorizeTransaction(description)
    await knex('transactions').where({ id: transactionId }).update({ category })
    console.log(`[AI] Transaction ${transactionId} categorized as: ${category}`)
  } catch (error) {
    console.log(`[AI] Error categorizing transaction ${transactionId}:`, error)
  }
}
