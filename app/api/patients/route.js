import { NextResponse } from 'next/server';
import { PHOTO_BUCKET, db } from '../../../lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LINK_SECONDS = 60 * 60; // photo links work for 1 hour, then the page fetches fresh ones

// GET /api/patients?slot=<distance_slots.id>  ->  confirmed bookings in booking-number order, each with its latest photo
export async function GET(req) {
  const slot = req.nextUrl.searchParams.get('slot');
  if (!slot || !/^[0-9a-f-]{36}$/i.test(slot)) {
    return NextResponse.json({ error: 'Choose a healing time.' }, { status: 400 });
  }

  try {
    const { data, error } = await db()
      .from('distance_bookings')
      .select('id, daily_index, status, patients(patient_code, full_name), photos(id, storage_path, status, checks, created_at)')
      .eq('slot_id', slot)
      .neq('status', 'cancelled')
      .order('daily_index', { ascending: true });
    if (error) throw error;

    const rows = (data || []).map((b) => {
      // The newest photo that was not replaced or rejected
      const photo = (b.photos || [])
        .filter((p) => p.status !== 'rejected')
        .sort((a, z) => String(z.created_at).localeCompare(String(a.created_at)))[0];
      const c = (photo && photo.checks) || {};
      return {
        id: b.id,
        number: b.daily_index,
        code: b.patients?.patient_code || '',
        name: c.name || b.patients?.full_name || '',
        age: c.age ?? null,
        illness: c.illness || '',
        district: c.district || '',
        path: photo?.storage_path || null,
      };
    });

    const paths = rows.map((r) => r.path).filter(Boolean);
    const links = {};
    if (paths.length) {
      const { data: signed, error: e2 } = await db().storage.from(PHOTO_BUCKET).createSignedUrls(paths, LINK_SECONDS);
      if (e2) throw e2;
      for (const s of signed || []) if (s.signedUrl) links[s.path] = s.signedUrl;
    }

    return NextResponse.json({
      patients: rows.map(({ path, ...r }) => ({ ...r, photo: path ? links[path] || null : null })),
    });
  } catch (err) {
    console.error('patients', err);
    return NextResponse.json({ error: 'Could not load the patients for this time. Check the database settings.' }, { status: 500 });
  }
}
