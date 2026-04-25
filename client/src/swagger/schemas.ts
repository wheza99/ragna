/**
 * OpenAPI Schemas
 *
 * Only define models returned/consumed by Public API routes.
 * AI: when adding new public endpoints, add corresponding schemas here.
 */

export const schemas = {
  // ── Base Response ────────────────────────────────────────
  ResponseList: {
    type: 'object',
    properties: {
      data: { type: 'array', items: { type: 'object' } },
    },
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string' },
    },
  },

  // ── Domain Models (returned by public routes) ────────────
  Todo: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Todo ID' },
      text: { type: 'string', description: 'Todo text' },
      done: { type: 'boolean', description: 'Completion status' },
      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
  },
  Stats: {
    type: 'object',
    properties: {
      total: { type: 'number' },
      done: { type: 'number' },
      pending: { type: 'number' },
    },
  },
}
