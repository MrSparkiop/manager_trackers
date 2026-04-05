import { io, Socket } from 'socket.io-client'

let chatSocket: Socket | null = null

export const connectChatSocket = (): Socket => {
  if (chatSocket?.connected) return chatSocket

  const base = import.meta.env.VITE_SOCKET_URL || ''
  chatSocket = io(base ? `${base}/chat` : '/chat', {
    transports: ['websocket'],
    withCredentials: true,
  })

  if (import.meta.env.DEV) {
    chatSocket.on('connect', () => console.debug('Chat socket connected'))
    chatSocket.on('disconnect', () => console.debug('Chat socket disconnected'))
  }

  return chatSocket
}

export const disconnectChatSocket = () => {
  chatSocket?.disconnect()
  chatSocket = null
}

export const getChatSocket = (): Socket | null => chatSocket
