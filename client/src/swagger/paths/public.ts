/**
 * OpenAPI Paths — Public API (API Key Auth)
 *
 * These are the routes under /api/public/* that external consumers use.
 * AI: when adding new public endpoints, create a new file in paths/ and import it in spec.ts.
 */

import { securityApiKey } from '../common'

export const publicPaths = {
  '/api/public/todos': {
    get: {
      tags: ['Public API'],
      summary: 'List all todos',
      description: 'Get all todos belonging to the API key owner.',
      security: securityApiKey,
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResponseList' },
            },
          },
        },
        '401': {
          description: 'Invalid or missing API key',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/public/stats': {
    get: {
      tags: ['Public API'],
      summary: 'Get todo statistics',
      description: 'Get aggregate stats (total, done, pending) for the API key owner.',
      security: securityApiKey,
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Stats' },
            },
          },
        },
        '401': {
          description: 'Invalid or missing API key',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
}
