// Server-only helpers. Never import this file from a client component:
// it reads the Supabase service-role key, which must stay on the server.
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { COOKIE_NAME, readSession } from './session';

export const PHOTO_BUCKET = process.env.PHOTO_BUCKET || 'nyl-photos';
export const TIME_ZONE = 'Asia/Kolkata';

// HEALER_USERS is a JSON list in the app settings, for example:
// [{"username":"nisar","name":"Nisar","password":"..."},{"username":"sahala","name":"Sahala","password":"..."}]
export function healerUsers() {
  try {
    const list = JSON.parse(process.env.HEALER_USERS || '[]');
    return Array.isArray(list) ? list.filter((u) => u && u.username && u.password) : [];
  } catch {
    return [];
  }
}

function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkLogin(username, password) {
  const u = healerUsers().find((h) => h.username.toLowerCase() === String(username || '').trim().toLowerCase());
  if (!u || !same(u.password, password || '')) return null;
  return { username: u.username, name: u.name || u.username };
}

export async function currentHealer() {
  return readSession(cookies().get(COOKIE_NAME)?.value, process.env.SESSION_SECRET);
}

let client;
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export function isDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
}
