import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { api } from '../../api/client';
import CheckRow from '../ui/CheckRow';
import EmojiPicker from '../ui/EmojiPicker';

// ── Constants ─────────────────────────────────────────────────────────────────

const HOME_EMOJIS = ['🏠','🔧','🧹','🪴','🚿','🧯','🔥','🪟','🧺','🐛','🚪','🛠️','🌡️','❄️','🚽','🧴','🪣','🧽','🔌','🎨'];

const APP_TODAY_ISO = '2026-06-17';
const TODAY = new Date(APP_TODAY_ISO);

const FREQ_OPTIONS = [
  { label: 'Weekly',         days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly',       days: 30 },
  { label: 'Every 2 months',days: 60 },
  { label: 'Every 3 months',days: 90 },
  { label: 'Every 6 months',days: 180 },
  { label: 'Yearly',        days: 365 },
];

const SHOP_CATS = ['Groceries', 'Household', 'Personal', 'Pharmacy', 'Other'];

const SHOP_CAT_STYLE = {
  Groceries: { bg: 'rgba(16,185,129,0.13)',  color: '#6ee7b7' },
  Household: { bg: 'rgba(99,102,241,0.13)',  color: '#a5b4fc' },
  Personal:  { bg: 'rgba(245,158,11,0.13)', color: '#fcd34d' },
  Pharmacy:  { bg: 'rgba(239,68,68,0.13)',   color: '#fca5a5' },
  Other:     { bg: 'rgba(148,163,184,0.1)',  color: '#cbd5e1' },
};

const BLANK_CHORE = { name: '', emoji: '🏠', category: '', frequencyDays: 90, lastDone: '', notes: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(isoStr) {
  if (!isoStr) return null;
  const target = new Date(isoStr);
  return Math.round((target - TODAY) / 86400000);
}

function nextDueISO(lastDone, freqDays) {
  if (!lastDone) return null;
  const d = new Date(lastDone);
  d.setDate(d.getDate() + freqDays);
  return d.toISOString().slice(0, 10);
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const [, m, d] = isoStr.split('-');
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${mons[parseInt(m) - 1]}`;
}

function freqLabel(days) {
  return FREQ_OPTIONS.find(f => f.days === days)?.label ?? `Every ${days}d`;
}

function urgency(days) {
  if (days === null) return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#fca5a5', label: 'Never done', dot: '#ef4444' };
  if (days < 0)     return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#fca5a5', label: `${Math.abs(days)}d overdue`, dot: '#ef4444' };
  if (days === 0)   return { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.3)', color: '#fcd34d', label: 'Due today', dot: '#f59e0b' };
  if (days <= 7)    return { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)', color: '#fcd34d', label: `in ${days}d`, dot: '#f59e0b' };
  return { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.18)', color: '#94a3b8', label: `in ${days}d`, dot: '#64748b' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChoreRow({ chore, onDone, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const due = nextDueISO(chore.lastDone, chore.frequencyDays);
  const days = daysUntil(due);
  const u = urgency(days);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 14,
        background: hov ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${u.dot}`,
        transition: 'background .15s',
        marginLeft: -3,
      }}
    >
      {/* Emoji */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: u.bg, border: `1px solid ${u.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {chore.emoji || '🏠'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{chore.name}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
            background: 'var(--surface-2)', color: 'var(--text-3)',
          }}>
            {freqLabel(chore.frequencyDays)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Last done: {chore.lastDone ? fmtDate(chore.lastDone) : 'Never'}</span>
          {due && <span>· Next: {fmtDate(due)}</span>}
          {chore.notes && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>· {chore.notes}</span>}
        </div>
      </div>

      {/* Urgency badge */}
      <div style={{
        padding: '4px 10px', borderRadius: 8, flexShrink: 0,
        background: u.bg, border: `1px solid ${u.border}`,
        fontSize: 11.5, fontWeight: 700, color: u.color,
      }}>
        {u.label}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, opacity: hov ? 1 : 0, transition: 'opacity .15s' }}>
        <button
          onClick={onDone}
          title="Mark done today"
          style={{
            padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
            background: 'rgba(16,185,129,0.16)', color: '#6ee7b7',
          }}
        >✓ Done</button>
        <button
          onClick={onEdit}
          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          onClick={onDelete}
          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function ChoreGroup({ label, items, color, onDone, onEdit, onDelete }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 4px', marginBottom: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({items.length})</span>
      </div>
      {items.map(c => (
        <ChoreRow
          key={c.id}
          chore={c}
          onDone={() => onDone(c.id)}
          onEdit={() => onEdit(c)}
          onDelete={() => onDelete(c.id)}
        />
      ))}
    </div>
  );
}

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 11, fontSize: 13.5,
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

function ChoreModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || BLANK_CHORE);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      frequencyDays: Number(form.frequencyDays),
      lastDone: form.lastDone || null,
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, margin: 16,
        background: 'var(--surface-solid)', borderRadius: 22,
        border: '1px solid var(--border)', padding: 28,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 22 }}>
          {initial ? 'Edit Task' : 'Add Maintenance Task'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 5 }}>TASK NAME *</div>
            <input autoFocus style={INP} placeholder="e.g. AC Cleaning" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 5 }}>EMOJI</div>
            <EmojiPicker options={HOME_EMOJIS} value={form.emoji} onChange={v => set('emoji', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 5 }}>CATEGORY</div>
              <input style={INP} placeholder="e.g. Cooling, Water" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 5 }}>FREQUENCY *</div>
              <select style={{ ...INP, appearance: 'none' }} value={form.frequencyDays} onChange={e => set('frequencyDays', e.target.value)}>
                {FREQ_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 5 }}>LAST COMPLETED</div>
            <input type="date" style={INP} value={form.lastDone || ''} onChange={e => set('lastDone', e.target.value)} />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 5 }}>NOTES</div>
            <textarea style={{ ...INP, resize: 'vertical', minHeight: 60 }} placeholder="Optional reminder or instructions…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 11, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600 }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            style={{ padding: '10px 22px', borderRadius: 11, border: 'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, background: 'var(--accent)', color: '#fff', opacity: form.name.trim() ? 1 : 0.5 }}
          >Save Task</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeManagement() {
  const { state, dispatch } = useAppStore();
  const mob = state.isMobile;
  const [choreModal, setChoreModal] = useState(null); // null | 'new' | chore-object
  const [shopInput, setShopInput] = useState('');
  const [shopCat, setShopCat] = useState('');
  const [shopFilter, setShopFilter] = useState('All');

  // ── Chore stats
  const choresWithDue = state.choreList.map(c => ({
    ...c,
    due: nextDueISO(c.lastDone, c.frequencyDays),
    days: daysUntil(nextDueISO(c.lastDone, c.frequencyDays)),
  }));
  const overdue  = choresWithDue.filter(c => c.days === null || c.days < 0);
  const dueSoon  = choresWithDue.filter(c => c.days !== null && c.days >= 0 && c.days <= 7);
  const upcoming = choresWithDue.filter(c => c.days !== null && c.days > 7);

  // ── Shopping stats
  const shopFiltered = shopFilter === 'All'
    ? state.shopList
    : state.shopList.filter(i => (i.category || 'Other') === shopFilter);
  const shopDone = state.shopList.filter(i => i.done).length;

  // ── Handlers: chores
  function handleSaveChore(fields) {
    if (choreModal === 'new') {
      dispatch({ type: 'ADD_CHORE', chore: fields });
    } else {
      dispatch({ type: 'EDIT_CHORE', id: choreModal.id, fields });
    }
    setChoreModal(null);
  }

  function handleDone(id) {
    dispatch({ type: 'COMPLETE_CHORE', id });
  }

  function handleDeleteChore(id) {
    dispatch({ type: 'DELETE_CHORE', id });
  }

  // ── Handlers: shopping
  async function handleAddShop() {
    const v = shopInput.trim();
    if (!v) return;
    setShopInput('');
    const cat = shopCat || undefined;
    try {
      const row = await api.addShopItem(v);
      dispatch({ type: 'ADD_SHOP', shopItem: { ...row, category: cat } });
    } catch {
      dispatch({ type: 'ADD_SHOP', shopItem: { id: 's' + Date.now(), item: v, done: false, category: cat } });
    }
  }

  function handleToggleShop(id, done) {
    dispatch({ type: 'TOGGLE_SHOP', id });
    api.toggleShopItem(id, !done).catch(() => {});
  }

  function handleDeleteShop(id) {
    dispatch({ type: 'DELETE_SHOP', id });
    api.deleteShopItem?.(id).catch?.(() => {});
  }

  function handleClearDone() {
    dispatch({ type: 'CLEAR_DONE_SHOP' });
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 34px 60px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 30, margin: '0 0 5px' }}>Home Management</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>Maintenance tasks & shopping — shareable with your family when connected.</p>
        </div>
        <button
          onClick={() => setChoreModal('new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            background: 'var(--accent)', color: '#fff',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Task
        </button>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Overdue',     value: overdue.length,  bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  color: '#fca5a5' },
          { label: 'Due this week', value: dueSoon.length, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)', color: '#fcd34d' },
          { label: 'Upcoming',    value: upcoming.length,  bg: 'var(--surface)',         border: 'var(--border)',          color: 'var(--text-2)' },
          { label: 'Shopping items', value: state.shopList.filter(i => !i.done).length, bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', color: '#a5b4fc' },
        ].map(p => (
          <div key={p.label} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 16px', borderRadius: 12,
            background: p.bg, border: `1px solid ${p.border}`,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.value}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(12, 1fr)', gap: mob ? 14 : 18, alignItems: 'start' }}>

        {/* ── MAINTENANCE TASKS ── */}
        <section style={{
          gridColumn: mob ? 'span 1' : 'span 7',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 20 }}>🔧</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Maintenance Tasks</span>
            </div>
            <button
              onClick={() => setChoreModal('new')}
              style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >+ Add</button>
          </div>

          {state.choreList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>No tasks yet</div>
              <div style={{ fontSize: 13 }}>Add your first recurring maintenance task above.</div>
            </div>
          ) : (
            <div>
              <ChoreGroup label="Overdue" items={overdue}  color="#ef4444" onDone={handleDone} onEdit={setChoreModal} onDelete={handleDeleteChore} />
              <ChoreGroup label="Due this week" items={dueSoon}  color="#f59e0b" onDone={handleDone} onEdit={setChoreModal} onDelete={handleDeleteChore} />
              <ChoreGroup label="Upcoming" items={upcoming} color="#64748b" onDone={handleDone} onEdit={setChoreModal} onDelete={handleDeleteChore} />
            </div>
          )}
        </section>

        {/* ── SHOPPING LIST ── */}
        <section style={{
          gridColumn: mob ? 'span 1' : 'span 5',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 24,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 20 }}>🛒</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Shopping List</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{shopDone}/{state.shopList.length} done</span>
          </div>

          {/* Share badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
            padding: '6px 11px', borderRadius: 8, width: 'fit-content',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#a5b4fc' }}>Shared when partner connects</span>
          </div>

          {/* Category filter */}
          {state.shopList.some(i => i.category) && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {['All', ...SHOP_CATS].map(cat => (
                <button
                  key={cat}
                  onClick={() => setShopFilter(cat)}
                  style={{
                    padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600,
                    background: shopFilter === cat ? 'var(--accent)' : 'var(--surface-2)',
                    color: shopFilter === cat ? '#fff' : 'var(--text-3)',
                  }}
                >{cat}</button>
              ))}
            </div>
          )}

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14, minHeight: 40 }}>
            {shopFiltered.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                {shopFilter !== 'All' ? `No ${shopFilter} items` : 'List is empty — add something below'}
              </div>
            ) : shopFiltered.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <CheckRow
                    done={item.done}
                    onToggle={() => handleToggleShop(item.id, item.done)}
                    label={item.item}
                    accent="var(--accent)"
                  />
                </div>
                {item.category && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, flexShrink: 0,
                    ...(SHOP_CAT_STYLE[item.category] || SHOP_CAT_STYLE.Other),
                  }}>{item.category}</span>
                )}
                <button
                  onClick={() => handleDeleteShop(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, opacity: 0.5, flexShrink: 0 }}
                  title="Remove"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={shopInput}
                onChange={e => setShopInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddShop()}
                placeholder="Add item…"
                style={{
                  flex: 1, padding: '10px 13px', borderRadius: 11, fontSize: 13.5,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={handleAddShop}
                style={{ padding: '10px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: '#fff' }}
              >+</button>
            </div>
            <select
              value={shopCat}
              onChange={e => setShopCat(e.target.value)}
              style={{
                padding: '8px 11px', borderRadius: 9, fontSize: 12.5,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: shopCat ? 'var(--text)' : 'var(--text-3)', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="">Category (optional)</option>
              {SHOP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Clear done */}
          {shopDone > 0 && (
            <button
              onClick={handleClearDone}
              style={{
                marginTop: 14, width: '100%', padding: '9px', borderRadius: 11,
                border: '1px dashed var(--border)', background: 'transparent',
                color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Clear {shopDone} completed item{shopDone !== 1 ? 's' : ''}
            </button>
          )}
        </section>

      </div>

      {/* Chore modal */}
      {choreModal && (
        <ChoreModal
          initial={choreModal === 'new' ? null : choreModal}
          onSave={handleSaveChore}
          onClose={() => setChoreModal(null)}
        />
      )}
    </div>
  );
}
