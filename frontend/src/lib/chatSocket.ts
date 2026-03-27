import { io, Socket } from 'socket.io-client'

let chatSocket: Socket | null = null

export const connectChatSocket = (): Socket => {
  if (chatSocket?.connected) return chatSocket

  chatSocket = io(`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/chat`, {
    transports: ['websocket'],
    withCredentials: true,
  })

  chatSocket.on('connect', () => console.log('Chat socket connected'))
  chatSocket.on('disconnect', () => console.log('Chat socket disconnected'))

  return chatSocket
}

export const disconnectChatSocket = () => {
  chatSocket?.disconnect()
  chatSocket = null
}

export const getChatSocket = (): Socket | null => chatSocket
