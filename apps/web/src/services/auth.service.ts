import { api, setAccessToken, clearAccessToken } from '@/lib/axios'

type RegisterDto = {
  email: string
  name: string
  password: string
}

type LoginDto = {
  email: string
  password: string
}

type AuthResponse = {
  accessToken: string
  user: { id: string; email: string; name: string | null }
}

export async function register(data: RegisterDto): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data)
  setAccessToken(response.data.accessToken)
  return response.data
}

export async function login(data: LoginDto): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data)
  setAccessToken(response.data.accessToken)
  return response.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  clearAccessToken()
}
