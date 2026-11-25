import { sentryPagesPlugin } from '@sentry/cloudflare'
import type { Env } from '../server/api'
import { sentryOptions, type SentryEnv } from '../server/sentry'

// Sentry su tutte le richieste delle Functions (oggi solo /api). Le anteprime dei rami hanno CF_PAGES_BRANCH ≠ main.
export const onRequest = sentryPagesPlugin<Env & SentryEnv & { CF_PAGES_BRANCH?: string; CF_PAGES_COMMIT_SHA?: string }>((context) =>
  sentryOptions({
    ...context.env,
    SENTRY_RELEASE: context.env.CF_PAGES_COMMIT_SHA,
    SENTRY_ENVIRONMENT: context.env.SENTRY_ENVIRONMENT ?? (context.env.CF_PAGES_BRANCH && context.env.CF_PAGES_BRANCH !== 'main' ? 'preview' : 'production'),
  }),
)
