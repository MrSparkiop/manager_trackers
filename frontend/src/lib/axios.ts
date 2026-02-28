import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // send cookies automatically
})

// Track if we're already refreshing to prevent multiple refresh calls
let isRefreshing = false
let failedQueue: { resolve: (value: any) => void; reject: (reason?: any) => void }[] = []

const processQueue = (error: any) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(null)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only try refresh on 401, and not on auth endpoints themselves
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => api(originalRequest))
        .catch(err => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Attempt token refresh
      await api.post('/auth/refresh')

      // Refresh succeeded — process queued requests
      processQueue(null)

      // Retry the original request
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh failed — log out user
      processQueue(refreshError)
      
      // Dynamically import store to avoid circular dependency
      // Call the robust logout function we updated in the store
      const { useAuthStore } = await import('../store/authStore')
      await useAuthStore.getState().logout()
      
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api