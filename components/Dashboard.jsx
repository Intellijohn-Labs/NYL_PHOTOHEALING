'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TZ = 'Asia/Kolkata';
const REFRESH_MS = 60 * 1000; // new bookings and fresh photo links every minute

function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function timeLabel(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .toUpperCase();
}

function dayLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

// Phone: 10 per page (2 x 5). Tablet/laptop: 20. Big screen or TV: 40. Matches the grid columns in globals.css.
function pageSizeFor(width) {
  if (width >= 1300) return 40;
  if (width >= 700) return 20;
  return 10;
}

// Default healing time: the one happening now or next; otherwise the last one of the day
function pickDefaultSlot(slots) {
  if (!slots.length) return null;
  const now = Date.now();
  const current = slots.find((s) => new Date(s.end || s.start).getTime() > now);
  return (current || slots[slots.length - 1]).id;
}

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Please log in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Reload the page.');
  return data;
}

function metaLine(p) {
  return [p.age != null && p.age !== '' ? p.age + ' yrs' : '', p.district].filter(Boolean).join(', ');
}

export default function Dashboard({ healerName }) {
  const [date, setDate] = useState(todayIST);
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState(null); // index into patients
  const touch = useRef(null);

  // Page size follows the screen width
  useEffect(() => {
    const update = () => setPerPage(pageSizeFor(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const loadSlots = useCallback(async (keepSelection) => {
    try {
      const data = await getJSON('/api/slots?date=' + date);
      const list = data.slots || [];
      setSlots(list);
      setSlotId((prev) => (keepSelection && list.some((s) => s.id === prev) ? prev : pickDefaultSlot(list)));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSlots(false);
    }
  }, [date]);

  const loadPatients = useCallback(async () => {
    if (!slotId) { setPatients([]); return; }
    try {
      const data = await getJSON('/api/patients?slot=' + slotId);
      setPatients(data.patients || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPatients(false);
    }
  }, [slotId]);

  // New date: load its healing times
  useEffect(() => {
    setLoadingSlots(true);
    setSlots([]);
    setSlotId(null);
    loadSlots(false);
  }, [date, loadSlots]);

  // New healing time: load its patients from page 1
  useEffect(() => {
    setPage(0);
    setViewer(null);
    setLoadingPatients(true);
    loadPatients();
  }, [slotId, loadPatients]);

  // Quietly refresh every minute so new bookings appear without reloading
  useEffect(() => {
    const t = setInterval(() => { loadSlots(true); loadPatients(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [loadSlots, loadPatients]);

  const pageCount = Math.max(1, Math.ceil(patients.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const shown = useMemo(
    () => patients.slice(safePage * perPage, safePage * perPage + perPage),
    [patients, safePage, perPage]
  );

  const goPage = useCallback((n) => setPage(Math.max(0, Math.min(pageCount - 1, n))), [pageCount]);

  // Keyboard: arrows move pages (or photos when one is open), Esc closes the photo
  useEffect(() => {
    function onKey(e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (viewer !== null) {
        if (e.key === 'Escape') setViewer(null);
        if (e.key === 'ArrowRight') setViewer((v) => Math.min(patients.length - 1, v + 1));
        if (e.key === 'ArrowLeft') setViewer((v) => Math.max(0, v - 1));
        return;
      }
      if (e.key === 'ArrowRight') goPage(safePage + 1);
      if (e.key === 'ArrowLeft') goPage(safePage - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, patients.length, safePage, goPage]);

  // Keep the page behind still while a photo is open
  useEffect(() => {
    document.body.style.overflow = viewer !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewer]);

  // Swipe left/right on a phone to change page
  function onTouchStart(e) { touch.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) < 50) return;
    goPage(safePage + (dx < 0 ? 1 : -1));
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }

  const current = slots.find((s) => s.id === slotId);
  const open = viewer !== null ? patients[viewer] : null;
  const first = patients.length ? safePage * perPage + 1 : 0;
  const last = Math.min(patients.length, (safePage + 1) * perPage);

  return (
    <>
      <header className="bar">
        <div className="brand">NYL Photo Healing</div>
        <div className="who">
          <span>Logged in as <strong>{healerName}</strong></span>
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="controls" aria-label="Choose the day and healing time">
        <input
          className="date"
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="Day"
        />
        {date !== todayIST() && (
          <button className="day-btn" onClick={() => setDate(todayIST())}>Today</button>
        )}
        <div className="slots" role="group" aria-label="Healing time">
          {slots.map((s) => (
            <button
              key={s.id}
              className="slot"
              aria-pressed={s.id === slotId}
              onClick={() => setSlotId(s.id)}
            >
              {timeLabel(s.start)}
              <small>{s.booked} {s.booked === 1 ? 'patient' : 'patients'}</small>
            </button>
          ))}
        </div>
      </section>

      {error && <p className="status error-text" role="alert">{error}</p>}

      {!error && loadingSlots && <p className="status">Loading {dayLabel(date)}…</p>}

      {!error && !loadingSlots && !slots.length && (
        <p className="status">No photo healing bookings on {dayLabel(date)}. Pick another day above.</p>
      )}

      {!error && current && loadingPatients && !patients.length && (
        <p className="status">Loading patients for {timeLabel(current.start)}…</p>
      )}

      {!error && current && !loadingPatients && !patients.length && (
        <p className="status">No patients booked for {timeLabel(current.start)} yet. New bookings appear here automatically.</p>
      )}

      {patients.length > 0 && (
        <>
          <ul className="grid" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {shown.map((p, i) => (
              <li key={p.id}>
                <button className="card" onClick={() => setViewer(safePage * perPage + i)} aria-label={'Open photo of ' + p.name}>
                  <div className="photo">
                    {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <div className="no-photo">No photo yet</div>}
                    <span className="num">{p.number}</span>
                  </div>
                  <div className="info">
                    <div className="name">{p.name}</div>
                    {metaLine(p) && <div className="meta">{metaLine(p)}</div>}
                    {p.illness && <div className="illness">{p.illness}</div>}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <nav className="pager" aria-label="Pages">
            <button onClick={() => goPage(safePage - 1)} disabled={safePage === 0}>Previous</button>
            <span>{first}–{last} of {patients.length}</span>
            <button onClick={() => goPage(safePage + 1)} disabled={safePage >= pageCount - 1}>Next</button>
          </nav>
        </>
      )}

      {open && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={'Photo of ' + open.name}>
          <button className="close" onClick={() => setViewer(null)}>Close</button>
          <div className="viewer-photo">
            {open.photo ? <img src={open.photo} alt={'Photo of ' + open.name} /> : <div className="no-photo">No photo yet</div>}
          </div>
          <div className="viewer-info">
            <span className="num">{open.number}</span>
            <div className="viewer-text">
              <div className="name">{open.name}</div>
              <div className="meta">{[metaLine(open), open.code].filter(Boolean).join(', ')}</div>
              {open.illness && <div className="illness">{open.illness}</div>}
            </div>
            <div className="viewer-nav">
              <button onClick={() => setViewer(viewer - 1)} disabled={viewer === 0}>Previous</button>
              <button onClick={() => setViewer(viewer + 1)} disabled={viewer >= patients.length - 1}>Next</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
