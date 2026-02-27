import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket

  // Get token from cookie
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('accessToken='))
    ?.split('=')[1]

  socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/notifications`, {
    auth: { token },
    transports: ['websocket'],
    withCredentials: true,
  })

  socket.on('connect', () => console.log('🔔 Socket connected'))
  socket.on('disconnect', () => console.log('🔔 Socket disconnected'))

  return socket
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}

export const getSocket = (): Socket | null => socket
