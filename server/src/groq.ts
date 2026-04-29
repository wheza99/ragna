import Groq from 'groq-sdk'

// ── Groq AI Client ──────────────────────────────────────────

function getClient() {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY is not set')
  return new Groq({ apiKey: key })
}

interface ToolDef {
  name: string
  description: string
  method: string
  url: string
  headers: Record<string, string> | null
  body: Record<string, unknown> | null
}

// ── Chat completion with tool calling ───────────────────────
export async function chatWithAgent(
  systemPrompt: string,
  model: string,
  userMessage: string,
  tools?: ToolDef[],
  chatHistory?: { role: 'user' | 'assistant'; content: string }[],
) {
  const client = getClient()

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...(chatHistory || []),
    { role: 'user', content: userMessage },
  ]

  // Convert Ragna tools → Groq function calling format
  const groqTools = (tools || []).filter(t => t.status !== 'inactive').map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
      description: tool.description || `Call ${tool.method} ${tool.url}`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  }))

  const chatParams: any = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  }

  if (groqTools.length > 0) {
    chatParams.tools = groqTools
    chatParams.tool_choice = 'auto'
  }

  const response = await client.chat.completions.create(chatParams)

  const choice = response.choices[0]
  const reply = choice.message.content
  const toolCalls = choice.message.tool_calls

  return {
    reply,
    toolCalls,
    model: response.model,
    usage: response.usage,
  }
}

// ── Simple chat (no tools) ──────────────────────────────────
export async function simpleChat(
  systemPrompt: string,
  model: string,
  userMessage: string,
) {
  const client = getClient()

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })

  return response.choices[0].message.content
}
