import { NextResponse } from 'next/server';
import { checkLogin } from '../../../lib/server';
import { COOKIE_NAME, SESSION_HOURS, createSession } from '../../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { /* empty body */ }

  const user = checkLogin(body.username, body.password);
  if (!user) {
    // Small delay slows down password guessing
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
  }
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'The app is not set up yet: SESSION_SECRET is missing.' }, { status: 500 });
  }

  const res = NextResponse.json({ name: user.name });
  res.cookies.set(COOKIE_NAME, await createSession(user, process.env.SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
