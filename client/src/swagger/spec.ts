/**
 * OpenAPI Spec Composer
 *
 * Only includes Public API routes (/api/public/*).
 * AI: when adding new public endpoint files, import and spread into `paths`.
 */

import { info, servers, securitySchemes } from './common'
import { schemas } from './schemas'
import { publicPaths } from './paths/public'

export const swaggerSpec = {
  openapi: '3.0.0',
  info,
  servers,
  components: {
    securitySchemes,
    schemas,
  },
  paths: {
    ...publicPaths,
  },
}
