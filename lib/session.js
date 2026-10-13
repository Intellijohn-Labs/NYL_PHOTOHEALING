// Signed login cookie. Uses Web Crypto so it works both in middleware (edge) and in API routes.
export const COOKIE_NAME = 'nyl_healer';
export const SESSION_HOURS = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64u(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64u(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSession(user, secret) {
  const payload = { u: user.username, n: user.name, exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600 };
  const body = toB64u(enc.encode(JSON.stringify(payload)));
  const sig = toB64u(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return body + '.' + sig;
}

export async function readSession(token, secret) {
  if (!token || !secret) return null;
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(dec.decode(fromB64u(body)));
    if (!p.exp || p.exp < Date.now() / 1000) return null;
    return { username: p.u, name: p.n };
  } catch {
    return null;
  }
}
