import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  namespace: '/notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1]
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
