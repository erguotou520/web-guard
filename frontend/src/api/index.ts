import { createFetchClient } from '@doremijs/o2t/client'
import type { OpenAPIs } from './schema'
import { useAuthStore } from '@/stores'

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setToken, logout } = useAuthStore.getState()

  if (!refreshToken) {
    logout()
    window.location.href = '/auth/login'
    return null
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!response.ok) {
      throw new Error('Refresh token failed')
    }

    const data = await response.json()
    setToken(data.access_token, data.refresh_token)
    return data.access_token
  } catch (error) {
    console.error('Token refresh failed:', error)
    logout()
    window.location.href = '/auth/login'
    return null
  }
}

export const client = createFetchClient<OpenAPIs>({
  // ... other options
  // requestInterceptor and responseInterceptor are optional
  requestInterceptor(request) {
    const token = useAuthStore.getState().token
    if (!request.url.startsWith('/api/auth') && token) {
      request.init.headers.Authorization = `Bearer ${token}`
    }
    return request
  },
  async responseInterceptor(request, response) {
    // Handle 401 Unauthorized by refreshing token
    if (response.status === 401 && !request.url.includes('/api/auth/login') && !request.url.includes('/api/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true
        const newToken = await refreshAccessToken()
        isRefreshing = false

        if (newToken) {
          onTokenRefreshed(newToken)
          // Retry the original request with new token
          const retryRequest = { ...request }
          retryRequest.init.headers.Authorization = `Bearer ${newToken}`
          return fetch(retryRequest.url, retryRequest.init)
        }
      } else {
        // Wait for token refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            const retryRequest = { ...request }
            retryRequest.init.headers.Authorization = `Bearer ${token}`
            resolve(fetch(retryRequest.url, retryRequest.init))
          })
        })
      }
    }

    return response
  },
  errorHandler(request, response, error) {
    console.error('API Error:', request.url, response?.status, error)
  }
})