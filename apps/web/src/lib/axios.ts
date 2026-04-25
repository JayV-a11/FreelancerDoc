import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/lib/env'

/**
 * In-memory access token store.
 * The token is NEVER persisted to localStorage or cookies — it lives only
 * in this module's closure for the duration of the page session.
 * The refresh token is stored server-side in an httpOnly cookie.
 */
let accessToken: string | null = null

export function setAccessToken(token: string): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}

export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Axios instance pre-configured for the FreelanceDoc API.
 * - Injects Bearer token from in-memory store on every request
 * - On 401, attempts a silent token refresh using the httpOnly cookie
 * - On second 401, clears token and redirects to /login
 */
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Send httpOnly cookie (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — attach access token ──────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// ── Response interceptor — silent refresh on 401 ──────────────────────────
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else if (token) {
      promise.resolve(token)
    }
  })
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Never attempt a silent refresh when the failing request is itself an
    // auth endpoint — there is no session to refresh from yet (login) or the
    // refresh token is already invalid/expired (/auth/refresh).
    const requestUrl = originalRequest.url ?? ''
    if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue subsequent 401s while a refresh is in progress
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`)
            resolve(api(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // The refresh endpoint reads the httpOnly cookie automatically
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh')
      const newToken = data.accessToken
      setAccessToken(newToken)
      processQueue(null, newToken)
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAccessToken()
      // Redirect to login — works both in browser and SSR contexts
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
