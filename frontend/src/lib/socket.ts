import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket

  // The HttpOnly access_token cookie is sent automatically via withCredentials.
  // Reading it via document.cookie is impossible (blocked by the browser by design).
  socket = io(`${import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'}/notifications`, {
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
