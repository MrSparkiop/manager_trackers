import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`))
      }
    },
    credentials: true,
  },
  namespace: '/notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Token is sent as an HttpOnly cookie via withCredentials — read from cookie header
      const cookieHeader = client.handshake.headers?.cookie ?? ''
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
      const token = match?.[1]
      if (!token) { client.disconnect(); return }
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET })
      client.data.userId = payload.sub
      // Join a per-user room so sendNotification() works across multiple instances
      // via the Redis adapter — no local socket map needed.
      client.join(`user:${payload.sub}`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(_client: Socket) {
    // Room membership is managed by Socket.io; nothing to clean up locally.
  }

  sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification)
  }
}
