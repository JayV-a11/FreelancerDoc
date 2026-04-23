import { buildApp } from '@/app'
import { env } from '@/shared/config/env'

async function main(): Promise<void> {
  const app = await buildApp()

  try {
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    })
    app.log.info(`FreelanceDoc API listening at ${address}`)
    app.log.info(`Swagger docs available at ${address}/docs (non-production only)`)
  } catch (err) {
    app.log.error(err, 'Failed to start server')
    process.exit(1)
  }

  // Graceful shutdown — wait for in-flight requests to complete before exiting.
  // Fastify's app.close() drains the connection pool and fires the onClose hooks
  // (including prisma.$disconnect() registered in app.ts).
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Received shutdown signal — closing server gracefully')
    try {
      await app.close()
      app.log.info('Server closed cleanly')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Error during graceful shutdown')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

void main()

