import { groqClient } from '../lib/groq'
import { knex } from '../database'

export async function categorizeTransaction(
  description: string,
): Promise<string> {
  console.log('[AI] Chamando Groq com descrição:', description)
  if (!process.env.GROQ_API_KEY) {
    console.error('[AI] GROQ_API_KEY não está definida!')
    return 'Outros'
  }

  try {
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente de categorização financeira especialista em gastos.
Classifique a transação em APENAS UMA destas categorias:
Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Serviços, Outros.

REGRAS OBRIGATÓRIAS DE MAPEAMENTO:
- Se o texto contiver '99', 'Uber', 'Cabify', 'Indriver', 'Posto', 'Shell', 'Ipiranga', 'Estacionamento', 'Metrô', 'Trem', 'Ônibus' -> RESPOSTA: Transporte
- Se contiver 'Ifood', 'McDonalds', 'Restaurante', 'Padaria', 'Zé Delivery', 'Mercado', 'Burger King', 'Supermercado', 'Carrefour', 'Assaí', 'Atacadão', 'Pão de Açúcar', 'Extra', 'Dia', 'Hortifruti', 'Açougue', 'Bebidas' -> RESPOSTA: Alimentação
- Se contiver 'Netflix', 'Spotify', 'Cinema', 'Steam', 'PlayStation', 'Ingresso', 'Bar', 'Teatro', 'Show', 'Parque' -> RESPOSTA: Lazer
- Se contiver 'Aluguel', 'Condominio', 'Luz', 'Agua', 'Internet', 'Vivo', 'Claro', 'Tim', 'Oi', 'Gás', 'IPTU' -> RESPOSTA: Moradia
- Se contiver 'Farmácia', 'Hospital', 'Dentista', 'Unimed', 'Clínica', 'Exame', 'Consulta', 'Remédio' -> RESPOSTA: Saúde
- Se contiver 'Escola', 'Faculdade', 'Curso', 'Livro', 'Material escolar' -> RESPOSTA: Educação
- Se contiver 'Salão', 'Barbearia', 'Manicure', 'Assinatura', 'Streaming', 'Software', 'App' -> RESPOSTA: Serviços

Responda APENAS o nome da categoria escolhida. Sem pontos, sem aspas, sem explicações adicionais.`,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      temperature: 0,
    })

    const rawCategory =
      completion.choices[0]?.message?.content?.trim().replace(/[".]/g, '') ||
      'Outros'

    const finalCategory =
      rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase()
    console.log('[AI] Categoria retornada pela IA:', finalCategory)
    return finalCategory
  } catch (error) {
    console.error('[AI] Erro na chamada à Groq:', error)
    return 'Outros'
  }
}

export async function processCategorizationBackground(
  transactionId: string,
  description: string,
) {
  console.log(
    `[AI] Iniciando categorização para ${transactionId} com descrição: "${description}"`,
  )
  try {
    const category = await categorizeTransaction(description)
    await knex('transactions').where({ id: transactionId }).update({ category })
    console.log(
      `[AI] Transaction ${transactionId} atualizada para: ${category}`,
    )
  } catch (error) {
    console.error(`[AI] ERRO ao categorizar transação ${transactionId}:`, error)
    if (error instanceof Error) {
      console.error('[AI] Mensagem:', error.message)
      console.error('[AI] Stack:', error.stack)
    }
  }
}
