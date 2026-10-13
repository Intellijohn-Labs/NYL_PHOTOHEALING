import { NextResponse } from 'next/server';
import { COOKIE_NAME, readSession } from './lib/session';

// Every page and API needs a healer login, except the login page itself.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next();

  const session = await readSession(req.cookies.get(COOKIE_NAME)?.value, process.env.SESSION_SECRET);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
