import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

const integrations: any[] = [nodeProfilingIntegration()]
try {
  integrations.push(Sentry.prismaIntegration())
} catch {
  console.warn('[Sentry] prismaIntegration unavailable — skipping (run prisma generate with previewFeatures=["tracing"])')
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  sendDefaultPii: true,
  environment: process.env.NODE_ENV || 'development',
})
