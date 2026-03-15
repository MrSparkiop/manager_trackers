import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { ServerOptions } from 'socket.io'

/**
 * Custom Socket.io adapter that uses Redis pub/sub to broadcast events across
 * multiple backend instances. Falls back to the default in-memory adapter if
 * REDIS_URL is not set (useful for local dev without Docker).
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      console.warn('[RedisIoAdapter] REDIS_URL not set — using local in-memory adapter')
      return
    }

    try {
      const pubClient = new Redis(redisUrl)
      const subClient = pubClient.duplicate()

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.once('ready', resolve)
          pubClient.once('error', reject)
        }),
        new Promise<void>((resolve, reject) => {
          subClient.once('ready', resolve)
          subClient.once('error', reject)
        }),
      ])

      this.adapterConstructor = createAdapter(pubClient, subClient)
      console.log('[RedisIoAdapter] Connected to Redis at', redisUrl)
    } catch (err) {
      console.warn('[RedisIoAdapter] Failed to connect to Redis, falling back to in-memory:', err)
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options)
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor)
    }
    return server
  }
}
