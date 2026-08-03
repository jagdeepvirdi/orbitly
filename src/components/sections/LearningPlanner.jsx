import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { PHASE_NAMES, EXAM_DATE, EST_COMPLETION_DATE } from '../../data/certPlan';
import { fireConfetti } from '../../hooks/useConfetti';
import { fmtShortDate, addWorkdayToISO, todayISO } from '../../utils/dateUtils';
import { api } from '../../api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function rowToLocal(row) {
  return {
    id:      row.id,
    name:    row.name,
    phase:   row.phase,
    total:   row.total,
    done:    row.done,
    next:    row.next,
    nextISO: row.next_iso,
    url:     row.url || '',
    planId:  row.plan_id ?? 1,
  };
}

async function patchCourse(id, fields) {
  try {
    await api.updateCourse(id, fields);
  } catch { /* offline */ }
}

function courseStatus(c) {
  if (c.done >= c.total) return { label: 'Completed', color: '#34d399', pillBg: 'rgba(16,185,129,0.16)', bar: '#10b981' };
  if (c.done > 0)        return { label: 'In progress', color: '#a5b4fc', pillBg: 'rgba(99,102,241,0.16)', bar: '#6366f1' };
  return { label: 'Upcoming', color: 'var(--text-3)', pillBg: 'var(--surface-2)', bar: 'var(--border-strong)' };
}

const TYPE_META = {
  certification: { label: 'Certification',  bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc' },
  course:        { label: 'Online Course',   bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  'self-study':  { label: 'Self-Study',      bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d' },
  reading:       { label: 'Reading List',    bg: 'rgba(236,72,153,0.15)',  color: '#f9a8d4' },
  other:         { label: 'Other',           bg: 'rgba(148,163,184,0.12)', color: '#cbd5e1' },
};

const BOOK_STATUS = {
  'to-read':  { label: 'To Read',  bg: 'rgba(148,163,184,0.18)', color: '#cbd5e1' },
  'reading':  { label: 'Reading',  bg: 'rgba(99,102,241,0.18)',  color: '#a5b4fc' },
  'finished': { label: 'Finished', bg: 'rgba(16,185,129,0.18)',  color: '#34d399' },
};

const PLAN_COLORS = ['#6366f1','#a855f7','#ec4899','#ef4444','#f59e0b','#10b981','#06b6d4','#3b82f6'];
const PLAN_ICONS  = ['📚','🎓','🤖','💡','⚡','🔬','🛠️','🧠','🌐','🚀','📊','✍️','📖','🏆','🎯','🌱'];

const EVENT_TYPES = {
  webinar:    { label: 'Webinar',    emoji: '🎥', color: '#6366f1', bg: 'rgba(99,102,241,0.15)'   },
  meeting:    { label: 'Meeting',    emoji: '💬', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)'   },
  workshop:   { label: 'Workshop',   emoji: '🔧', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'   },
  conference: { label: 'Conference', emoji: '📢', color: '#a855f7', bg: 'rgba(168,85,247,0.15)'   },
  seminar:    { label: 'Seminar',    emoji: '🎙️',color: '#10b981', bg: 'rgba(16,185,129,0.15)'   },
  training:   { label: 'Training',   emoji: '🏫', color: '#ef4444', bg: 'rgba(239,68,68,0.15)'    },
  course:     { label: 'Course',     emoji: '🎓', color: '#d4af37', bg: 'rgba(212,175,55,0.15)'   },
  other:      { label: 'Other',      emoji: '📌', color: '#64748b', bg: 'rgba(100,116,139,0.15)'  },
};

function phaseLabel(planId, phaseIdx) {
  if (planId === 1 && PHASE_NAMES[phaseIdx]) return PHASE_NAMES[phaseIdx];
  return `Phase ${phaseIdx + 1}`;
}

// todayISO helper imported from dateUtils

// ── Mini progress ring ────────────────────────────────────────────────────────

function MiniRing({ pct, color, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
    </svg>
  );
}

// ── Modal primitives ─────────────────────────────────────────────────────────

function ModalBase({ onClose, children, width = 520 }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface-solid)', border: '1px solid var(--border-strong)',
        borderRadius: 24, padding: '28px 30px', width: '100%', maxWidth: width,
        animation: 'om-fade-up .22s ease', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

function Field({ label, children, half }) {
  return (
    <div style={{ marginBottom: 16, ...(half ? { flex: '1 1 45%', minWidth: 160 } : {}) }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
    </div>
  );
}

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: 10, boxSizing: 'border-box',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  fontFamily: 'inherit', fontSize: 13.5, color: 'var(--text)', outline: 'none',
};

// ── Plan Form Modal (create + edit) ──────────────────────────────────────────

function PlanFormModal({ plan = null, onClose, onSave }) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    title:         plan?.title           || '',
    type:          plan?.type            || 'certification',
    icon:          plan?.icon            || '📚',
    color:         plan?.color           || '#6366f1',
    startDate:     plan?.start_date      || '',
    examDate:      plan?.exam_date       || '',
    estCompletion: plan?.est_completion  || '',
    completedDate: plan?.completed_date  || '',
    description:   plan?.description    || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        title:          form.title.trim(),
        description:    form.description.trim() || null,
        type:           form.type,
        color:          form.color,
        icon:           form.icon,
        start_date:     form.startDate     || null,
        exam_date:      form.examDate      || null,
        est_completion: form.estCompletion || null,
        completed_date: form.completedDate || null,
      };
      const result = isEdit
        ? await api.updatePlan(plan.id, body)
        : await api.createPlan(body);
      onSave(result);
    } catch { setSaving(false); }
  }

  const accentColor = form.color;

  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={isEdit ? 'Edit Learning Plan' : 'Create New Learning Plan'} onClose={onClose} />

      <Field label="Plan Name *">
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. AWS Solutions Architect Certification" style={inp} autoFocus />
      </Field>

      <Field label="Type">
        <select value={form.type} onChange={e => set('type', e.target.value)}
          style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
          <option value="certification">Certification</option>
          <option value="course">Online Course</option>
          <option value="self-study">Self-Study</option>
          <option value="reading">Reading List</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <Field label="Icon">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLAN_ICONS.map(em => (
            <button key={em} onClick={() => set('icon', em)} style={{
              width: 36, height: 36, borderRadius: 9,
              border: `1px solid ${form.icon === em ? accentColor : 'var(--border)'}`,
              background: form.icon === em ? `${accentColor}22` : 'var(--surface-2)',
              cursor: 'pointer', fontSize: 17,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color .15s, background .15s',
            }}>{em}</button>
          ))}
        </div>
      </Field>

      <Field label="Accent Color">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {PLAN_COLORS.map(c => (
            <button key={c} onClick={() => set('color', c)} style={{
              width: 30, height: 30, borderRadius: '50%', background: c,
              border: 'none', cursor: 'pointer', flexShrink: 0,
              outline: form.color === c ? `3px solid ${c}` : 'none',
              outlineOffset: 2,
              boxShadow: form.color === c ? `0 0 0 2px var(--surface-solid)` : 'none',
              transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform .15s',
            }} />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            title="Custom color"
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--surface-2)' }} />
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Start Date (optional)" half>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
            style={inp} />
        </Field>
        <Field label="Est. Completion (optional)" half>
          <input type="date" value={form.estCompletion} onChange={e => set('estCompletion', e.target.value)}
            style={inp} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Exam / Target Date (optional)" half>
          <input type="date" value={form.examDate} onChange={e => set('examDate', e.target.value)}
            style={inp} />
        </Field>
        <Field label="Completed Date (optional)" half>
          <input type="date" value={form.completedDate} onChange={e => set('completedDate', e.target.value)}
            style={inp} />
        </Field>
      </div>

      <Field label="Description (optional)">
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="What this plan covers…" rows={2}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
      </Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        }}>Cancel</button>
        <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{
          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
          background: `linear-gradient(120deg, ${accentColor}, ${accentColor}cc)`,
          opacity: form.title.trim() && !saving ? 1 : 0.5,
        }}>{saving ? 'Saving…' : isEdit ? `Save Changes` : `Create Plan ${form.icon}`}</button>
      </div>
    </ModalBase>
  );
}

// ── Certificate Details Modal ─────────────────────────────────────────────────

function CertModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({
    certName:    plan.cert_name    || plan.title || '',
    certIssued:  plan.cert_issued  || '',
    certNumber:  plan.cert_number  || '',
    certIssuer:  plan.cert_issuer  || '',
    certExpires: plan.cert_expires || '',
    certUrl:     plan.cert_url     || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.updatePlan(plan.id, {
        cert_name:    form.certName.trim()    || null,
        cert_issued:  form.certIssued.trim()  || null,
        cert_number:  form.certNumber.trim()  || null,
        cert_issuer:  form.certIssuer.trim()  || null,
        cert_expires: form.certExpires.trim() || null,
        cert_url:     form.certUrl.trim()     || null,
      });
      onSave(updated);
    } catch { setSaving(false); }
  }

  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title="Certificate Details" onClose={onClose} />
      <Field label="Certificate Name">
        <input value={form.certName} onChange={e => set('certName', e.target.value)}
          placeholder="e.g. Claude Certified Associate — Foundational" style={inp} autoFocus />
      </Field>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Issued Date" half>
          <input value={form.certIssued} onChange={e => set('certIssued', e.target.value)}
            placeholder="e.g. 4 September 2026" style={inp} />
        </Field>
        <Field label="Certificate #/ID" half>
          <input value={form.certNumber} onChange={e => set('certNumber', e.target.value)}
            placeholder="e.g. CCA-F-2026" style={inp} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Issuer / Provider" half>
          <input value={form.certIssuer} onChange={e => set('certIssuer', e.target.value)}
            placeholder="e.g. Anthropic" style={inp} />
        </Field>
        <Field label="Expiry Date (optional)" half>
          <input value={form.certExpires} onChange={e => set('certExpires', e.target.value)}
            placeholder="e.g. September 2028" style={inp} />
        </Field>
      </div>
      <Field label="Credential URL (optional)">
        <input value={form.certUrl} onChange={e => set('certUrl', e.target.value)}
          placeholder="https://credentials.anthropic.com/…" style={inp} type="url" />
      </Field>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#3a2e05',
          background: 'linear-gradient(120deg,#f0c869,#e9a23b)',
        }}>{saving ? 'Saving…' : 'Save Certificate Details'}</button>
      </div>
    </ModalBase>
  );
}

// ── Delete Plan Modal ─────────────────────────────────────────────────────────

function DeletePlanModal({ plan, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    try { await api.deletePlan(plan.id); onConfirm(plan.id); }
    catch { setBusy(false); }
  }
  return (
    <ModalBase onClose={onClose} width={400}>
      <ModalHeader title="Delete Plan?" onClose={onClose} />
      <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.7 }}>
        Delete <strong style={{ color: 'var(--text)' }}>{plan.title}</strong>? All courses or books in this plan will also be removed. This cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '11px 0', borderRadius: 11, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
        }}>Cancel</button>
        <button onClick={handle} disabled={busy} style={{
          flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
          background: 'rgba(239,68,68,0.9)', color: '#fff', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
        }}>{busy ? 'Deleting…' : 'Delete Plan'}</button>
      </div>
    </ModalBase>
  );
}

// ── Book Form Modal (create + edit) ──────────────────────────────────────────

function BookFormModal({ book = null, planId, onClose, onSave }) {
  const isEdit = !!book;
  const [form, setForm] = useState({
    title:        book?.title         || '',
    author:       book?.author        || '',
    pages:        book?.pages?.toString() || '',
    genre:        book?.genre         || '',
    status:       book?.status        || 'to-read',
    startedDate:  book?.started_date  || '',
    finishedDate: book?.finished_date || '',
    rating:       book?.rating        || 0,
    notes:        book?.notes         || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const body = {
      plan_id:       planId,
      title:         form.title.trim(),
      author:        form.author.trim()       || null,
      pages:         form.pages ? parseInt(form.pages) : null,
      genre:         form.genre.trim()        || null,
      status:        form.status,
      started_date:  form.startedDate.trim()  || null,
      finished_date: form.finishedDate.trim() || null,
      rating:        form.rating              || null,
      notes:         form.notes.trim()        || null,
    };
    try {
      const result = isEdit
        ? await api.updateBook(book.id, body)
        : await api.createBook(body);
      onSave(result);
    } catch { setSaving(false); }
  }

  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={isEdit ? 'Edit Book' : 'Add Book / Novel'} onClose={onClose} />

      <Field label="Title *">
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. The Midnight Library" style={inp} autoFocus />
      </Field>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Author" half>
          <input value={form.author} onChange={e => set('author', e.target.value)}
            placeholder="e.g. Matt Haig" style={inp} />
        </Field>
        <Field label="Genre" half>
          <input value={form.genre} onChange={e => set('genre', e.target.value)}
            placeholder="e.g. Fiction, Self-help" style={inp} />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Pages" half>
          <input type="number" min="1" value={form.pages} onChange={e => set('pages', e.target.value)}
            placeholder="e.g. 304" style={inp} />
        </Field>
        <Field label="Status" half>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
            <option value="to-read">To Read</option>
            <option value="reading">Reading</option>
            <option value="finished">Finished</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Started Date" half>
          <input value={form.startedDate} onChange={e => set('startedDate', e.target.value)}
            placeholder="e.g. 13 June 2026" style={inp} />
        </Field>
        <Field label="Finished Date" half>
          <input value={form.finishedDate} onChange={e => set('finishedDate', e.target.value)}
            placeholder="e.g. 20 June 2026" style={inp} />
        </Field>
      </div>

      <Field label="Rating">
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => set('rating', form.rating === n ? 0 : n)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              fontSize: 24, color: n <= form.rating ? '#f59e0b' : 'var(--border-strong)',
              transition: 'color .15s',
            }}>★</button>
          ))}
          {form.rating > 0 && (
            <button onClick={() => set('rating', 0)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', padding: '0 6px',
            }}>clear</button>
          )}
        </div>
      </Field>

      <Field label="Notes (optional)">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Your thoughts, quotes, key takeaways…" rows={3}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
      </Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        }}>Cancel</button>
        <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{
          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
          background: 'linear-gradient(120deg,#6366f1,#a855f7)',
          opacity: form.title.trim() && !saving ? 1 : 0.5,
        }}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Book'}</button>
      </div>
    </ModalBase>
  );
}

// ── Book Card ─────────────────────────────────────────────────────────────────

function BookCard({ book, onEdit, onDelete, onStatusChange }) {
  const st = BOOK_STATUS[book.status] || BOOK_STATUS['to-read'];
  const nextStatus = book.status === 'to-read' ? 'reading' : book.status === 'reading' ? 'finished' : null;

  function advanceStatus() {
    if (!nextStatus) return;
    const updates = { status: nextStatus };
    if (nextStatus === 'reading'  && !book.started_date)  updates.started_date  = todayISO();
    if (nextStatus === 'finished' && !book.finished_date) updates.finished_date = todayISO();
    onStatusChange(book.id, updates);
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 18, padding: '18px 18px 14px',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${BOOK_STATUS[book.status]?.bg || 'var(--surface-2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {book.status === 'finished' ? '✅' : book.status === 'reading' ? '📖' : '📚'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 2 }}>{book.title}</div>
          {book.author && <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>by {book.author}</div>}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={onEdit} title="Edit book" style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#a5b4fc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={onDelete} title="Delete book" style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
        {book.genre && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
            {book.genre}
          </span>
        )}
        <button
          onClick={advanceStatus}
          title={nextStatus ? `Mark as ${BOOK_STATUS[nextStatus]?.label}` : 'Finished'}
          style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: st.bg, color: st.color, border: 'none',
            cursor: nextStatus ? 'pointer' : 'default',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => { if (nextStatus) e.currentTarget.style.opacity = '0.75'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {book.status === 'finished' ? '✓ ' : ''}{st.label}
          {nextStatus && ' →'}
        </button>
        {book.pages && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '3px 7px' }}>{book.pages} pp</span>
        )}
      </div>

      {/* Dates */}
      {(book.started_date || book.finished_date) && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 14, marginBottom: 8 }}>
          {book.started_date  && <span>Started: <strong style={{ color: 'var(--text-2)' }}>{book.started_date}</strong></span>}
          {book.finished_date && <span>Finished: <strong style={{ color: 'var(--text-2)' }}>{book.finished_date}</strong></span>}
        </div>
      )}

      {/* Rating */}
      {book.rating > 0 && (
        <div style={{ fontSize: 14, letterSpacing: 1, marginBottom: book.notes ? 8 : 0 }}>
          {'★'.repeat(book.rating)}<span style={{ color: 'var(--border-strong)' }}>{'☆'.repeat(5 - book.rating)}</span>
        </div>
      )}

      {/* Notes */}
      {book.notes && (
        <div style={{
          fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55,
          padding: '8px 10px', borderRadius: 9,
          background: 'var(--surface-2)', borderLeft: '3px solid var(--border-strong)',
          marginTop: book.rating ? 0 : 0,
        }}>
          {book.notes}
        </div>
      )}
    </div>
  );
}

// ── Reading Plan Detail ───────────────────────────────────────────────────────

function ReadingPlanDetail({ plan, books, onBack, onPlanUpdate, onAddBook, onUpdateBook, onDeleteBook }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddBook,  setShowAddBook]  = useState(false);
  const [editBook,     setEditBook]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy,   setDeleteBusy]   = useState(false);

  const total    = books.length;
  const finished = books.filter(b => b.status === 'finished').length;
  const reading  = books.filter(b => b.status === 'reading').length;
  const toRead   = books.filter(b => b.status === 'to-read').length;
  const pct      = total > 0 ? Math.round((finished / total) * 100) : 0;
  const ringDash = 326.7 * (1 - (total > 0 ? finished / total : 0));

  const filtered = statusFilter === 'all' ? books : books.filter(b => b.status === statusFilter);

  async function handleStatusChange(id, updates) {
    try {
      const updated = await api.updateBook(id, updates);
      onUpdateBook(updated);
    } catch {}
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.deleteBook(deleteTarget.id);
      onDeleteBook(deleteTarget.id);
      setDeleteTarget(null);
    } catch { setDeleteBusy(false); }
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>

      {/* Back nav */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-3)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
        padding: '0 0 20px',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Learning Plans
      </button>

      {/* Hero */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
        padding: '26px 28px', borderRadius: 24, marginBottom: 24,
        background: `linear-gradient(120deg, ${plan.color}2a, ${plan.color}10)`,
        border: `1px solid ${plan.color}40`,
      }}>
        <div style={{ position: 'relative', width: 120, height: 120, flex: '0 0 120px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke={plan.color} strokeWidth="9"
              strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset={ringDash}
              style={{ transition: 'stroke-dashoffset .8s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{pct}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>read</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: plan.color, marginBottom: 2 }}>
            Reading List
          </div>
          <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 30, margin: '4px 0 14px' }}>
            {plan.icon} {plan.title}
          </h2>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{total}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>total books</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{finished}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>finished</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#a5b4fc' }}>{reading}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>reading now</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{toRead}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>to read</div>
            </div>
          </div>
          {plan.description && (
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '10px 0 0', lineHeight: 1.6 }}>{plan.description}</p>
          )}
        </div>

        <button onClick={() => setShowAddBook(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '13px 22px',
          borderRadius: 14, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff',
          background: `linear-gradient(120deg, ${plan.color}, ${plan.color}bb)`,
          boxShadow: `0 6px 18px ${plan.color}44`, flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Book
        </button>
      </div>

      {/* Status filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all',      label: `All (${total})` },
          { key: 'reading',  label: `📖 Reading (${reading})` },
          { key: 'to-read',  label: `📚 To Read (${toRead})` },
          { key: 'finished', label: `✅ Finished (${finished})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)} style={{
            padding: '7px 16px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${statusFilter === tab.key ? plan.color : 'var(--border)'}`,
            background: statusFilter === tab.key ? `${plan.color}22` : 'transparent',
            color: statusFilter === tab.key ? 'var(--text)' : 'var(--text-3)',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Books grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '50px 0',
          border: '1px dashed var(--border)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
          <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 6 }}>
            {total === 0 ? 'No books added yet' : 'No books in this category'}
          </div>
          {total === 0 && (
            <button onClick={() => setShowAddBook(true)} style={{
              marginTop: 10, padding: '10px 22px', borderRadius: 11, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            }}>Add your first book</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(b => (
            <BookCard
              key={b.id}
              book={b}
              onEdit={() => setEditBook(b)}
              onDelete={() => setDeleteTarget(b)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddBook && (
        <BookFormModal
          planId={plan.id}
          onClose={() => setShowAddBook(false)}
          onSave={book => { onAddBook(book); setShowAddBook(false); }}
        />
      )}
      {editBook && (
        <BookFormModal
          book={editBook}
          planId={plan.id}
          onClose={() => setEditBook(null)}
          onSave={updated => { onUpdateBook(updated); setEditBook(null); }}
        />
      )}
      {deleteTarget && (
        <ModalBase onClose={() => setDeleteTarget(null)} width={380}>
          <ModalHeader title="Remove Book?" onClose={() => setDeleteTarget(null)} />
          <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.7 }}>
            Remove <strong style={{ color: 'var(--text)' }}>{deleteTarget.title}</strong> from your reading list?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeleteTarget(null)} style={{
              flex: 1, padding: '11px 0', borderRadius: 11, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
            }}>Cancel</button>
            <button onClick={handleDeleteConfirm} disabled={deleteBusy} style={{
              flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
              background: 'rgba(239,68,68,0.9)', color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            }}>{deleteBusy ? 'Removing…' : 'Remove'}</button>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

// ── Plan Card (hub) ───────────────────────────────────────────────────────────

function PlanCard({ plan, courses, books = [], onClick, onEdit, onDelete }) {
  const isReading = plan.type === 'reading';
  const tm = TYPE_META[plan.type] || TYPE_META.other;

  let pct, statsLine, nextLine;
  if (isReading) {
    const total    = books.length;
    const finished = books.filter(b => b.status === 'finished').length;
    const readingN = books.filter(b => b.status === 'reading').length;
    pct       = total > 0 ? Math.round((finished / total) * 100) : 0;
    statsLine = `${finished}/${total} books · ${readingN} reading`;
    const cur = books.find(b => b.status === 'reading');
    nextLine  = cur ? `Now: ${cur.title}` : total === 0 ? 'No books yet' : null;
  } else {
    const totalS  = courses.reduce((a, c) => a + c.total, 0);
    const doneS   = courses.reduce((a, c) => a + c.done, 0);
    pct       = totalS > 0 ? Math.round((doneS / totalS) * 100) : 0;
    const cc  = courses.filter(c => c.done >= c.total).length;
    statsLine = `${cc}/${courses.length} courses · ${doneS}/${totalS} sessions`;
    const nc  = courses.find(c => c.done < c.total);
    nextLine  = nc ? `Next: ${nc.next}` : null;
  }

  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 20, padding: '22px 22px 18px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 0,
      transition: 'border-color .2s, box-shadow .2s',
      position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = plan.color;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${plan.color}44, 0 8px 28px rgba(0,0,0,0.18)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${plan.color}, ${plan.color}88)`,
        borderRadius: '20px 20px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: `${plan.color}22`, border: `1px solid ${plan.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{plan.icon || '📚'}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: tm.bg, color: tm.color }}>{tm.label}</span>
            {plan.passed && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>✓ Passed</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15.5, lineHeight: 1.3 }}>{plan.title}</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(plan); }} title="Edit plan" style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#a5b4fc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(plan); }} title="Delete plan" style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress ring + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <MiniRing pct={pct} color={plan.color} size={60} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: plan.color }}>{pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{statsLine}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: plan.color, transition: 'width .5s ease' }} />
      </div>

      {/* Next line */}
      <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '3px 12px' }}>
        {nextLine && <span>{nextLine}</span>}
        {plan.start_date  && <span>Started: {/^\d{4}-\d{2}-\d{2}$/.test(plan.start_date) ? fmtShortDate(plan.start_date) : plan.start_date}</span>}
        {plan.exam_date   && !isReading && <span>Exam: {/^\d{4}-\d{2}-\d{2}$/.test(plan.exam_date) ? fmtShortDate(plan.exam_date) : plan.exam_date}</span>}
        {plan.completed_date && <span style={{ color: '#34d399' }}>Completed: {/^\d{4}-\d{2}-\d{2}$/.test(plan.completed_date) ? fmtShortDate(plan.completed_date) : plan.completed_date}</span>}
        {plan.passed && !isReading && <span style={{ color: '#34d399' }}>✓ Certificate earned</span>}
      </div>
    </div>
  );
}

// ── Plans Hub ─────────────────────────────────────────────────────────────────

// ── Learning Event Form Modal ─────────────────────────────────────────────────

function LearningEventFormModal({ event = null, plans = [], onClose, onSave }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title:        event?.title        || '',
    event_type:   event?.event_type   || 'webinar',
    event_date:   event?.event_date   || '',
    event_time:   event?.event_time   || '',
    url:          event?.url          || '',
    plan_id:      event?.plan_id      || '',
    notes:        event?.notes        || '',
    has_cert:     event?.has_cert     || false,
    cert_name:    event?.cert_name    || '',
    cert_issuer:  event?.cert_issuer  || '',
    cert_number:  event?.cert_number  || '',
    cert_url:     event?.cert_url     || '',
    cert_issued:  event?.cert_issued  || '',
    cert_expires: event?.cert_expires || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const body = {
      title:        form.title.trim(),
      event_type:   form.event_type,
      event_date:   form.event_date   || null,
      event_time:   form.event_time   || null,
      url:          form.url.trim()   || null,
      plan_id:      form.plan_id ? Number(form.plan_id) : null,
      notes:        form.notes.trim() || null,
      attended:     event?.attended   ?? false,
      has_cert:     form.has_cert,
      cert_name:    form.has_cert ? (form.cert_name.trim()    || null) : null,
      cert_issuer:  form.has_cert ? (form.cert_issuer.trim()  || null) : null,
      cert_number:  form.has_cert ? (form.cert_number.trim()  || null) : null,
      cert_url:     form.has_cert ? (form.cert_url.trim()     || null) : null,
      cert_issued:  form.has_cert ? (form.cert_issued.trim()  || null) : null,
      cert_expires: form.has_cert ? (form.cert_expires.trim() || null) : null,
    };
    try {
      const result = isEdit
        ? await api.updateLearningEvent(event.id, body)
        : await api.createLearningEvent(body);
      onSave(result);
    } catch { setSaving(false); }
  }

  const meta = EVENT_TYPES[form.event_type] || EVENT_TYPES.other;

  return (
    <ModalBase onClose={onClose} width={560}>
      <ModalHeader title={isEdit ? 'Edit Learning Event' : 'Add Learning Event'} onClose={onClose} />

      <Field label="Event Title *">
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Mastering Claude Like a Pro" style={inp} autoFocus />
      </Field>

      <Field label="Event Type">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(EVENT_TYPES).map(([key, m]) => (
            <button key={key} onClick={() => set('event_type', key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: form.event_type === key ? 700 : 400,
              border: `1px solid ${form.event_type === key ? m.color : 'var(--border)'}`,
              background: form.event_type === key ? m.bg : 'var(--surface-2)',
              color: form.event_type === key ? m.color : 'var(--text-2)',
              transition: 'all .15s',
            }}>
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="Date" half>
          <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} style={inp} />
        </Field>
        <Field label="Time (optional)" half>
          <input type="time" value={form.event_time} onChange={e => set('event_time', e.target.value)} style={inp} />
        </Field>
      </div>

      <Field label="URL / Join Link (optional)">
        <input value={form.url} onChange={e => set('url', e.target.value)}
          placeholder="https://…" style={inp} />
      </Field>

      <Field label="Link to Learning Plan (optional)">
        <select value={form.plan_id} onChange={e => set('plan_id', e.target.value)}
          style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
          <option value="">— None —</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
          ))}
        </select>
      </Field>

      <Field label="Notes (optional)">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Topics covered, key takeaways…" rows={2}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
      </Field>

      {/* Certification toggle */}
      <button onClick={() => set('has_cert', !form.has_cert)} style={{
        width: '100%', padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
        border: `1px solid ${form.has_cert ? '#d4af37' : 'var(--border)'}`,
        background: form.has_cert ? 'rgba(212,175,55,0.12)' : 'var(--surface-2)',
        color: form.has_cert ? '#d4af37' : 'var(--text-2)',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        transition: 'all .15s',
      }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <span>{form.has_cert ? 'Leads to a Certification ✓' : 'Does this lead to a certification?'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{form.has_cert ? 'tap to remove' : 'tap to add'}</span>
      </button>

      {form.has_cert && (
        <div style={{
          padding: '16px 18px', borderRadius: 14, marginBottom: 16,
          background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#d4af37', marginBottom: 14, letterSpacing: '0.05em' }}>CERTIFICATION DETAILS</div>

          <Field label="Certificate / Credential Name">
            <input value={form.cert_name} onChange={e => set('cert_name', e.target.value)}
              placeholder="e.g. Claude Certified Associate" style={inp} />
          </Field>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Field label="Issuing Organisation" half>
              <input value={form.cert_issuer} onChange={e => set('cert_issuer', e.target.value)}
                placeholder="e.g. Anthropic" style={inp} />
            </Field>
            <Field label="Credential / Certificate #" half>
              <input value={form.cert_number} onChange={e => set('cert_number', e.target.value)}
                placeholder="Optional" style={inp} />
            </Field>
          </div>

          <Field label="Certificate URL (optional)">
            <input value={form.cert_url} onChange={e => set('cert_url', e.target.value)}
              placeholder="https://…" style={inp} />
          </Field>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Field label="Date Issued" half>
              <input value={form.cert_issued} onChange={e => set('cert_issued', e.target.value)}
                placeholder="e.g. 15 Jun 2026" style={inp} />
            </Field>
            <Field label="Expiry Date (if any)" half>
              <input value={form.cert_expires} onChange={e => set('cert_expires', e.target.value)}
                placeholder="e.g. 15 Jun 2028" style={inp} />
            </Field>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        }}>Cancel</button>
        <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{
          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
          background: `linear-gradient(120deg, ${meta.color}, ${meta.color}cc)`,
          opacity: form.title.trim() && !saving ? 1 : 0.5,
        }}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : `Add Event ${meta.emoji}`}</button>
      </div>
    </ModalBase>
  );
}

// ── Learning Events Section ───────────────────────────────────────────────────

function LearningEventsSection({ events, plans, onCreated, onUpdated, onDeleted }) {
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [showPast,    setShowPast]    = useState(false);

  const today = todayISO();

  async function handleAttend(ev) {
    try {
      const updated = await api.updateLearningEvent(ev.id, {
        title: ev.title, event_type: ev.event_type, event_date: ev.event_date,
        event_time: ev.event_time, url: ev.url, plan_id: ev.plan_id,
        notes: ev.notes, attended: !ev.attended,
      });
      onUpdated(updated);
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return;
    await api.deleteLearningEvent(id);
    onDeleted(id);
  }

  const upcoming = events.filter(e => !e.event_date || e.event_date >= today);
  const past     = events.filter(e =>  e.event_date && e.event_date <  today);

  function EventCard({ ev }) {
    const meta = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
    const linked = plans.find(p => p.id === ev.plan_id);
    const [hov, setHov] = useState(false);
    return (
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
        padding: '14px 16px', borderRadius: 14,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', gap: 14, alignItems: 'flex-start',
        transition: 'border-color .15s',
        borderColor: hov ? 'var(--border-strong)' : 'var(--border)',
        opacity: ev.attended ? 0.65 : 1,
      }}>
        {/* type badge */}
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{meta.emoji}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
              background: meta.bg, color: meta.color, letterSpacing: '0.04em',
            }}>{meta.label.toUpperCase()}</span>
            {ev.attended && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.16)', color: '#34d399', fontWeight: 700 }}>✓ ATTENDED</span>
            )}
            {linked && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${linked.color}22`, color: linked.color, fontWeight: 600 }}>
                {linked.icon} {linked.title}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, margin: '6px 0 4px', color: 'var(--text)' }}>{ev.title}</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {ev.event_date && (
              <span style={{ fontSize: 12.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ''}
              </span>
            )}
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: meta.color, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                onClick={e => e.stopPropagation()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Join / Link
              </a>
            )}
          </div>
          {ev.notes && (
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 5, fontStyle: 'italic' }}>{ev.notes}</div>
          )}
          {ev.has_cert && (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.28)',
              display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            }}>
              <span style={{ fontSize: 15 }}>🏆</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#d4af37' }}>
                  {ev.cert_name || 'Certification'}
                  {ev.cert_issuer ? ` · ${ev.cert_issuer}` : ''}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                  {ev.cert_issued ? `Issued: ${ev.cert_issued}` : ''}
                  {ev.cert_issued && ev.cert_expires ? ' · ' : ''}
                  {ev.cert_expires ? `Expires: ${ev.cert_expires}` : ''}
                  {ev.cert_number ? ` · #${ev.cert_number}` : ''}
                </div>
              </div>
              {ev.cert_url && (
                <a href={ev.cert_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 12, color: '#d4af37', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  View Certificate →
                </a>
              )}
            </div>
          )}
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => handleAttend(ev)} title={ev.attended ? 'Mark as not attended' : 'Mark as attended'} style={{
            width: 30, height: 30, borderRadius: 8, border: `1px solid ${ev.attended ? '#10b981' : 'var(--border)'}`,
            background: ev.attended ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: ev.attended ? '#10b981' : 'var(--text-3)', fontSize: 14, transition: 'all .15s',
          }}>✓</button>
          <button onClick={() => setEditTarget(ev)} title="Edit" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => handleDelete(ev.id)} title="Delete" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: "'Newsreader', serif", fontWeight: 500 }}>
            Learning Events
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-3)' }}>
            Webinars, workshops, meetings and live courses you attend
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
          borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff',
          background: 'linear-gradient(120deg,#6366f1,#a855f7)',
          boxShadow: '0 4px 14px rgba(99,102,241,0.28)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Event
        </button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div style={{
          padding: '32px 24px', borderRadius: 16, border: '1px dashed var(--border)',
          textAlign: 'center', color: 'var(--text-3)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: 14 }}>No events yet — add a webinar, workshop, or live course</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
        </div>
      )}

      {past.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowPast(s => !s)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
            color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showPast ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            {showPast ? 'Hide' : 'Show'} {past.length} past event{past.length > 1 ? 's' : ''}
          </button>
          {showPast && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <LearningEventFormModal
          plans={plans}
          onClose={() => setShowForm(false)}
          onSave={ev => { onCreated(ev); setShowForm(false); }}
        />
      )}
      {editTarget && (
        <LearningEventFormModal
          event={editTarget}
          plans={plans}
          onClose={() => setEditTarget(null)}
          onSave={ev => { onUpdated(ev); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

// ── Plans Hub ─────────────────────────────────────────────────────────────────

const PLAN_PRESETS = [
  { id: 'anthropic', label: '🤖 Anthropic Certification Plan', desc: 'AI / Claude specialization', file: '/seeds/plan-anthropic-certification-plan.json' },
  { id: 'google',    label: '🔷 Google AI Professional Cert',  desc: 'Google Cloud AI track',      file: '/seeds/plan-google-ai-professional-certificate.json' },
  { id: 'sql',       label: '🗄️ Associate Data Analyst in SQL', desc: 'SQL analytics track',        file: '/seeds/plan-associate-data-analyst-in-sql.json' },
];

function ImportPlanModal({ onClose, onPlanCreated }) {
  const [busy,    setBusy]    = useState(null);
  const [msg,     setMsg]     = useState(null);

  async function doImport(source) {
    setBusy(source);
    setMsg(null);
    try {
      let data;
      if (typeof source === 'string') {
        data = await fetch(source).then(r => r.json());
      } else {
        const text = await source.text();
        data = JSON.parse(text);
      }
      const res = await api.importPlan(data);
      onPlanCreated(res.plan);
      setMsg(`Plan "${res.plan.title}" imported with ${res.courses} courses.`);
    } catch (e) {
      setMsg('Import failed: ' + (e.message || 'Unknown error'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 460, borderRadius: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Import Learning Plan</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Load a preset plan or upload your own JSON. A new plan is always created so you can rename it independently.</div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {PLAN_PRESETS.map(p => (
              <button
                key={p.id}
                disabled={!!busy}
                onClick={() => doImport(p.file)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', textAlign: 'left', opacity: busy && busy !== p.file ? 0.5 : 1 }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.desc}</div>
                </div>
                {busy === p.file ? (
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Load →</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Upload JSON</div>
          <label style={{ display: 'block', padding: '12px 16px', borderRadius: 12, border: '1px dashed var(--border)', textAlign: 'center', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}>
            {busy === 'file' ? 'Uploading…' : 'Click to choose file'}
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => e.target.files[0] && doImport(e.target.files[0])} />
          </label>

          {msg && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: msg.startsWith('Import failed') ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: msg.startsWith('Import failed') ? '#fca5a5' : '#34d399', fontSize: 13 }}>
              {msg}
            </div>
          )}

          <button
            onClick={onClose}
            style={{ marginTop: 18, width: '100%', padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-2)', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PlansHub({ plans, courses, books, events, loading, onOpen, onPlanCreated, onPlanUpdated, onPlanDeleted, onEventCreated, onEventUpdated, onEventDeleted }) {
  const [showNew,      setShowNew]      = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 32, margin: '0 0 4px' }}>
            Learning Plans
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
            Certifications, courses, study plans and reading lists
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowImport(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px',
            borderRadius: 13, border: '1px solid var(--border)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            color: 'var(--text-2)', background: 'var(--surface)',
          }}>
            ↓ Import Plan
          </button>
          <button onClick={() => setShowNew(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px',
            borderRadius: 13, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(120deg,#6366f1,#a855f7)',
            boxShadow: '0 6px 18px rgba(99,102,241,0.3)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>Loading plans…</div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 6 }}>No learning plans yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Create a plan to track certifications, courses or reading lists</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              courses={courses.filter(c => (c.planId ?? 1) === plan.id)}
              books={books.filter(b => b.plan_id === plan.id)}
              onClick={() => onOpen(plan.id)}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <LearningEventsSection
        events={events}
        plans={plans}
        onCreated={onEventCreated}
        onUpdated={onEventUpdated}
        onDeleted={onEventDeleted}
      />

      {showImport && (
        <ImportPlanModal
          onClose={() => setShowImport(false)}
          onPlanCreated={plan => onPlanCreated(plan)}
        />
      )}
      {showNew && (
        <PlanFormModal
          onClose={() => setShowNew(false)}
          onSave={plan => { onPlanCreated(plan); setShowNew(false); }}
        />
      )}
      {editTarget && (
        <PlanFormModal
          plan={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updated => { onPlanUpdated(updated); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeletePlanModal
          plan={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={id => { onPlanDeleted(id); setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}

// ── Course time tracker (timer / stopwatch) ───────────────────────────────────

const TIMER_PRESETS = [15, 25, 45, 60]; // minutes

function fmtHMS(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function fmtHoursMins(sec) {
  if (!sec) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function CourseTimeTracker({ course, timer, setting, onModeChange, onDurationChange, onStart, onPause, onReset, todaySeconds, totalSeconds, accent }) {
  const isThis = timer?.courseId === course.id;
  const running = isThis && timer.running;
  const mode = isThis ? timer.mode : setting.mode;
  const durationMin = isThis ? Math.round(timer.durationSec / 60) : setting.durationMin;
  const elapsed = isThis ? timer.elapsed : 0;
  const remaining = mode === 'timer' ? Math.max(0, (isThis ? timer.durationSec : durationMin * 60) - elapsed) : null;
  const showPicker = mode === 'timer' && !running && elapsed === 0;
  const modeLocked = running || (isThis && elapsed > 0);

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" onClick={() => onModeChange('stopwatch')} disabled={modeLocked}
            style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: `1px solid ${mode === 'stopwatch' ? accent : 'var(--border)'}`, background: mode === 'stopwatch' ? `${accent}22` : 'transparent', color: mode === 'stopwatch' ? accent : 'var(--text-3)', cursor: modeLocked ? 'default' : 'pointer', opacity: modeLocked && mode !== 'stopwatch' ? 0.5 : 1 }}>
            ⏲ Stopwatch
          </button>
          <button type="button" onClick={() => onModeChange('timer')} disabled={modeLocked}
            style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: `1px solid ${mode === 'timer' ? accent : 'var(--border)'}`, background: mode === 'timer' ? `${accent}22` : 'transparent', color: mode === 'timer' ? accent : 'var(--text-3)', cursor: modeLocked ? 'default' : 'pointer', opacity: modeLocked && mode !== 'timer' ? 0.5 : 1 }}>
            ⏱ Timer
          </button>
        </div>
        {showPicker && (
          <select value={durationMin} onChange={e => onDurationChange(Number(e.target.value))}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'inherit' }}>
            {TIMER_PRESETS.map(m => <option key={m} value={m}>{m} min</option>)}
          </select>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 64 }}>
          {mode === 'timer' ? fmtHMS(remaining) : fmtHMS(elapsed)}
        </div>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {!running ? (
            <button type="button" onClick={onStart} style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', background: accent, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
              ▶ {isThis && elapsed > 0 ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button type="button" onClick={onPause} style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
              ⏸ Pause
            </button>
          )}
          {isThis && elapsed > 0 && (
            <button type="button" onClick={onReset} title="Reset" style={{ width: 30, borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>↺</button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 6 }}>
        Today <strong style={{ color: 'var(--text-2)' }}>{fmtHoursMins(todaySeconds)}</strong> · Total <strong style={{ color: 'var(--text-2)' }}>{fmtHoursMins(totalSeconds)}</strong>
      </div>
    </div>
  );
}

// ── Plan Detail (courses / phases) ────────────────────────────────────────────

function PlanDetail({ plan, courses, onBack, onPlanUpdate, dispatch, state }) {
  const [missedModal,    setMissedModal]    = useState(null);
  const [certModal,      setCertModal]      = useState(false);
  const [importVal,      setImportVal]      = useState('');
  const [importing,      setImporting]      = useState(false);
  const [importResult,   setImportResult]   = useState(null);
  const [importErr,      setImportErr]      = useState('');
  const [showManual,     setShowManual]     = useState(false);
  const [manualForm,     setManualForm]     = useState({ name: '', phase: '0', sessions: '5', url: '' });
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleteBusy,     setDeleteBusy]     = useState(false);
  const [selectedCourses,     setSelectedCourses]     = useState(new Set());
  const [addingBundle,        setAddingBundle]        = useState(false);
  const [geminiQuotaExceeded, setGeminiQuotaExceeded] = useState(false);
  const [ollamaTimedOut,      setOllamaTimedOut]      = useState(false);

  // ── Per-course timer/stopwatch ──────────────────────────────────────────────
  // Only one course can be timed at once (you can't study two things at the same
  // time) — `activeTimer` holds that single running/paused session. `courseSettings`
  // remembers each course's chosen mode/duration even when it isn't the active one.
  const [timeLogs, setTimeLogs] = useState([]); // [{ course_id, log_date, seconds }]
  const [activeTimer, setActiveTimer] = useState(null); // { courseId, mode, durationSec, elapsed, lastFlushed, running }
  const [courseSettings, setCourseSettings] = useState({}); // { [courseId]: { mode, durationMin } }
  const activeTimerRef = useRef(activeTimer);
  activeTimerRef.current = activeTimer;

  useEffect(() => {
    api.getCourseTimeLogs().then(setTimeLogs).catch(() => {});
  }, []);

  // Only advances `lastFlushed` once the server confirms the write. This is the
  // one thing that must never be optimistic: if a flush fails (dropped wifi,
  // dev-server restart, Neon cold start) and we advanced lastFlushed anyway,
  // that chunk of study time is gone for good — every future retry would
  // compute its delta from the wrong (already-advanced) baseline. Leaving
  // lastFlushed untouched on failure means the unflushed delta keeps growing
  // and the next periodic tick retries the *same* seconds, so nothing is lost,
  // it's just delayed until connectivity returns.
  async function flushTime(courseId, deltaSeconds) {
    if (deltaSeconds <= 0) return;
    try {
      const row = await api.logCourseTime(courseId, deltaSeconds);
      setTimeLogs(logs => {
        const idx = logs.findIndex(l => l.course_id === row.course_id && l.log_date === row.log_date);
        if (idx === -1) return [...logs, row];
        const next = [...logs]; next[idx] = row; return next;
      });
      setActiveTimer(t => (t && t.courseId === courseId) ? { ...t, lastFlushed: t.lastFlushed + deltaSeconds } : t);
    } catch { /* lastFlushed stays put — retried on the next tick */ }
  }

  // tick every second while running — pure state update only. Side effects
  // (flushTime, confetti) must never live inside a setState updater: React
  // StrictMode's dev-mode double-invoke can call updaters twice, which would
  // double-log seconds to the server. They live in the effect below instead.
  useEffect(() => {
    if (!activeTimer?.running) return;
    const id = setInterval(() => {
      setActiveTimer(t => (t && t.running) ? { ...t, elapsed: t.elapsed + 1 } : t);
    }, 1000);
    return () => clearInterval(id);
  }, [activeTimer?.running, activeTimer?.courseId]);

  // Countdown timer reaching zero: flush, celebrate, clear — exactly once.
  useEffect(() => {
    if (activeTimer?.running && activeTimer.mode === 'timer' && activeTimer.elapsed >= activeTimer.durationSec) {
      flushTime(activeTimer.courseId, activeTimer.elapsed - activeTimer.lastFlushed);
      fireConfetti();
      setActiveTimer(null);
    }
  }, [activeTimer]);

  // persist progress periodically so a dropped connection loses at most a few
  // seconds, not the whole session (see flushTime's retry-safety note above)
  useEffect(() => {
    if (!activeTimer?.running) return;
    const id = setInterval(() => {
      const t = activeTimerRef.current;
      if (t && t.running) {
        const delta = t.elapsed - t.lastFlushed;
        if (delta > 0) flushTime(t.courseId, delta);
      }
    }, 20000);
    return () => clearInterval(id);
  }, [activeTimer?.running, activeTimer?.courseId]);

  // flush whatever's pending if the user navigates away from this plan
  useEffect(() => {
    return () => {
      const t = activeTimerRef.current;
      if (t) {
        const delta = t.elapsed - t.lastFlushed;
        if (delta > 0) flushTime(t.courseId, delta);
      }
    };
  }, []);

  function startTimer(courseId) {
    const setting = courseSettings[courseId] || { mode: 'stopwatch', durationMin: 25 };
    const prev = activeTimerRef.current;
    if (prev && prev.courseId !== courseId && prev.running) {
      const delta = prev.elapsed - prev.lastFlushed;
      if (delta > 0) flushTime(prev.courseId, delta);
    }
    setActiveTimer(p => {
      if (p && p.courseId === courseId) return { ...p, running: true };
      return { courseId, mode: setting.mode, durationSec: setting.durationMin * 60, elapsed: 0, lastFlushed: 0, running: true };
    });
  }
  function pauseTimer() {
    const t = activeTimerRef.current;
    setActiveTimer(cur => cur ? { ...cur, running: false } : cur);
    if (t) {
      const delta = t.elapsed - t.lastFlushed;
      if (delta > 0) flushTime(t.courseId, delta);
    }
  }
  function resetTimer(courseId) {
    setActiveTimer(t => (t && t.courseId === courseId ? null : t));
  }
  function getCourseSetting(courseId) {
    return courseSettings[courseId] || { mode: 'stopwatch', durationMin: 25 };
  }
  function setCourseMode(courseId, mode) {
    setCourseSettings(s => ({ ...s, [courseId]: { ...getCourseSetting(courseId), mode } }));
  }
  function setCourseDuration(courseId, durationMin) {
    setCourseSettings(s => ({ ...s, [courseId]: { ...getCourseSetting(courseId), durationMin } }));
  }

  const todayStr = todayISO();
  const timeTodayMap = {};
  const timeTotalMap = {};
  timeLogs.forEach(l => {
    timeTotalMap[l.course_id] = (timeTotalMap[l.course_id] || 0) + l.seconds;
    if (l.log_date === todayStr) timeTodayMap[l.course_id] = (timeTodayMap[l.course_id] || 0) + l.seconds;
  });
  function getTodaySeconds(courseId) {
    const base = timeTodayMap[courseId] || 0;
    return activeTimer?.courseId === courseId ? base + (activeTimer.elapsed - activeTimer.lastFlushed) : base;
  }
  function getTotalSeconds(courseId) {
    const base = timeTotalMap[courseId] || 0;
    return activeTimer?.courseId === courseId ? base + (activeTimer.elapsed - activeTimer.lastFlushed) : base;
  }
  const todayTotalAllCourses = courses.reduce((sum, c) => sum + getTodaySeconds(c.id), 0);

  const totalSessions   = courses.reduce((a, c) => a + c.total, 0);
  const doneSessions    = courses.reduce((a, c) => a + c.done,  0);
  const coursesComplete = courses.filter(c => c.done >= c.total).length;
  const overallPct      = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0;
  const ringDash        = 326.7 * (1 - (totalSessions > 0 ? doneSessions / totalSessions : 0));

  const fmtPlanDate = d => {
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return fmtShortDate(d);
    return d; // legacy human-readable strings
  };
  const startDate     = fmtPlanDate(plan.start_date);
  const completedDate = fmtPlanDate(plan.completed_date);
  const examDate      = plan.id === 1 ? EXAM_DATE           : fmtPlanDate(plan.exam_date);
  const estCompletion = plan.id === 1 ? EST_COMPLETION_DATE : fmtPlanDate(plan.est_completion);
  const certName      = plan.cert_name || (plan.id === 1 ? 'Claude Certified Associate — Foundational' : plan.title);
  const isPassed      = plan.passed || (plan.id === 1 && state.examDone);

  const shownPhases = plan.id === 1
    ? [0, 1, 2, 3]
    : ([...new Set(courses.map(c => c.phase))].sort((a, b) => a - b).length > 0
       ? [...new Set(courses.map(c => c.phase))].sort((a, b) => a - b)
       : [0]);

  const manualPhaseOpts = plan.id === 1
    ? PHASE_NAMES.map((n, i) => ({ value: i, label: n }))
    : [0,1,2,3].map(i => ({ value: i, label: `Phase ${i+1}` }));

  const pinnedCourses = state.pinnedCourses || [];

  async function handleTogglePin(courseId) {
    const isPinned = pinnedCourses.includes(courseId);
    if (isPinned) {
      dispatch({ type: 'UNPIN_COURSE', id: courseId });
      try {
        await api.unpinCourse(courseId);
      } catch (e) {
        console.error('Failed to unpin course:', e);
      }
    } else {
      dispatch({ type: 'PIN_COURSE', id: courseId });
      try {
        await api.pinCourse(courseId);
      } catch (e) {
        console.error('Failed to pin course:', e);
      }
    }
  }

  function handleAddSession(id) {
    const course = courses.find(c => c.id === id);
    if (course && course.done < course.total) {
      if (course.done + 1 >= course.total) fireConfetti();
      dispatch({ type: 'ADD_SESSION', id });
      patchCourse(id, { done: course.done + 1 });
    }
  }

  function handleRemoveSession(id) {
    const course = courses.find(c => c.id === id);
    if (course && course.done > 0) {
      dispatch({ type: 'REMOVE_SESSION', id });
      patchCourse(id, { done: course.done - 1 });
    }
  }

  function handleMissedConfirm() {
    if (missedModal) {
      dispatch({ type: 'PUSH_SESSIONS', id: missedModal });
      const fromIdx = courses.findIndex(c => c.id === missedModal);
      if (fromIdx !== -1) {
        courses.forEach((c, i) => {
          if (i >= fromIdx && c.nextISO) {
            const newISO = addWorkdayToISO(c.nextISO);
            patchCourse(c.id, { next_iso: newISO, next: fmtShortDate(newISO) });
          }
        });
      }
    }
    setMissedModal(null);
  }

  async function handlePassExam() {
    if (isPassed) return;
    try {
      const updated = await api.updatePlan(plan.id, { passed: true });
      onPlanUpdate(updated);
      if (plan.id === 1) dispatch({ type: 'PASS_EXAM' });
      fireConfetti();
      setTimeout(fireConfetti, 400);
    } catch {
      if (plan.id === 1) dispatch({ type: 'PASS_EXAM' });
      fireConfetti();
    }
  }

  async function handleAiExtract() {
    const val = importVal.trim();
    if (!val) return;
    setImporting(true); setImportErr(''); setImportResult(null); setSelectedCourses(new Set());
    try {
      const isUrl = val.startsWith('http');
      const json = await api.aiImportCourse(isUrl ? { url: val } : { name: val });
      setGeminiQuotaExceeded(false);
      setOllamaTimedOut(false);
      if (json.data?.type === 'bundle' && Array.isArray(json.data.courses)) {
        setSelectedCourses(new Set(json.data.courses.map((_, i) => i)));
      }
      setImportResult(json);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('geminiQuotaExceeded')) setGeminiQuotaExceeded(true);
      if (msg.includes('ollamaTimedOut'))      setOllamaTimedOut(true);
      setImportErr(msg || 'AI extraction failed');
    }
    finally { setImporting(false); }
  }

  async function handleAddImported() {
    if (!importResult?.data) return;
    const data = importResult.data;
    const sourceUrl = importVal.trim().startsWith('http') ? importVal.trim() : '';

    if (data.type === 'bundle') {
      const toAdd = (data.courses || []).filter((_, i) => selectedCourses.has(i));
      if (!toAdd.length) return;
      setAddingBundle(true);
      for (const course of toAdd) {
        try {
          const row = await api.createCourse({ name: course.name, phase: course.phase ?? 0, total: course.sessions ?? 5, url: sourceUrl, plan_id: plan.id });
          dispatch({ type: 'ADD_COURSE', course: rowToLocal(row) });
        } catch {
          dispatch({ type: 'ADD_COURSE', course: {
            id: `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: course.name, phase: course.phase ?? 0, total: course.sessions ?? 5,
            done: 0, next: 'TBD', nextISO: null, url: sourceUrl, planId: plan.id,
          }});
        }
      }
      setAddingBundle(false);
    } else {
      const { name, sessions, phase } = data;
      try {
        const row = await api.createCourse({ name, phase: phase ?? 0, total: sessions ?? 5, url: sourceUrl, plan_id: plan.id });
        dispatch({ type: 'ADD_COURSE', course: rowToLocal(row) });
      } catch {
        dispatch({ type: 'ADD_COURSE', course: {
          id: `c${Date.now()}`, name, phase: phase ?? 0, total: sessions ?? 5,
          done: 0, next: 'TBD', nextISO: null, url: sourceUrl, planId: plan.id,
        }});
      }
    }
    setImportVal(''); setImportResult(null); setSelectedCourses(new Set());
  }

  async function handleAddManual() {
    const name = manualForm.name.trim();
    if (!name) return;
    const phase = parseInt(manualForm.phase, 10);
    const total = parseInt(manualForm.sessions, 10) || 5;
    const url   = manualForm.url.trim();
    try {
      const row = await api.createCourse({ name, phase, total, url: url || null, plan_id: plan.id });
      dispatch({ type: 'ADD_COURSE', course: rowToLocal(row) });
    } catch {
      dispatch({ type: 'ADD_COURSE', course: { id: `c${Date.now()}`, name, phase, total, done: 0, next: 'TBD', nextISO: null, url, planId: plan.id } });
    }
    setManualForm({ name: '', phase: '0', sessions: '5', url: '' });
    setShowManual(false);
  }

  async function handleDeleteCourse() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.deleteCourse(deleteTarget.id);
    } catch { /* offline — still remove locally */ }
    dispatch({ type: 'DELETE_COURSE', id: deleteTarget.id });
    setDeleteTarget(null);
    setDeleteBusy(false);
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>

      {/* Back */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-3)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
        padding: '0 0 20px',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Learning Plans
      </button>

      {/* Hero */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
        padding: '26px 28px', borderRadius: 24, marginBottom: 14,
        background: `linear-gradient(120deg, ${plan.color}2a, ${plan.color}14)`,
        border: `1px solid ${plan.color}40`,
      }}>
        <div style={{ position: 'relative', width: 120, height: 120, flex: '0 0 120px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke={plan.color} strokeWidth="9"
              strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset={ringDash}
              style={{ transition: 'stroke-dashoffset .8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{overallPct}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>complete</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: plan.color, marginBottom: 2 }}>
            {(TYPE_META[plan.type] || TYPE_META.other).label}
          </div>
          <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 30, margin: '4px 0 12px' }}>
            {plan.icon} {plan.title}
          </h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{coursesComplete}/{courses.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>courses done</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{doneSessions}/{totalSessions}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>sessions</div>
            </div>
            {startDate     && <div><div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{startDate}</div><div style={{ fontSize: 12, color: 'var(--text-3)' }}>started</div></div>}
            {estCompletion && <div><div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{estCompletion}</div><div style={{ fontSize: 12, color: 'var(--text-3)' }}>est. completion</div></div>}
            {examDate      && <div><div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{examDate}</div><div style={{ fontSize: 12, color: 'var(--text-3)' }}>exam date</div></div>}
            {completedDate && <div><div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, color: '#34d399' }}>{completedDate}</div><div style={{ fontSize: 12, color: 'var(--text-3)' }}>completed</div></div>}
          </div>
          {plan.description && <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '10px 0 0', lineHeight: 1.6 }}>{plan.description}</p>}
        </div>
      </div>

      {/* Scheduling note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--text-3)', marginBottom: 18, paddingLeft: 2 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        Smart scheduling · weekdays only (Mon–Fri) · missed sessions auto-push forward
      </div>

      {/* Today's study time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 14, background: `${plan.color}14`, border: `1px solid ${plan.color}30`, marginBottom: 18, fontSize: 13 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span style={{ color: 'var(--text-2)' }}>Today's study time</span>
        <strong style={{ fontSize: 15 }}>{fmtHoursMins(todayTotalAllCourses)}</strong>
        {activeTimer?.running && (
          <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: plan.color, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: plan.color, animation: 'om-pulse 1.4s infinite' }} />
            {courses.find(c => c.id === activeTimer.courseId)?.name} running
          </span>
        )}
      </div>

      {/* Import bar */}
      <div style={{ padding: 16, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 26 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 240,
            padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>
            </svg>
            <input value={importVal}
              onChange={e => { setImportVal(e.target.value); setImportErr(''); setImportResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handleAiExtract()}
              placeholder="Paste a course URL or name to import…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--text)' }}
            />
            {importVal && (
              <button onClick={() => { setImportVal(''); setImportResult(null); setImportErr(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <button onClick={handleAiExtract} disabled={!importVal.trim() || importing} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12,
            border: 'none', cursor: importVal.trim() && !importing ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff',
            opacity: importVal.trim() && !importing ? 1 : 0.5,
            background: 'linear-gradient(120deg,#6366f1,#a855f7)', transition: 'opacity .2s',
          }}>
            {importing
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ animation: 'om-spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l1.9 4.6L19 9l-4.6 1.9L12 16l-1.9-5.1L5 9l5.1-1.4z"/></svg>
            }
            {importing ? 'Extracting…' : 'Extract with AI'}
          </button>
          <button onClick={() => setShowManual(v => !v)} style={{
            padding: '11px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)',
            background: showManual ? 'var(--surface-2)' : 'transparent', border: '1px solid var(--border)',
          }}>+ Add manually</button>
        </div>

        {importErr && (() => {
          const isAmber = geminiQuotaExceeded || ollamaTimedOut;
          const borderCol = isAmber ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.2)';
          const textCol   = isAmber ? '#fcd34d' : '#fca5a5';
          const bgCol     = isAmber ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
          return (
            <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: `1px solid ${borderCol}` }}>
              <div style={{ padding: '10px 14px', fontSize: 13, color: textCol, background: bgCol, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ flex: 1, lineHeight: 1.55 }}>{importErr}</span>
                <button onClick={handleAiExtract} disabled={importing} style={{
                  padding: '5px 13px', borderRadius: 8, flexShrink: 0,
                  border: `1px solid ${isAmber ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  background: isAmber ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: textCol, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>↺ Retry</button>
              </div>

              {ollamaTimedOut && !geminiQuotaExceeded && (
                <div style={{ padding: '8px 14px', fontSize: 12.5, lineHeight: 1.6, background: 'rgba(245,158,11,0.06)', color: 'var(--text-2)', borderTop: `1px solid rgba(245,158,11,0.2)` }}>
                  <strong style={{ color: '#fcd34d' }}>Ollama is warming up</strong> — the model was loading into memory. Hit <strong>↺ Retry</strong> and it should respond now.
                </div>
              )}

              {geminiQuotaExceeded && (
                <div style={{ padding: '10px 14px', fontSize: 12.5, lineHeight: 1.6, background: 'rgba(245,158,11,0.06)', color: 'var(--text-2)', borderTop: `1px solid rgba(245,158,11,0.2)` }}>
                  <strong style={{ color: '#fcd34d' }}>Gemini free quota resets at midnight (ICT).</strong>
                  {' '}Orbitly will use <strong>Ollama</strong> automatically once it is running.
                  <br/>
                  <span style={{ color: 'var(--text-3)' }}>
                    Run: <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>ollama serve</code>
                    {' '}then <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>ollama pull gemma3:4b</code>
                    {' '}and hit <strong>↺ Retry</strong>.
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {importResult?.data && (() => {
          const d = importResult.data;
          const isBundle = d.type === 'bundle';
          const selCount = isBundle ? selectedCourses.size : 1;

          return (
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a5b4fc' }}>
                  AI extracted · via {importResult.source}
                </span>
                {isBundle && (
                  <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontWeight: 700 }}>
                    Bundle · {d.courses.length} courses
                  </span>
                )}
              </div>

              {/* Bundle name or single course */}
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: isBundle ? 12 : 4 }}>
                {isBundle ? d.bundle_name : d.name}
              </div>

              {/* Single course description */}
              {!isBundle && d.description && (
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>{d.description}</div>
              )}
              {!isBundle && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                  {d.sessions ?? 5} sessions · {phaseLabel(plan.id, d.phase ?? 0)}
                </div>
              )}

              {/* Bundle course list */}
              {isBundle && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {/* Select all / deselect all */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <button onClick={() => setSelectedCourses(
                      selectedCourses.size === d.courses.length ? new Set() : new Set(d.courses.map((_, i) => i))
                    )} style={{
                      fontSize: 12, padding: '3px 10px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: 600, border: '1px solid rgba(99,102,241,0.4)',
                      background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                    }}>
                      {selectedCourses.size === d.courses.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{selCount} of {d.courses.length} selected</span>
                  </div>

                  {/* Course rows */}
                  {d.courses.map((c, i) => {
                    const checked = selectedCourses.has(i);
                    return (
                      <div key={i} onClick={() => setSelectedCourses(prev => {
                        const next = new Set(prev);
                        checked ? next.delete(i) : next.add(i);
                        return next;
                      })} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: checked ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${checked ? 'rgba(99,102,241,0.35)' : 'var(--border)'}`,
                        transition: 'background .12s, border-color .12s',
                      }}>
                        {/* Checkbox */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          border: `2px solid ${checked ? '#6366f1' : 'var(--border-strong)'}`,
                          background: checked ? '#6366f1' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .12s',
                        }}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: checked ? 'var(--text)' : 'var(--text-2)', lineHeight: 1.3 }}>{c.name}</div>
                          {c.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{c.description}</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                          background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', whiteSpace: 'nowrap',
                        }}>{c.sessions ?? 5} sessions</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1 }} />
                <button onClick={() => { setImportResult(null); setImportVal(''); setSelectedCourses(new Set()); }} style={{
                  padding: '7px 14px', borderRadius: 9, background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                }}>Discard</button>
                <button onClick={handleAddImported} disabled={selCount === 0 || addingBundle} style={{
                  padding: '7px 18px', borderRadius: 9, border: 'none', cursor: selCount > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  background: selCount > 0 ? 'var(--accent)' : 'var(--surface-2)',
                  color: selCount > 0 ? '#fff' : 'var(--text-3)',
                  opacity: selCount > 0 && !addingBundle ? 1 : 0.6,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {addingBundle && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ animation: 'om-spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.2-8.6"/>
                    </svg>
                  )}
                  {addingBundle
                    ? 'Adding…'
                    : isBundle
                      ? `Add ${selCount} course${selCount !== 1 ? 's' : ''} to plan`
                      : 'Add to plan'}
                </button>
              </div>
            </div>
          );
        })()}

        {showManual && (
          <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 200px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5 }}>Course name</div>
              <input value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Advanced Prompt Engineering" style={inp} />
            </div>
            <div style={{ flex: '1 1 110px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5 }}>Phase</div>
              <select value={manualForm.phase} onChange={e => setManualForm(f => ({ ...f, phase: e.target.value }))}
                style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
                {manualPhaseOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5 }}>Sessions</div>
              <input type="number" min="1" max="20" value={manualForm.sessions}
                onChange={e => setManualForm(f => ({ ...f, sessions: e.target.value }))} style={inp} />
            </div>
            <div style={{ flex: '2 1 200px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5 }}>Course URL (optional)</div>
              <input type="url" value={manualForm.url} onChange={e => setManualForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://…" style={{ ...inp, boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleAddManual} disabled={!manualForm.name.trim()} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
              background: 'var(--accent)', color: '#fff', opacity: manualForm.name.trim() ? 1 : 0.45,
            }}>Add course</button>
            <button onClick={() => setShowManual(false)} style={{ padding: '10px 14px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Phases */}
      {shownPhases.map(pi => {
        const phaseCourses = courses.filter(c => c.phase === pi);
        return (
          <div key={pi} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)', margin: '0 0 14px' }}>
              {phaseLabel(plan.id, pi)}
            </h3>
            {phaseCourses.length === 0 ? (
              <div style={{ padding: '16px 20px', borderRadius: 14, border: '1px dashed var(--border)', color: 'var(--text-3)', fontSize: 13 }}>
                No courses in this phase yet — add one above.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
                {phaseCourses.map(c => {
                  const st  = courseStatus(c);
                  const pct = Math.round((c.done / c.total) * 100);
                  const isActive = c.done > 0 && c.done < c.total;
                  return (
                    <div key={c.id} style={{
                      background: 'var(--surface)',
                      border: `1px solid ${isActive ? `${plan.color}66` : 'var(--border)'}`,
                      borderRadius: 18, padding: 18,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>
                          {c.url
                            ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.color = plan.color}
                                onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                              >{c.name}</a>
                            : c.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 8,
                              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                              color: '#a5b4fc', textDecoration: 'none',
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </a>
                          )}
                          <button
                            onClick={() => handleTogglePin(c.id)}
                            title={pinnedCourses.includes(c.id) ? 'Unpin from Today Dashboard' : 'Pin to Today Dashboard'}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: pinnedCourses.includes(c.id) ? '#fcd34d' : 'var(--text-3)',
                              opacity: pinnedCourses.includes(c.id) ? 1 : 0.4,
                              transition: 'all 0.15s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => { if (!pinnedCourses.includes(c.id)) e.currentTarget.style.opacity = 0.8; }}
                            onMouseLeave={e => { if (!pinnedCourses.includes(c.id)) e.currentTarget.style.opacity = 0.4; }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={pinnedCourses.includes(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 99, whiteSpace: 'nowrap', background: st.pillBg, color: st.color }}>{st.label}</span>
                          <button onClick={() => setDeleteTarget(c)} title="Remove course" style={{
                            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
                            background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; e.currentTarget.style.color = '#fca5a5'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 9 }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: st.bar, transition: 'width .5s cubic-bezier(.3,.8,.4,1)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{c.done}/{c.total} sessions</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Next · {c.next}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => handleRemoveSession(c.id)} style={{
                          width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)',
                          border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>−</button>
                        <button onClick={() => handleAddSession(c.id)} style={{
                          flex: 1, height: 34, borderRadius: 10, background: 'var(--surface-2)',
                          border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = `${plan.color}28`}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        >Log a session +</button>
                        {c.nextISO && c.done < c.total && (
                          <button onClick={() => setMissedModal(c.id)} title="Missed — push forward 1 workday" style={{
                            width: 34, height: 34, borderRadius: 10, background: 'transparent',
                            border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#fca5a5'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
                          >✕</button>
                        )}
                      </div>
                      <CourseTimeTracker
                        course={c}
                        timer={activeTimer}
                        setting={getCourseSetting(c.id)}
                        onModeChange={mode => setCourseMode(c.id, mode)}
                        onDurationChange={min => setCourseDuration(c.id, min)}
                        onStart={() => startTimer(c.id)}
                        onPause={pauseTimer}
                        onReset={() => resetTimer(c.id)}
                        todaySeconds={getTodaySeconds(c.id)}
                        totalSeconds={getTotalSeconds(c.id)}
                        accent={plan.color}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Missed modal */}
      {missedModal && (() => {
        const c = courses.find(x => x.id === missedModal);
        const newDate = c?.nextISO ? fmtShortDate(addWorkdayToISO(c.nextISO)) : '';
        return (
          <div onClick={() => setMissedModal(null)} style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--surface-solid)', border: '1px solid var(--border-strong)',
              borderRadius: 22, padding: '30px 32px', maxWidth: 420, width: '90%', animation: 'om-fade-up .25s ease',
            }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>📅 Missed session?</div>
              <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: '0 0 6px' }}><strong style={{ color: 'var(--text)' }}>{c?.name}</strong></p>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 22px', lineHeight: 1.6 }}>
                Push this and all future sessions forward by <strong>1 workday</strong>?
                {newDate && <> Moves to <strong>{newDate}</strong>.</>}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleMissedConfirm} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: '#fff',
                }}>Push to next workday</button>
                <button onClick={() => setMissedModal(null)} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, background: 'transparent', color: 'var(--text-2)',
                }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Exam / Certificate section */}
      <div style={{
        marginTop: 8, padding: '24px 28px', borderRadius: 22,
        background: isPassed
          ? 'linear-gradient(120deg, rgba(16,185,129,0.12), rgba(52,211,153,0.06))'
          : 'linear-gradient(120deg, rgba(212,175,55,0.16), rgba(245,158,11,0.08))',
        border: `1px solid ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(212,175,55,0.3)'}`,
      }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flex: '0 0 56px',
            background: isPassed ? 'rgba(16,185,129,0.2)' : 'rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isPassed ? '#34d399' : '#e9c46a'} strokeWidth="1.8">
              <circle cx="12" cy="8" r="5"/>
              <path d="M8.2 12.5L7 22l5-2.5L17 22l-1.2-9.5"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 22, margin: 0 }}>{certName}</h3>
              {isPassed && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.16)', color: '#34d399' }}>PASSED</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {isPassed ? 'Certificate earned — well done!' : `Final milestone${examDate ? ` · scheduled ${examDate}` : ''}`}
            </div>

            {isPassed && (plan.cert_issued || plan.cert_number || plan.cert_issuer || plan.cert_url) && (
              <div style={{
                marginTop: 14, padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 24px',
              }}>
                {plan.cert_issued  && <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Issued</div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{plan.cert_issued}</div></div>}
                {plan.cert_number  && <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Certificate ID</div><div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{plan.cert_number}</div></div>}
                {plan.cert_issuer  && <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Issuer</div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{plan.cert_issuer}</div></div>}
                {plan.cert_expires && <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Expires</div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{plan.cert_expires}</div></div>}
                {plan.cert_url && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Credential URL</div>
                    <a href={plan.cert_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#a5b4fc', wordBreak: 'break-all' }}>{plan.cert_url}</a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            {!isPassed ? (
              <button onClick={handlePassExam} style={{
                padding: '13px 22px', borderRadius: 13, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                color: '#3a2e05', background: 'linear-gradient(120deg,#f0c869,#e9a23b)',
                boxShadow: '0 8px 22px rgba(212,175,55,0.3)',
              }}>Mark exam passed</button>
            ) : (
              <button onClick={() => setCertModal(true)} style={{
                padding: '11px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
              }}>{plan.cert_issued ? 'Edit Certificate' : 'Add Certificate Details'}</button>
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ModalBase onClose={() => { setDeleteTarget(null); setDeleteBusy(false); }} width={400}>
          <ModalHeader title="Remove Course?" onClose={() => { setDeleteTarget(null); setDeleteBusy(false); }} />
          <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.7 }}>
            Remove <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong> from this plan?
            {deleteTarget.done > 0 && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: 'var(--text-3)' }}>
                {deleteTarget.done} completed session{deleteTarget.done > 1 ? 's' : ''} will also be removed.
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setDeleteTarget(null); setDeleteBusy(false); }} style={{
              flex: 1, padding: '11px 0', borderRadius: 11, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
            }}>Cancel</button>
            <button onClick={handleDeleteCourse} disabled={deleteBusy} style={{
              flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
              background: 'rgba(239,68,68,0.9)', color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            }}>{deleteBusy ? 'Removing…' : 'Remove Course'}</button>
          </div>
        </ModalBase>
      )}

      {certModal && (
        <CertModal
          plan={plan}
          onClose={() => setCertModal(false)}
          onSave={updated => { onPlanUpdate(updated); setCertModal(false); }}
        />
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LearningPlanner() {
  const { state, dispatch } = useAppStore();
  const [plans,        setPlans]        = useState([]);
  const [books,        setBooks]        = useState([]);
  const [events,       setEvents]       = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const safe = fn => fn().catch(() => null);

    Promise.all([
      safe(() => api.getPlans()),
      safe(() => api.getCourses()),
      safe(() => api.getBooks()),
      safe(() => api.getLearningEvents()),
    ]).then(([planRows, courseRows, bookRows, eventRows]) => {
      if (planRows  !== null) setPlans(planRows);
      if (bookRows  !== null) setBooks(bookRows);
      if (eventRows !== null) setEvents(eventRows);
      // Only sync courses when the DB actually has rows — an empty response must
      // not wipe the CERT_COURSES fallback from the store's initial state.
      if (courseRows !== null && courseRows.length > 0) {
        dispatch({ type: 'SYNC_COURSES', courses: courseRows.map(rowToLocal) });
      }
    }).finally(() => setLoadingPlans(false));
  }, []);

  const courses = state.courses;

  // Route to the active plan's detail view
  if (activePlanId !== null) {
    const plan = plans.find(p => p.id === activePlanId);
    if (!plan) { setActivePlanId(null); return null; }

    const onPlanUpdate = updated => setPlans(ps => ps.map(p => p.id === updated.id ? updated : p));

    if (plan.type === 'reading') {
      const planBooks = books.filter(b => b.plan_id === plan.id);
      return (
        <ReadingPlanDetail
          plan={plan}
          books={planBooks}
          onBack={() => setActivePlanId(null)}
          onPlanUpdate={onPlanUpdate}
          onAddBook={book    => setBooks(bs => [...bs, book])}
          onUpdateBook={book => setBooks(bs => bs.map(b => b.id === book.id ? book : b))}
          onDeleteBook={id   => setBooks(bs => bs.filter(b => b.id !== id))}
        />
      );
    }

    return (
      <PlanDetail
        plan={plan}
        courses={courses.filter(c => (c.planId ?? 1) === activePlanId)}
        onBack={() => setActivePlanId(null)}
        onPlanUpdate={onPlanUpdate}
        dispatch={dispatch}
        state={state}
      />
    );
  }

  return (
    <PlansHub
      plans={plans}
      courses={courses}
      books={books}
      events={events}
      loading={loadingPlans}
      onOpen={setActivePlanId}
      onPlanCreated={plan    => setPlans(ps => [...ps, plan])}
      onPlanUpdated={updated => setPlans(ps => ps.map(p => p.id === updated.id ? updated : p))}
      onPlanDeleted={id      => setPlans(ps => ps.filter(p => p.id !== id))}
      onEventCreated={ev     => setEvents(es => [...es, ev])}
      onEventUpdated={ev     => setEvents(es => es.map(e => e.id === ev.id ? ev : e))}
      onEventDeleted={id     => setEvents(es => es.filter(e => e.id !== id))}
    />
  );
}
