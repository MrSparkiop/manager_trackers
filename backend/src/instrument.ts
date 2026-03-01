import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration(), Sentry.prismaIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  sendDefaultPii: true,
  environment: process.env.NODE_ENV || 'development',
})
