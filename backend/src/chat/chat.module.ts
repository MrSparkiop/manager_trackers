import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
