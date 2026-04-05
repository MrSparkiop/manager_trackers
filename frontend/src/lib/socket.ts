import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket

  // The HttpOnly access_token cookie is sent automatically via withCredentials.
  // Reading it via document.cookie is impossible (blocked by the browser by design).
  const base = import.meta.env.VITE_SOCKET_URL || ''
  socket = io(base ? `${base}/notifications` : '/notifications', {
    transports: ['websocket'],
    withCredentials: true,
  })

  if (import.meta.env.DEV) {
    socket.on('connect', () => console.debug('Socket connected'))
    socket.on('disconnect', () => console.debug('Socket disconnected'))
  }

  return socket
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}

export const getSocket = (): Socket | null => socket
