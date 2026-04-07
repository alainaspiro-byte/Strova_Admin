import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLE_COOKIE_NAME, SUPERADMIN_ROLE_ID_VALUE } from './lib/authConstants'

/** Rutas que sirven archivos desde `public/` (no pasan por el App Router). Sin esto, el middleware redirige a /login y el logo en /login no carga sin cookie. */
const PUBLIC_FILE_EXT = /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_FILE_EXT.test(pathname)) {
    return NextResponse.next()
  }

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return NextResponse.next()
  }

  const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value
  if (roleCookie === SUPERADMIN_ROLE_ID_VALUE) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  // Sin cookie = visita normal al login (no mostrar "sin permisos" antes de credenciales).
  // Cookie presente pero distinta de SuperAdmin = sesión no válida para este panel.
  if (roleCookie != null && roleCookie !== '') {
    loginUrl.searchParams.set('forbidden', '1')
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
