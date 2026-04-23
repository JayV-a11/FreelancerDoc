import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/templates', '/documents', '/profile']
const AUTH_PREFIXES = ['/login', '/register']

// The cookie name matches what the Fastify API sets (env-aware)
const REFRESH_COOKIE =
  process.env['NODE_ENV'] === 'production' ? '__Secure-refresh_token' : 'refresh_token'

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const hasSession = !!request.cookies.get(REFRESH_COOKIE)?.value

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !hasSession) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/templates', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
