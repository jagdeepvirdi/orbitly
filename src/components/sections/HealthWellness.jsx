import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { pdfFirstPageToJpeg } from '../../utils/pdfToImage';

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
  color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
};

const WHO_STYLE = {
  Jagdeep: { bg: 'rgba(99,102,241,0.18)',  color: '#a5b4fc' },
  Namtan:  { bg: 'rgba(244,63,94,0.18)',   color: '#fda4af' },
  Jasleen: { bg: 'rgba(245,158,11,0.18)',  color: '#fcd34d' },
};

const TR_CATS = {
  'Blood Test':  { bg: 'rgba(239,68,68,0.13)',   color: '#fca5a5',  stroke: '#fca5a5' },
  'Urine Test':  { bg: 'rgba(245,158,11,0.13)',  color: '#fcd34d',  stroke: '#fcd34d' },
  'X-Ray':       { bg: 'rgba(59,130,246,0.13)',  color: '#93c5fd',  stroke: '#93c5fd' },
  'MRI / CT':    { bg: 'rgba(168,85,247,0.13)',  color: '#d8b4fe',  stroke: '#d8b4fe' },
  'Ultrasound':  { bg: 'rgba(20,184,166,0.13)',  color: '#5eead4',  stroke: '#5eead4' },
  'ECG / EEG':   { bg: 'rgba(16,185,129,0.13)',  color: '#6ee7b7',  stroke: '#6ee7b7' },
  'Pathology':   { bg: 'rgba(244,63,94,0.10)',   color: '#fb7185',  stroke: '#fb7185' },
  'Other':       { bg: 'rgba(107,114,128,0.13)', color: '#d1d5db',  stroke: '#d1d5db' },
};

// ── file helpers ──────────────────────────────────────────────────────────────
function makeFileStore(key) {
  return {
    save(id, dataUrl) {
      try {
        const f = JSON.parse(localStorage.getItem(key) || '{}');
        f[id] = dataUrl;
        localStorage.setItem(key, JSON.stringify(f));
        return true;
      } catch { return false; }
    },
    get(id) {
      try { return JSON.parse(localStorage.getItem(key) || '{}')[id] || null; }
      catch { return null; }
    },
    del(id) {
      try {
        const f = JSON.parse(localStorage.getItem(key) || '{}');
        delete f[id];
        localStorage.setItem(key, JSON.stringify(f));
      } catch {}
    },
  };
}
const rxFiles  = makeFileStore('orbitly-rx-files');
const labFiles = makeFileStore('orbitly-lab-files');

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function openFile(dataUrl) {
  const w = window.open('', '_blank');
  if (w) w.document.write(`<html><body style="margin:0"><iframe src="${dataUrl}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
}

const EMPTY_MED = { name: '', dose: '', time: 'Morning', who: 'Jagdeep', doctor: '', startDate: '', notes: '', prescriptionId: '' };
const EMPTY_RX  = { name: '', doctor: '', date: '', who: 'Jagdeep' };
const EMPTY_TR  = { name: '', category: 'Blood Test', lab: '', date: '', who: 'Jagdeep', doctor: '', notes: '' };

// ── category icon SVGs ────────────────────────────────────────────────────────
function CatIcon({ category, stroke }) {
  switch (category) {
    case 'Blood Test': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <path d="M12 2L8 10c-1.5 3-1.5 7 0 9a4 4 0 008 0c1.5-2 1.5-6 0-9z"/>
      </svg>
    );
    case 'Urine Test': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <path d="M9 3h6l1 9H8L9 3z"/><rect x="7" y="12" width="10" height="9" rx="2"/>
      </svg>
    );
    case 'X-Ray': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <line x1="8" y1="7" x2="8" y2="17"/><line x1="16" y1="7" x2="16" y2="17"/>
        <path d="M8 12h8"/>
      </svg>
    );
    case 'MRI / CT': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <line x1="12" y1="2" x2="12" y2="6"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="6" y2="12"/>
        <line x1="18" y1="12" x2="22" y2="12"/>
      </svg>
    );
    case 'Ultrasound': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <path d="M2 12h4"/><path d="M18 12h4"/>
        <path d="M6 8c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        <path d="M6 16c0 3.3 2.7 6 6 6s6-2.7 6-6"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
    case 'ECG / EEG': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <polyline points="2 12 6 12 8 6 10 18 12 8 14 14 16 12 22 12"/>
      </svg>
    );
    case 'Pathology': return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    );
    default: return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    );
  }
}

// ── sub-components ────────────────────────────────────────────────────────────
function MedRow({ med, onToggle, onDelete, rx }) {
  const [hov, setHov] = useState(false);
  const ws = WHO_STYLE[med.who || 'Jagdeep'] || WHO_STYLE.Jagdeep;
  const timeBg    = med.time === 'Morning' ? 'rgba(245,158,11,0.16)' : med.time === 'Both' ? 'rgba(16,185,129,0.16)' : 'rgba(99,102,241,0.16)';
  const timeColor = med.time === 'Morning' ? '#fcd34d' : med.time === 'Both' ? '#6ee7b7' : '#a5b4fc';

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', margin: '0 -10px', borderRadius: 12, transition: 'background .13s', background: hov ? 'var(--surface-2)' : 'transparent' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <button onClick={onToggle} style={{ flex: '0 0 22px', width: 22, height: 22, borderRadius: 7, border: `2px solid ${med.done ? '#10b981' : 'var(--border-strong)'}`, background: med.done ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {med.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
      </button>
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(med.done ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}) }}>
          {med.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{med.dose}{med.doctor ? ` · ${med.doctor}` : ''}</div>
      </div>
      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700, background: ws.bg, color: ws.color, whiteSpace: 'nowrap' }}>
        {(med.who || 'Jagdeep').slice(0, 3).toUpperCase()}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: timeBg, color: timeColor, whiteSpace: 'nowrap' }}>
        {med.time}
      </span>
      {rx && (
        <span title={rx.name} style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </span>
      )}
      {hov && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}

function PrescriptionCard({ rx, linkedMeds, onView, onDelete }) {
  const isPDF = rx.fileType?.includes('pdf') || rx.fileName?.endsWith('.pdf');
  const ws = WHO_STYLE[rx.who] || WHO_STYLE.Jagdeep;
  const fmtDate = iso => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(d)} ${mons[parseInt(m) - 1]} ${y}`;
  };
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: isPDF ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isPDF ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.6">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.name}</div>
          {rx.doctor && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 1 }}>{rx.doctor}</div>}
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{fmtDate(rx.date)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 700, background: ws.bg, color: ws.color }}>{rx.who}</span>
        {linkedMeds.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{linkedMeds.length} med{linkedMeds.length > 1 ? 's' : ''} linked</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{rx.fileName}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <FileActionBtn onClick={onView}>View</FileActionBtn>
        <DeleteBtn onClick={onDelete}>Delete</DeleteBtn>
      </div>
    </div>
  );
}

function TestResultCard({ tr, onView, onDelete }) {
  const cat = TR_CATS[tr.category] || TR_CATS['Other'];
  const ws = WHO_STYLE[tr.who] || WHO_STYLE.Jagdeep;
  const fmtDate = iso => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(d)} ${mons[parseInt(m) - 1]} ${y}`;
  };
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CatIcon category={tr.category} stroke={cat.stroke} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 1 }}>{tr.lab}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{fmtDate(tr.date)}{tr.doctor ? ` · ${tr.doctor}` : ''}</div>
        </div>
      </div>
      {tr.notes && (
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {tr.notes}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: cat.bg, color: cat.color }}>{tr.category}</span>
        <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 700, background: ws.bg, color: ws.color }}>{tr.who}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{tr.fileName}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <FileActionBtn onClick={onView}>View</FileActionBtn>
        <DeleteBtn onClick={onDelete}>Delete</DeleteBtn>
      </div>
    </div>
  );
}

function TogglePills({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .13s', border: `1px solid ${value === opt ? '#10b981' : 'var(--border-strong)'}`, background: value === opt ? 'rgba(16,185,129,0.15)' : 'transparent', color: value === opt ? '#6ee7b7' : 'var(--text-3)' }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── AI extraction hook ────────────────────────────────────────────────────────
function useExtract() {
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null); // { source, model } | null
  const [extractError, setExtractError] = useState('');

  const extract = useCallback(async (file, extractType, onSuccess) => {
    if (!file) return;
    setExtracting(true);
    setExtractResult(null);
    setExtractError('');
    try {
      let dataUrl;
      let mimeType = file.type || 'image/jpeg';

      if (file.type === 'application/pdf') {
        // Render page 1 to JPEG — works with both Ollama and Gemini
        dataUrl  = await pdfFirstPageToJpeg(file);
        mimeType = 'image/jpeg';
      } else {
        dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }

      const resp = await fetch('http://localhost:3003/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: dataUrl, mimeType, extractType }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Extraction failed');

      setExtractResult({ source: json.source, model: json.model });
      onSuccess(json.data);
    } catch (e) {
      setExtractError(e.message || 'Extraction failed — fill fields manually.');
    }
    setExtracting(false);
  }, []);

  return { extract, extracting, extractResult, extractError, setExtractResult, setExtractError };
}

function UploadDropzone({ file, onPick, uploadError, fileRef, onExtract, extracting, extractResult, extractError }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>File *</div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => { onPick(e.target.files[0] || null); }} />

      {/* Drop zone */}
      <button type="button" onClick={() => fileRef.current?.click()}
        style={{ width: '100%', padding: '24px 0', borderRadius: 14, border: `2px dashed ${file ? 'rgba(16,185,129,0.5)' : 'var(--border-strong)'}`, background: file ? 'rgba(16,185,129,0.07)' : 'var(--surface-2)', color: file ? '#6ee7b7' : 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
        {file ? (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span style={{ fontWeight: 600 }}>{file.name}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(0)} KB · click to change</span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Click to choose file</span>
            <span style={{ fontSize: 11.5 }}>PDF, JPG, PNG, WEBP</span>
          </>
        )}
      </button>

      {/* Extract with AI button — shown once a file is picked */}
      {file && (
        <button type="button" onClick={onExtract} disabled={extracting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 11, border: '1px solid rgba(99,102,241,0.4)', background: extracting ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12)', color: '#a5b4fc', cursor: extracting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s', opacity: extracting ? 0.75 : 1 }}
          onMouseEnter={e => { if (!extracting) e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = extracting ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12)'; }}
        >
          {extracting ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'om-spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Analysing with AI…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              Extract with AI
            </>
          )}
        </button>
      )}

      {/* Success banner */}
      {extractResult && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12.5, color: '#6ee7b7' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Fields pre-filled via <strong>{extractResult.source === 'ollama' ? `Ollama · ${extractResult.model}` : 'Gemini Flash'}</strong> — review and save
        </div>
      )}

      {/* AI error */}
      {extractError && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12.5, color: '#fca5a5' }}>
          {extractError}
        </div>
      )}

      {/* File upload error */}
      {uploadError && <div style={{ marginTop: 6, fontSize: 12.5, color: '#fca5a5' }}>{uploadError}</div>}
    </div>
  );
}

// ── shared modal primitives ───────────────────────────────────────────────────
const MODAL_STYLE = {
  background: 'var(--surface-solid)', border: '1px solid var(--border-strong)',
  borderRadius: 22, padding: 28, width: '100%', maxWidth: 440,
  maxHeight: '90vh', overflowY: 'auto',
};
function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440 }}>{children}</div>
    </div>
  );
}
function ModalTitle({ children }) {
  return <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{children}</div>;
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      {children}
    </div>
  );
}
function ModalActions({ onCancel, submitLabel, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>Cancel</button>
      <button type="submit" disabled={disabled} style={{ flex: 2, padding: '11px 0', borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, opacity: disabled ? 0.7 : 1 }}>{submitLabel}</button>
    </div>
  );
}
function FileActionBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </button>
  );
}
function DeleteBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#fca5a5', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}>
      {children}
    </button>
  );
}
function SectionUploadBtn({ onClick, label }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 11, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.17)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      {label}
    </button>
  );
}
function EmptyFiles({ onAction, icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-3)' }}>
      <div style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4, width: 36, height: 36 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5 }}>{subtitle}</div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function HealthWellness() {
  const { state, dispatch } = useAppStore();

  const [apptModal, setApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({ type: '', who: 'Jagdeep', date: '' });

  const [medModal, setMedModal] = useState(false);
  const [medForm, setMedForm] = useState(EMPTY_MED);

  const [rxModal, setRxModal] = useState(false);
  const [rxForm, setRxForm] = useState(EMPTY_RX);
  const [rxFile, setRxFile] = useState(null);
  const [rxUploading, setRxUploading] = useState(false);
  const [rxError, setRxError] = useState('');
  const rxFileRef = useRef(null);
  const rxExtract = useExtract();

  const [trModal, setTrModal] = useState(false);
  const [trForm, setTrForm] = useState(EMPTY_TR);
  const [trFile, setTrFile] = useState(null);
  const [trUploading, setTrUploading] = useState(false);
  const [trError, setTrError] = useState('');
  const trFileRef = useRef(null);
  const trExtract = useExtract();

  function handleApptSubmit(e) {
    e.preventDefault();
    if (!apptForm.type.trim() || !apptForm.date) return;
    const [y, m, d] = apptForm.date.split('-').map(Number);
    const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    dispatch({ type: 'ADD_APPT', who: apptForm.who, type: apptForm.type.trim(), date: `${d} ${mons[m-1]} ${y}` });
    setApptModal(false);
    setApptForm({ type: '', who: 'Jagdeep', date: '' });
  }

  function handleMedSubmit(e) {
    e.preventDefault();
    if (!medForm.name.trim()) return;
    dispatch({ type: 'ADD_MED', ...medForm });
    setMedModal(false);
    setMedForm(EMPTY_MED);
  }

  async function handleRxSubmit(e) {
    e.preventDefault();
    if (!rxForm.name.trim() || !rxFile) return;
    setRxUploading(true); setRxError('');
    try {
      const dataUrl = await readFileAsDataUrl(rxFile);
      const id = 'rx' + Date.now();
      if (!rxFiles.save(id, dataUrl)) { setRxError('File too large for local storage. Try a smaller or compressed file.'); setRxUploading(false); return; }
      dispatch({ type: 'ADD_PRESCRIPTION', id, name: rxForm.name.trim(), doctor: rxForm.doctor.trim(), date: rxForm.date, who: rxForm.who, fileName: rxFile.name, fileType: rxFile.type });
      setRxModal(false); setRxForm(EMPTY_RX); setRxFile(null);
    } catch { setRxError('Failed to read file. Please try again.'); }
    setRxUploading(false);
  }

  async function handleTrSubmit(e) {
    e.preventDefault();
    if (!trForm.name.trim() || !trForm.lab.trim() || !trFile) return;
    setTrUploading(true); setTrError('');
    try {
      const dataUrl = await readFileAsDataUrl(trFile);
      const id = 'tr' + Date.now();
      if (!labFiles.save(id, dataUrl)) { setTrError('File too large for local storage. Try a smaller or compressed file.'); setTrUploading(false); return; }
      dispatch({ type: 'ADD_TEST_RESULT', id, name: trForm.name.trim(), category: trForm.category, lab: trForm.lab.trim(), date: trForm.date, who: trForm.who, doctor: trForm.doctor.trim(), notes: trForm.notes.trim(), fileName: trFile.name, fileType: trFile.type });
      setTrModal(false); setTrForm(EMPTY_TR); setTrFile(null);
    } catch { setTrError('Failed to read file. Please try again.'); }
    setTrUploading(false);
  }

  function handleDeleteRx(id) {
    if (!confirm('Delete this prescription? This cannot be undone.')) return;
    rxFiles.del(id);
    dispatch({ type: 'DELETE_PRESCRIPTION', id });
  }

  function handleDeleteTr(id) {
    if (!confirm('Delete this test result? This cannot be undone.')) return;
    labFiles.del(id);
    dispatch({ type: 'DELETE_TEST_RESULT', id });
  }

  const mob = state.isMobile;
  const medsDone = state.meds.filter(m => m.done).length;
  const prescriptions = state.prescriptions || [];
  const testResults   = state.testResults   || [];

  const cycleLen = 28;
  const fertile = [12, 13, 14, 15, 16];
  const cycleCells = Array.from({ length: cycleLen }, (_, i) => {
    const d = i + 1;
    const isPeak = d === 14, isFertile = fertile.includes(d) && !isPeak, isPeriod = d <= 5, isCurrent = d === state.cycleDay;
    let bg = 'transparent', color = 'var(--text-2)';
    if (isPeak)   { bg = 'rgba(244,63,94,0.7)';  color = '#fff'; }
    else if (isFertile) { bg = 'rgba(244,63,94,0.25)'; color = '#fda4af'; }
    else if (isPeriod)  { bg = 'rgba(99,102,241,0.22)'; color = '#a5b4fc'; }
    return { d, bg, color, isCurrent };
  });
  const nextPeriod = cycleLen - state.cycleDay + 1;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: mob ? '16px 16px 60px' : '26px 34px 60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(12,1fr)', gap: mob ? 14 : 18, alignItems: 'start' }}>

        {/* ── MEDICATIONS ── */}
        <section style={{ gridColumn: 'span 5', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6ee7b7' }}>Medications</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{medsDone}/{state.meds.length} today</span>
          </div>
          {state.meds.map(m => (
            <MedRow key={m.id} med={m}
              onToggle={() => dispatch({ type: 'TOGGLE_MED', id: m.id })}
              onDelete={() => dispatch({ type: 'DELETE_MED', id: m.id })}
              rx={m.prescriptionId ? prescriptions.find(r => r.id === m.prescriptionId) : null}
            />
          ))}
          <button onClick={() => setMedModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', marginTop: 14, padding: '11px 14px', borderRadius: 13, border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add medication
          </button>
        </section>

        {/* ── DAILY HABITS ── */}
        <section style={{ gridColumn: 'span 7', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1' }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc' }}>Daily Habits</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.habits.map(h => (
              <button key={h.id} onClick={() => dispatch({ type: 'TOGGLE_HABIT', id: h.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '13px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${h.done ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`, background: h.done ? 'rgba(16,185,129,0.1)' : 'var(--surface)', transition: 'all .15s' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>{h.icon}</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 14.5, fontWeight: 600 }}>{h.label}</span>
                <span style={{ flex: '0 0 22px', width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${h.done ? '#10b981' : 'var(--border-strong)'}`, background: h.done ? '#10b981' : 'transparent' }}>
                  {h.done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── CYCLE TRACKER ── */}
        <section style={{ gridColumn: 'span 7', borderRadius: 22, padding: 24, background: 'linear-gradient(120deg,rgba(244,63,94,0.12),rgba(168,85,247,0.07))', border: '1px solid rgba(244,63,94,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fda4af' }}>Namtan · Cycle Tracker</span>
              <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 99, background: 'rgba(244,63,94,0.18)', color: '#fb7185', fontWeight: 700 }}>🔒 Private</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Day {state.cycleDay} of 28</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
            Next period in <strong>{nextPeriod} days</strong> · Fertile window: <strong>Day 12–16</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
            {cycleCells.map(cell => (
              <div key={cell.d} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: cell.isCurrent ? 800 : 600, background: cell.bg, color: cell.color, border: cell.isCurrent ? '2px solid #f43f5e' : '2px solid transparent' }}>
                {cell.d}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[{ color:'rgba(99,102,241,0.6)',label:'Period'},{ color:'rgba(244,63,94,0.4)',label:'Fertile'},{ color:'rgba(244,63,94,0.8)',label:'Peak / Ovulation'},{ color:'transparent',label:'Today',border:'2px solid #f43f5e'}].map((l,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',gap:7,fontSize:12,color:'var(--text-3)' }}>
                <span style={{ width:10,height:10,borderRadius:'50%',background:l.color,border:l.border }} />{l.label}
              </div>
            ))}
          </div>
        </section>

        {/* ── APPOINTMENTS ── */}
        <section style={{ gridColumn: 'span 5', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6ee7b7' }}>Appointments & Health</span>
          </div>
          {state.appointments.map(a => (
            <button key={a.id} onClick={() => dispatch({ type: 'TOGGLE_APPT', id: a.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 10px', margin: '0 -10px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ flex:'0 0 22px',width:22,height:22,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${a.done?'#10b981':'var(--border-strong)'}`,background:a.done?'#10b981':'transparent' }}>
                {a.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
              </span>
              <span style={{ flex:1,textAlign:'left' }}>
                <span style={{ display:'block',fontSize:14,fontWeight:600,...(a.done?{textDecoration:'line-through',color:'var(--text-3)'}:{}) }}>{a.type}</span>
                <span style={{ display:'block',fontSize:11.5,color:'var(--text-3)' }}>{a.who} · {a.date}</span>
              </span>
            </button>
          ))}
          <button onClick={() => setApptModal(true)}
            style={{ display:'flex',alignItems:'center',gap:9,width:'100%',marginTop:14,padding:'11px 14px',borderRadius:13,border:'1px dashed var(--border-strong)',background:'transparent',color:'var(--text-3)',cursor:'pointer',fontFamily:'inherit',fontSize:13.5 }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add appointment
          </button>
        </section>

        {/* ── PRESCRIPTIONS ── */}
        <section style={{ gridColumn: '1 / -1', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6ee7b7' }}>Prescriptions</span>
              {prescriptions.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 9px', borderRadius: 99 }}>{prescriptions.length} stored</span>}
            </div>
            <SectionUploadBtn onClick={() => setRxModal(true)} label="Upload prescription" />
          </div>
          {prescriptions.length === 0 ? (
            <EmptyFiles
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:'100%',height:'100%'}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>}
              title="No prescriptions stored yet"
              subtitle="Upload a PDF or image to keep your prescriptions safe and accessible."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {prescriptions.map(rx => (
                <PrescriptionCard key={rx.id} rx={rx}
                  linkedMeds={state.meds.filter(m => m.prescriptionId === rx.id)}
                  onView={() => { const d = rxFiles.get(rx.id); if (d) openFile(d); else alert('File not found.'); }}
                  onDelete={() => handleDeleteRx(rx.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── TEST RESULTS ── */}
        <section style={{ gridColumn: '1 / -1', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1' }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc' }}>Test Results</span>
              {testResults.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 9px', borderRadius: 99 }}>{testResults.length} stored</span>}
            </div>
            <SectionUploadBtn onClick={() => setTrModal(true)} label="Upload test result" />
          </div>
          {testResults.length === 0 ? (
            <EmptyFiles
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:'100%',height:'100%'}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              title="No test results stored yet"
              subtitle="Upload blood reports, X-rays, MRIs and other lab results to keep them in one place."
            />
          ) : (
            <>
              {/* category filter pills */}
              <TrFilterRow testResults={testResults} />
            </>
          )}
        </section>

      </div>

      {/* ════════ ADD APPOINTMENT MODAL ════════ */}
      {apptModal && (
        <Overlay onClose={() => setApptModal(false)}>
          <form onSubmit={handleApptSubmit} style={MODAL_STYLE}>
            <ModalTitle>Add Appointment</ModalTitle>
            <Field label="Appointment *"><input autoFocus style={INP} placeholder="e.g. Dental checkup, Eye test…" value={apptForm.type} onChange={e => setApptForm(f=>({...f,type:e.target.value}))} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <Field label="For"><select style={{...INP,appearance:'none'}} value={apptForm.who} onChange={e=>setApptForm(f=>({...f,who:e.target.value}))}>{['Jagdeep','Namtan','Jasleen'].map(w=><option key={w}>{w}</option>)}</select></Field>
              <Field label="Date *"><input type="date" style={INP} value={apptForm.date} onChange={e=>setApptForm(f=>({...f,date:e.target.value}))} /></Field>
            </div>
            <ModalActions onCancel={() => setApptModal(false)} submitLabel="Save appointment" />
          </form>
        </Overlay>
      )}

      {/* ════════ ADD MEDICATION MODAL ════════ */}
      {medModal && (
        <Overlay onClose={() => setMedModal(false)}>
          <form onSubmit={handleMedSubmit} style={MODAL_STYLE}>
            <ModalTitle>Add Medication</ModalTitle>
            <Field label="Medication name *"><input autoFocus style={INP} placeholder="e.g. Vitamin D3, Metformin…" value={medForm.name} onChange={e=>setMedForm(f=>({...f,name:e.target.value}))} /></Field>
            <Field label="Dose / Strength"><input style={INP} placeholder="e.g. 500mg, 1 tablet · 2000 IU" value={medForm.dose} onChange={e=>setMedForm(f=>({...f,dose:e.target.value}))} /></Field>
            <Field label="Time"><TogglePills options={['Morning','Evening','Both']} value={medForm.time} onChange={v=>setMedForm(f=>({...f,time:v}))} /></Field>
            <Field label="For"><TogglePills options={['Jagdeep','Namtan','Jasleen']} value={medForm.who} onChange={v=>setMedForm(f=>({...f,who:v}))} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Prescribing doctor"><input style={INP} placeholder="Dr. name" value={medForm.doctor} onChange={e=>setMedForm(f=>({...f,doctor:e.target.value}))} /></Field>
              <Field label="Start date"><input type="date" style={INP} value={medForm.startDate} onChange={e=>setMedForm(f=>({...f,startDate:e.target.value}))} /></Field>
            </div>
            <Field label="Notes"><textarea style={{...INP,resize:'vertical',minHeight:60}} placeholder="e.g. Take with food, avoid alcohol…" value={medForm.notes} onChange={e=>setMedForm(f=>({...f,notes:e.target.value}))} /></Field>
            {prescriptions.length > 0 && (
              <Field label="Link to prescription (optional)">
                <select style={{...INP,appearance:'none'}} value={medForm.prescriptionId} onChange={e=>setMedForm(f=>({...f,prescriptionId:e.target.value}))}>
                  <option value="">— none —</option>
                  {prescriptions.map(r=><option key={r.id} value={r.id}>{r.name} ({r.who})</option>)}
                </select>
              </Field>
            )}
            <ModalActions onCancel={() => setMedModal(false)} submitLabel="Save medication" />
          </form>
        </Overlay>
      )}

      {/* ════════ UPLOAD PRESCRIPTION MODAL ════════ */}
      {rxModal && (
        <Overlay onClose={() => { setRxModal(false); setRxFile(null); setRxError(''); rxExtract.setExtractResult(null); rxExtract.setExtractError(''); }}>
          <form onSubmit={handleRxSubmit} style={MODAL_STYLE}>
            <ModalTitle>Upload Prescription</ModalTitle>
            <Field label="Label / name *"><input autoFocus style={INP} placeholder="e.g. Metformin — Dr. Sharma, Jun 2026" value={rxForm.name} onChange={e=>setRxForm(f=>({...f,name:e.target.value}))} /></Field>
            <Field label="Doctor"><input style={INP} placeholder="Prescribing doctor's name" value={rxForm.doctor} onChange={e=>setRxForm(f=>({...f,doctor:e.target.value}))} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Prescription date"><input type="date" style={INP} value={rxForm.date} onChange={e=>setRxForm(f=>({...f,date:e.target.value}))} /></Field>
              <Field label="For"><select style={{...INP,appearance:'none'}} value={rxForm.who} onChange={e=>setRxForm(f=>({...f,who:e.target.value}))}>{['Jagdeep','Namtan','Jasleen'].map(w=><option key={w}>{w}</option>)}</select></Field>
            </div>
            <UploadDropzone
              file={rxFile}
              onPick={f => { setRxFile(f); setRxError(''); rxExtract.setExtractResult(null); rxExtract.setExtractError(''); }}
              uploadError={rxError}
              fileRef={rxFileRef}
              extracting={rxExtract.extracting}
              extractResult={rxExtract.extractResult}
              extractError={rxExtract.extractError}
              onExtract={() => rxExtract.extract(rxFile, 'prescription', d => {
                setRxForm(f => ({
                  ...f,
                  name:   d.label  || f.name,
                  doctor: d.doctor || f.doctor,
                  date:   d.date   || f.date,
                }));
              })}
            />
            <ModalActions onCancel={() => { setRxModal(false); setRxFile(null); setRxError(''); rxExtract.setExtractResult(null); }} submitLabel={rxUploading ? 'Saving…' : 'Save prescription'} disabled={rxUploading} />
          </form>
        </Overlay>
      )}

      {/* ════════ UPLOAD TEST RESULT MODAL ════════ */}
      {trModal && (
        <Overlay onClose={() => { setTrModal(false); setTrFile(null); setTrError(''); trExtract.setExtractResult(null); trExtract.setExtractError(''); }}>
          <form onSubmit={handleTrSubmit} style={MODAL_STYLE}>
            <ModalTitle>Upload Test Result</ModalTitle>
            <Field label="Test name *"><input autoFocus style={INP} placeholder="e.g. CBC Blood Panel, HbA1c, Chest X-Ray…" value={trForm.name} onChange={e=>setTrForm(f=>({...f,name:e.target.value}))} /></Field>
            <Field label="Category">
              <select style={{...INP,appearance:'none'}} value={trForm.category} onChange={e=>setTrForm(f=>({...f,category:e.target.value}))}>
                {Object.keys(TR_CATS).map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Lab / Hospital *"><input style={INP} placeholder="e.g. Apollo, Bumrungrad…" value={trForm.lab} onChange={e=>setTrForm(f=>({...f,lab:e.target.value}))} /></Field>
              <Field label="Test date"><input type="date" style={INP} value={trForm.date} onChange={e=>setTrForm(f=>({...f,date:e.target.value}))} /></Field>
            </div>
            <Field label="For"><TogglePills options={['Jagdeep','Namtan','Jasleen']} value={trForm.who} onChange={v=>setTrForm(f=>({...f,who:v}))} /></Field>
            <Field label="Ordering doctor"><input style={INP} placeholder="Dr. name (optional)" value={trForm.doctor} onChange={e=>setTrForm(f=>({...f,doctor:e.target.value}))} /></Field>
            <Field label="Key findings / notes">
              <textarea style={{...INP,resize:'vertical',minHeight:70}} placeholder="e.g. HbA1c 6.8% — slightly elevated. All others within range." value={trForm.notes} onChange={e=>setTrForm(f=>({...f,notes:e.target.value}))} />
            </Field>
            <UploadDropzone
              file={trFile}
              onPick={f => { setTrFile(f); setTrError(''); trExtract.setExtractResult(null); trExtract.setExtractError(''); }}
              uploadError={trError}
              fileRef={trFileRef}
              extracting={trExtract.extracting}
              extractResult={trExtract.extractResult}
              extractError={trExtract.extractError}
              onExtract={() => trExtract.extract(trFile, 'test-result', d => {
                setTrForm(f => ({
                  ...f,
                  name:     d.name     || f.name,
                  category: d.category || f.category,
                  lab:      d.lab      || f.lab,
                  date:     d.date     || f.date,
                  doctor:   d.doctor   || f.doctor,
                  notes:    d.notes    || f.notes,
                }));
              })}
            />
            <ModalActions onCancel={() => { setTrModal(false); setTrFile(null); setTrError(''); trExtract.setExtractResult(null); }} submitLabel={trUploading ? 'Saving…' : 'Save test result'} disabled={trUploading} />
          </form>
        </Overlay>
      )}
    </div>
  );
}

// ── test results grid with category filter ────────────────────────────────────
function TrFilterRow({ testResults }) {
  const [activeCat, setActiveCat] = useState('All');
  const { dispatch } = useAppStore();

  const cats = ['All', ...Object.keys(TR_CATS).filter(c => testResults.some(t => t.category === c))];
  const filtered = activeCat === 'All' ? testResults : testResults.filter(t => t.category === activeCat);

  function handleView(id) {
    const d = labFiles.get(id);
    if (d) openFile(d); else alert('File not found in local storage.');
  }
  function handleDelete(id) {
    if (!confirm('Delete this test result? This cannot be undone.')) return;
    labFiles.del(id);
    dispatch({ type: 'DELETE_TEST_RESULT', id });
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
        {cats.map(c => {
          const cat = TR_CATS[c];
          const active = activeCat === c;
          return (
            <button key={c} onClick={() => setActiveCat(c)}
              style={{ padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .13s', border: `1px solid ${active ? (cat?.color || '#a5b4fc') : 'var(--border)'}`, background: active ? (cat?.bg || 'rgba(99,102,241,0.15)') : 'transparent', color: active ? (cat?.color || '#a5b4fc') : 'var(--text-3)' }}>
              {c}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {filtered.map(tr => (
          <TestResultCard key={tr.id} tr={tr}
            onView={() => handleView(tr.id)}
            onDelete={() => handleDelete(tr.id)}
          />
        ))}
      </div>
    </>
  );
}
