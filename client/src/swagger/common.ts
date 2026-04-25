/**
 * OpenAPI Common Config
 *
 * This Swagger docs is for PUBLIC API consumers.
 * They authenticate with API Key (X-Api-Key header).
 * Private/internal JWT routes are NOT documented here.
 */

export const info = {
  title: 'Public API',
  description:
    'API documentation for external consumers. Authenticate with your API Key via the X-Api-Key header.',
  version: '1.0.0',
  contact: {
    email: 'dev@example.com',
  },
}

export const servers = [
  {
    url: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    description: import.meta.env.VITE_API_URL ? 'Production' : 'Local Development',
  },
]

export const securitySchemes = {
  apiKeyAuth: {
    type: 'apiKey',
    in: 'header',
    name: 'X-Api-Key',
    description: 'API Key from the Keys tab. Format: sk-xxxx...',
  },
}

export const securityApiKey = [{ apiKeyAuth: [] }]
