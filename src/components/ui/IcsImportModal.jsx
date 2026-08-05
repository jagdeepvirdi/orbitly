import { useState, useRef } from 'react';
import { parseICS } from '../../utils/icsParser';

const CATS = [
  { key: 'work',      label: 'Work',      color: '#64748b' },
  { key: 'learning',  label: 'Learning',  color: '#6366f1' }, // eslint-disable-line no-restricted-syntax -- CAT.learning, not the brand accent
  { key: 'family',    label: 'Family',    color: '#f59e0b' },
  { key: 'health',    label: 'Health',    color: '#10b981' },
  { key: 'sports',    label: 'Sports',    color: '#ef4444' },
  { key: 'festival',  label: 'Festival',  color: '#d4af37' },
  { key: 'recurring', label: 'Recurring', color: '#a855f7' }, // eslint-disable-line no-restricted-syntax -- CAT.recurring, not the brand accent
  { key: 'hobby',     label: 'Hobby',     color: '#f97316' },
  { key: 'food',      label: 'Food',      color: '#84cc16' },
];

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[+m - 1]} ${y}`;
}

export default function IcsImportModal({ onClose, onImport }) {
  const [events,   setEvents]   = useState([]);
  const [filename, setFilename] = useState('');
  const [category, setCategory] = useState('recurring');
  const [error,    setError]    = useState('');
  const fileRef = useRef();

  function handleFile(file) {
    if (!file) return;
    setFilename(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseICS(e.target.result);
        if (!parsed.length) setError('No events found in this file.');
        else setEvents(parsed);
      } catch {
        setError('Could not parse this file. Make sure it is a valid .ics calendar file.');
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    if (events.length) onImport(events, category, filename);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--surface-solid)', borderRadius: 20,
          border: '1px solid var(--border-strong)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          padding: '28px 28px 24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Import Calendar</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
              Load a .ics file and assign a category
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, width: 34, height: 34, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border-strong)', borderRadius: 14,
            padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
            marginBottom: 20, transition: 'border-color .15s',
            background: 'var(--surface)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {filename || 'Drop .ics file here or click to browse'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            Google Calendar · Apple Calendar · Outlook
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Event preview */}
        {events.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              {events.length} event{events.length !== 1 ? 's' : ''} found
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.map(ev => (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 13px', borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                    {ev.location && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{ev.location}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <div>{fmtDate(ev.date)}</div>
                    {ev.time && <div style={{ color: 'var(--text-3)' }}>{ev.time}{ev.endTime ? `–${ev.endTime}` : ''}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category selector */}
        {events.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
              Category for all events
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 13px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: category === c.key ? `2px solid ${c.color}` : '2px solid var(--border)',
                    background: category === c.key ? c.color + '22' : 'var(--surface)',
                    color: category === c.key ? c.color : 'var(--text-2)',
                    transition: 'all .13s',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!events.length}
            style={{
              padding: '10px 24px', borderRadius: 12, border: 'none',
              background: events.length ? 'var(--accent)' : 'var(--surface)',
              color: events.length ? '#fff' : 'var(--text-3)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              cursor: events.length ? 'pointer' : 'not-allowed',
              boxShadow: events.length ? '0 4px 12px var(--glow)' : 'none',
            }}
          >
            Import {events.length > 0 ? `${events.length} Event${events.length !== 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
