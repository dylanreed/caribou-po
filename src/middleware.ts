import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Basic Auth credentials - must be set via environment variables
const VALID_USERNAME = process.env.BASIC_AUTH_USER
const VALID_PASSWORD = process.env.BASIC_AUTH_PASSWORD

export function middleware(request: NextRequest) {
  // Require credentials to be configured
  if (!VALID_USERNAME || !VALID_PASSWORD) {
    console.error('BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be set in environment variables')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  const authHeader = request.headers.get('authorization')

  if (authHeader) {
    const authValue = authHeader.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    if (user === VALID_USERNAME && pwd === VALID_PASSWORD) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Caribou Lodge PO Manager"',
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
