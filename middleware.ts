import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLE_COOKIE_NAME, SUPERADMIN_ROLE_ID_VALUE } from './lib/authConstants'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return NextResponse.next()
  }

  const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value
  if (roleCookie !== SUPERADMIN_ROLE_ID_VALUE) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('forbidden', '1')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
