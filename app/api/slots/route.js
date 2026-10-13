import { NextResponse } from 'next/server';
import { db, isDate } from '../../../lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/slots?date=YYYY-MM-DD  ->  the healing times on that day, with how many patients are booked
export async function GET(req) {
  const date = req.nextUrl.searchParams.get('date');
  if (!isDate(date)) return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 });

  try {
    const { data: slots, error } = await db()
      .from('distance_slots')
      .select('id, slot_no, healing_start, healing_end, status')
      .eq('slot_date', date)
      .order('healing_start', { ascending: true });
    if (error) throw error;

    const ids = (slots || []).map((s) => s.id);
    const counts = {};
    if (ids.length) {
      const { data: bookings, error: e2 } = await db()
        .from('distance_bookings')
        .select('slot_id')
        .in('slot_id', ids)
        .neq('status', 'cancelled');
      if (e2) throw e2;
      for (const b of bookings || []) counts[b.slot_id] = (counts[b.slot_id] || 0) + 1;
    }

    return NextResponse.json({
      slots: (slots || []).map((s) => ({
        id: s.id,
        no: s.slot_no,
        start: s.healing_start,
        end: s.healing_end,
        status: s.status,
        booked: counts[s.id] || 0,
      })),
    });
  } catch (err) {
    console.error('slots', err);
    return NextResponse.json({ error: 'Could not load the healing times. Check the database settings.' }, { status: 500 });
  }
}
