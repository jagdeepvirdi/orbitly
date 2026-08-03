import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import { APP_TODAY } from '../../utils/dateUtils';
import EmojiPicker from '../ui/EmojiPicker';
import { currencySymbol, currencyFlag, DEFAULT_CURRENCIES } from '../../data/currencies';
import {
  fmtAmount, fmtCycle, thisMonthAmount,
  daysUntilDay, nextDateForDay, nextBillingDate, daysUntilBilling,
  fmtDate, dueBadge, normSub, normLoan, normInsurance, normCC, normBill,
} from '../../utils/financeUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const FINANCE_EMOJIS = ['💳','💰','📦','🏦','📱','💡','🎬','🎵','📺','🛒','🏠','🚗','⚡','💧','🌐','📞','🎮','🛡️','📋','💸'];

const CURR_MONTH = APP_TODAY.toISOString().slice(0, 7);

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
// Ensures an item's existing currency is always selectable even if it's since
// been removed from the user's profile — prevents silently reassigning it on save.
function withCurrentCurrency(list, current) {
  return current && !list.includes(current) ? [current, ...list] : list;
}

// ─── Shared UI ──────────────────────────────────────────────────────────────────

function TabPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 13, fontWeight: 700,
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'rgba(99,102,241,0.16)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-3)', transition: 'all .15s',
    }}>{label}</button>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 12, fontWeight: 700,
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-3)',
    }}>{label}</button>
  );
}

function DueBadge({ days }) {
  const b = dueBadge(days);
  return (
    <div style={{ textAlign: 'right', minWidth: 52, flex: '0 0 auto' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 12.5, fontWeight: 800, background: b.bg, color: b.color }}>
        {b.label}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 }}>
        {days === 0 ? 'due today' : 'away'}
      </div>
    </div>
  );
}

function PaidToggle({ id, type, paid, onToggle }) {
  return (
    <button onClick={() => onToggle(type, id)} style={{
      marginTop: 8, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, border: 'none',
      background: paid ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
      color: paid ? '#34d399' : 'var(--text-3)',
    }}>
      {paid ? '✓ Marked paid' : 'Mark as paid'}
    </button>
  );
}

function DeleteBtn({ onDelete }) {
  return (
    <button onClick={onDelete} title="Delete" style={{
      width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)',
      background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  );
}

function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
      background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.3)',
      color: '#a5b4fc', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
      {label}
    </button>
  );
}

const INP = {
  width: '100%', padding: '9px 12px', borderRadius: 10, boxSizing: 'border-box',
  background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
  color: 'var(--text)', fontFamily: 'inherit', fontSize: 13.5, outline: 'none',
};
const SEL = { ...INP, appearance: 'none' };

function ModalOverlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-solid)', border: '1px solid var(--border-strong)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      {children}
    </div>
  );
}

function ModalActions({ onCancel, submitLabel = 'Save' }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>Cancel</button>
      <button type="submit" style={{ flex: 2, padding: '11px 0', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700 }}>{submitLabel}</button>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5 }}>
      No {label} yet · click "+ Add" to get started
    </div>
  );
}

// ─── Tab 1 — Subscriptions ──────────────────────────────────────────────────────

const CAT_COLORS = { streaming: '#a5b4fc', music: '#f9a8d4', cloud: '#67e8f9', internet: '#6ee7b7', ai: '#c4b5fd' };
const SUB_CATS   = ['streaming', 'music', 'cloud', 'internet', 'ai', 'other'];

function SubCard({ sub, paid, onToggle, onDelete, onEdit }) {
  const days = daysUntilBilling(sub);
  const date = nextBillingDate(sub);
  const catColor = CAT_COLORS[sub.cat] || '#a6a6b8';
  return (
    <div style={{ borderRadius: 18, padding: '16px 18px', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, flex: '0 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: 'var(--surface-2)' }}>
          {sub.emoji || '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{sub.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', color: catColor, textTransform: 'capitalize' }}>{sub.cat}</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub.country === 'IN' ? '🇮🇳' : sub.country === 'TH' ? '🇹🇭' : '🌐'}</span>
          </div>
          {sub.startDate && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Since {fmtDate(new Date(sub.startDate + 'T00:00:00'))}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditBtn onEdit={onEdit} />
          <DeleteBtn onDelete={onDelete} />
          <DueBadge days={days} />
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{fmtAmount(sub.amount, sub.currency)}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginLeft: 3 }}>{fmtCycle(sub.cycle)}</span></div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
            {sub.cycle === 'yearly'
              ? `Renews annually · next ${fmtDate(date)}`
              : `Bills on ${ordinal(sub.billingDay)} · next ${fmtDate(date)}`}
          </div>
        </div>
        <PaidToggle id={sub.id} type="subscription" paid={paid} onToggle={onToggle} />
      </div>
    </div>
  );
}

function SubModal({ onClose, existing, onSaved, userCurrencies }) {
  const isEdit = !!existing;
  const [f, setF] = useState(isEdit
    ? { name: existing.name, cat: existing.cat, emoji: existing.emoji || '📦', amount: String(existing.amount), currency: existing.currency, billing_day: String(existing.billingDay), cycle: existing.cycle, country: existing.country, start_date: existing.startDate || '' }
    : { name: '', cat: 'streaming', emoji: '📦', amount: '', currency: userCurrencies[0] || 'INR', billing_day: '1', cycle: 'monthly', country: 'GLOBAL', start_date: '' }
  );
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.billing_day) return;
    const body = { ...f, amount: Number(f.amount), billing_day: Number(f.billing_day), start_date: f.start_date || null };
    const row = isEdit
      ? await api.updateSubscription(existing.id, body)
      : await api.createSubscription(body);
    onSaved(normSub(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{isEdit ? 'Edit Subscription' : 'Add Subscription'}</div>
        <Field label="Name *"><input autoFocus style={INP} placeholder="Netflix, Spotify…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <Field label="Emoji"><EmojiPicker options={FINANCE_EMOJIS} value={f.emoji} onChange={v => setF(x=>({...x,emoji:v}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Category">
            <select style={SEL} value={f.cat} onChange={e => setF(x=>({...x,cat:e.target.value}))}>
              {SUB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input type="number" min="0" step="any" style={INP} placeholder="0.00" value={f.amount} onChange={e => setF(x=>({...x,amount:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {withCurrentCurrency(userCurrencies, f.currency).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Billing day">
            <input type="number" min="1" max="31" style={INP} value={f.billing_day} onChange={e => setF(x=>({...x,billing_day:e.target.value}))} />
          </Field>
          <Field label="Cycle">
            <select style={SEL} value={f.cycle} onChange={e => setF(x=>({...x,cycle:e.target.value}))}>
              <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Country">
            <select style={SEL} value={f.country} onChange={e => setF(x=>({...x,country:e.target.value}))}>
              <option value="IN">🇮🇳 India</option><option value="TH">🇹🇭 Thailand</option><option value="GLOBAL">🌐 Global</option>
            </select>
          </Field>
          <Field label="Start date (optional)">
            <input type="date" style={INP} value={f.start_date} onChange={e => setF(x=>({...x,start_date:e.target.value}))} />
          </Field>
        </div>
        <ModalActions onCancel={onClose} submitLabel={isEdit ? 'Save changes' : 'Add subscription'} />
      </form>
    </ModalOverlay>
  );
}

function SubscriptionsTab({ subs, setSubs, paid, onToggle, loading, userCurrencies }) {
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'add' | <sub object for edit>

  async function handleDelete(id) {
    if (!confirm('Delete this subscription?')) return;
    await api.deleteSubscription(id);
    setSubs(s => s.filter(x => x.id !== id));
  }

  function handleSaved(updated) {
    setSubs(s => {
      const idx = s.findIndex(x => x.id === updated.id);
      if (idx === -1) return [...s, updated];
      const next = [...s];
      next[idx] = updated;
      return next;
    });
  }

  const filtered = filter === 'all' ? subs : subs.filter(s => s.country === filter);
  const sorted   = [...filtered].map(s => ({ ...s, _days: daysUntilBilling(s) })).sort((a, b) => a._days - b._days);
  const total    = {};
  subs.forEach(s => { total[s.currency] = (total[s.currency] || 0) + thisMonthAmount(s.amount, s.cycle, nextBillingDate(s)); });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {userCurrencies.filter(cur => total[cur] > 0).map(cur => (
            <div key={cur} style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
              {currencyFlag(cur)} {currencySymbol(cur)}{Math.round(total[cur] || 0).toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>this month</span>
            </div>
          ))}
        </div>
        <AddBtn onClick={() => setModal('add')} label="Add subscription" />
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
        <FilterPill label={`All (${subs.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterPill label="🇮🇳 India" active={filter === 'IN'}     onClick={() => setFilter('IN')} />
        <FilterPill label="🇹🇭 Thailand" active={filter === 'TH'} onClick={() => setFilter('TH')} />
        <FilterPill label="🌐 Global" active={filter === 'GLOBAL'} onClick={() => setFilter('GLOBAL')} />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="subscriptions" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 12 }}>
          {sorted.map(s => (
            <SubCard key={s.id} sub={s} paid={!!paid[`subscription:${s.id}`]} onToggle={onToggle}
              onDelete={() => handleDelete(s.id)} onEdit={() => setModal(s)} />
          ))}
        </div>
      )}
      {modal && (
        <SubModal
          onClose={() => setModal(null)}
          existing={modal === 'add' ? null : modal}
          onSaved={handleSaved}
          userCurrencies={userCurrencies}
        />
      )}
    </div>
  );
}

// ─── Tab 2 — Loans & EMIs ───────────────────────────────────────────────────────

function LoanCard({ loan, paid, onToggle, onDelete, onEdit }) {
  const days = daysUntilDay(loan.dueDay);
  const date = nextDateForDay(loan.dueDay);
  return (
    <div style={{ borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border)', background: 'var(--surface)', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flex: '0 0 42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'rgba(99,102,241,0.12)' }}>{loan.emoji || '🏦'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{loan.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{loan.bank}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditBtn onEdit={onEdit} />
          <DeleteBtn onDelete={onDelete} />
          <DueBadge days={days} />
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtAmount(loan.emi, loan.currency)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>EMI due on {ordinal(loan.dueDay)} · next {fmtDate(date)}</div>
        </div>
        <PaidToggle id={loan.id} type="loan" paid={paid} onToggle={onToggle} />
      </div>
    </div>
  );
}

function LoanModal({ onClose, existing, onSaved, userCurrencies }) {
  const isEdit = !!existing;
  const [f, setF] = useState(isEdit
    ? { name: existing.name, bank: existing.bank, emi: String(existing.emi), currency: existing.currency, due_day: String(existing.dueDay), emoji: existing.emoji || '🏦' }
    : { name: '', bank: '', emi: '', currency: userCurrencies[0] || 'INR', due_day: '5', emoji: '🏦' }
  );
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    const body = { ...f, emi: Number(f.emi), due_day: Number(f.due_day) };
    const row = isEdit ? await api.updateLoan(existing.id, body) : await api.createLoan(body);
    onSaved(normLoan(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{isEdit ? 'Edit Loan / EMI' : 'Add Loan / EMI'}</div>
        <Field label="Loan name *"><input autoFocus style={INP} placeholder="Home loan, Car loan…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <Field label="Bank / Lender"><input style={INP} placeholder="HDFC, ICICI…" value={f.bank} onChange={e => setF(x=>({...x,bank:e.target.value}))} /></Field>
        <Field label="Emoji"><EmojiPicker options={FINANCE_EMOJIS} value={f.emoji} onChange={v => setF(x=>({...x,emoji:v}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="EMI amount">
            <input type="number" min="0" step="any" style={INP} placeholder="0.00" value={f.emi} onChange={e => setF(x=>({...x,emi:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {withCurrentCurrency(userCurrencies, f.currency).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Due day">
            <input type="number" min="1" max="31" style={INP} value={f.due_day} onChange={e => setF(x=>({...x,due_day:e.target.value}))} />
          </Field>
        </div>
        <ModalActions onCancel={onClose} submitLabel={isEdit ? 'Save changes' : 'Add loan'} />
      </form>
    </ModalOverlay>
  );
}

function LoansTab({ loans, setLoans, paid, onToggle, loading, userCurrencies }) {
  const [modal, setModal] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Delete this loan?')) return;
    await api.deleteLoan(id);
    setLoans(l => l.filter(x => x.id !== id));
  }

  function handleSaved(updated) {
    setLoans(l => {
      const idx = l.findIndex(x => x.id === updated.id);
      if (idx === -1) return [...l, updated];
      const next = [...l]; next[idx] = updated; return next;
    });
  }

  const sorted = [...loans].map(l => ({ ...l, _days: daysUntilDay(l.dueDay) })).sort((a, b) => a._days - b._days);
  const totalEMI = loans.reduce((s, l) => s + Number(l.emi || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ padding: '10px 18px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--text-3)' }}>Total monthly EMI</span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>₹{totalEMI.toLocaleString()}</span>
        </div>
        <AddBtn onClick={() => setModal('add')} label="Add loan" />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="loans" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12 }}>
          {sorted.map(l => (
            <LoanCard key={l.id} loan={l} paid={!!paid[`loan:${l.id}`]} onToggle={onToggle}
              onDelete={() => handleDelete(l.id)} onEdit={() => setModal(l)} />
          ))}
        </div>
      )}
      {modal && <LoanModal onClose={() => setModal(null)} existing={modal === 'add' ? null : modal} onSaved={handleSaved} userCurrencies={userCurrencies} />}
    </div>
  );
}

// ─── Tab 3 — Credit Cards ───────────────────────────────────────────────────────

function EditBtn({ onEdit }) {
  return (
    <button onClick={onEdit} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H3v-2L11.5 2.5z"/>
      </svg>
    </button>
  );
}

function CCCard({ cc, paid, onToggle, onDelete, onEdit }) {
  const stmtDays = daysUntilDay(cc.statementDay);
  const dueDays  = daysUntilDay(cc.dueDay);
  const stmtDate = nextDateForDay(cc.statementDay);
  const dueDate  = nextDateForDay(cc.dueDay);
  return (
    <div style={{ borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border)', background: 'var(--surface)', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flex: '0 0 42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'rgba(168,85,247,0.12)' }}>{cc.emoji || '💳'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{cc.bank}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{cc.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditBtn onEdit={onEdit} />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Statement generated</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{ordinal(cc.statementDay)} · {fmtDate(stmtDate)}</div>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, padding: '2px 10px', borderRadius: 99, background: dueBadge(stmtDays).bg, color: dueBadge(stmtDays).color }}>
            {stmtDays === 0 ? 'Today' : `${stmtDays}d`}
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Payment due</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{ordinal(cc.dueDay)} · {fmtDate(dueDate)}</div>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, padding: '2px 10px', borderRadius: 99, background: dueBadge(dueDays).bg, color: dueBadge(dueDays).color }}>
            {dueDays === 0 ? 'Today' : `${dueDays}d`}
          </div>
        </div>
      </div>
      <PaidToggle id={cc.id} type="credit_card" paid={paid} onToggle={onToggle} />
    </div>
  );
}

function CCModal({ onClose, existing, onSaved, userCurrencies }) {
  const isEdit = !!existing;
  const [f, setF] = useState(isEdit
    ? { name: existing.name, bank: existing.bank, statement_day: String(existing.statementDay), due_day: String(existing.dueDay), currency: existing.currency, emoji: existing.emoji || '💳' }
    : { name: '', bank: '', statement_day: '1', due_day: '20', currency: userCurrencies[0] || 'INR', emoji: '💳' }
  );
  async function submit(e) {
    e.preventDefault();
    if (!f.bank.trim()) return;
    const body = { ...f, statement_day: Number(f.statement_day), due_day: Number(f.due_day) };
    const row = isEdit ? await api.updateCreditCard(existing.id, body) : await api.createCreditCard(body);
    onSaved(normCC(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{isEdit ? 'Edit Credit Card' : 'Add Credit Card'}</div>
        <Field label="Bank *"><input autoFocus style={INP} placeholder="HDFC, ICICI, SBI…" value={f.bank} onChange={e => setF(x=>({...x,bank:e.target.value}))} /></Field>
        <Field label="Card name"><input style={INP} placeholder="Regalia, Diners…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <Field label="Emoji"><EmojiPicker options={FINANCE_EMOJIS} value={f.emoji} onChange={v => setF(x=>({...x,emoji:v}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Statement day">
            <input type="number" min="1" max="31" style={INP} value={f.statement_day} onChange={e => setF(x=>({...x,statement_day:e.target.value}))} />
          </Field>
          <Field label="Due day">
            <input type="number" min="1" max="31" style={INP} value={f.due_day} onChange={e => setF(x=>({...x,due_day:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {withCurrentCurrency(userCurrencies, f.currency).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <ModalActions onCancel={onClose} submitLabel={isEdit ? 'Save changes' : 'Add card'} />
      </form>
    </ModalOverlay>
  );
}

function CreditCardsTab({ cards, setCards, paid, onToggle, loading, userCurrencies }) {
  const [modal, setModal] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Delete this credit card?')) return;
    await api.deleteCreditCard(id);
    setCards(c => c.filter(x => x.id !== id));
  }

  function handleSaved(updated) {
    setCards(c => {
      const idx = c.findIndex(x => x.id === updated.id);
      if (idx === -1) return [...c, updated];
      const next = [...c]; next[idx] = updated; return next;
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <AddBtn onClick={() => setModal('add')} label="Add card" />
      </div>
      {loading ? <LoadingSkel /> : cards.length === 0 ? <EmptyState label="credit cards" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12 }}>
          {cards.map(cc => (
            <CCCard key={cc.id} cc={cc} paid={!!paid[`credit_card:${cc.id}`]} onToggle={onToggle}
              onDelete={() => handleDelete(cc.id)} onEdit={() => setModal(cc)} />
          ))}
        </div>
      )}
      {modal && <CCModal onClose={() => setModal(null)} existing={modal === 'add' ? null : modal} onSaved={handleSaved} userCurrencies={userCurrencies} />}
    </div>
  );
}

// ─── Tab 4 — Bills ──────────────────────────────────────────────────────────────

const BILL_TYPES  = ['phone', 'utility', 'internet', 'other'];
const BILL_LABELS = { phone: 'Phone', utility: 'Utility', internet: 'Internet', other: 'Other' };

function BillCard({ bill, paid, onToggle, onDelete, onEdit }) {
  const isRecurring = bill.cycle !== 'monthly';
  const dueDays = daysUntilBilling(bill, 'dueDay');
  const dueDate = nextBillingDate(bill, 'dueDay');
  const genDays = isRecurring ? null : daysUntilDay(bill.generationDay);
  const genDate = isRecurring ? null : nextDateForDay(bill.generationDay);
  return (
    <div style={{ borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border)', background: 'var(--surface)', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flex: '0 0 42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: 'var(--surface-2)' }}>
          {bill.emoji || '📋'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{bill.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{BILL_LABELS[bill.type] || bill.type}</span>
            <span style={{ fontSize: 12 }}>{bill.country === 'IN' ? '🇮🇳' : '🇹🇭'}</span>
            {bill.amount && <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtAmount(bill.amount, bill.currency)}{fmtCycle(bill.cycle)}</span>}
            {isRecurring && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(168,85,247,0.14)', color: '#d8b4fe', textTransform: 'capitalize' }}>{bill.cycle}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditBtn onEdit={onEdit} />
          <DeleteBtn onDelete={onDelete} />
          <DueBadge days={dueDays} />
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 12 }}>
        {isRecurring ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-3)' }}>Renews {bill.cycle}</span>
            <span style={{ fontWeight: 600, color: dueDays <= 5 ? '#fca5a5' : 'inherit' }}>{fmtDate(dueDate)} <span style={{ color: 'var(--text-3)' }}>({dueDays}d)</span></span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-3)' }}>Bill generated</span>
              <span style={{ fontWeight: 600 }}>{ordinal(bill.generationDay)} · {fmtDate(genDate)} <span style={{ color: 'var(--text-3)' }}>({genDays}d)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-3)' }}>Payment due</span>
              <span style={{ fontWeight: 600, color: dueDays <= 5 ? '#fca5a5' : 'inherit' }}>{ordinal(bill.dueDay)} · {fmtDate(dueDate)}</span>
            </div>
          </>
        )}
      </div>
      <PaidToggle id={bill.id} type="bill" paid={paid} onToggle={onToggle} />
    </div>
  );
}

function BillModal({ onClose, existing, onSaved, userCurrencies }) {
  const isEdit = !!existing;
  const [f, setF] = useState(isEdit
    ? { name: existing.name, country: existing.country, type: existing.type, emoji: existing.emoji || '📋', generation_day: existing.generationDay != null ? String(existing.generationDay) : '1', due_day: existing.dueDay != null ? String(existing.dueDay) : '10', amount: existing.amount != null ? String(existing.amount) : '', currency: existing.currency, cycle: existing.cycle || 'monthly', start_date: existing.startDate || '' }
    : { name: '', country: 'IN', type: 'utility', emoji: '📋', generation_day: '1', due_day: '10', amount: '', currency: userCurrencies[0] || 'INR', cycle: 'monthly', start_date: '' }
  );
  const isRecurring = f.cycle !== 'monthly';
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    if (isRecurring && !f.start_date) return;
    const body = {
      ...f,
      amount: f.amount ? Number(f.amount) : null,
      generation_day: isRecurring ? null : Number(f.generation_day),
      due_day:        isRecurring ? null : Number(f.due_day),
      start_date:     isRecurring ? f.start_date : null,
    };
    const row = isEdit ? await api.updateBill(existing.id, body) : await api.createBill(body);
    onSaved(normBill(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{isEdit ? 'Edit Bill' : 'Add Bill'}</div>
        <Field label="Bill name *"><input autoFocus style={INP} placeholder="AIS mobile, EGAT electricity, Airtel validity…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <Field label="Emoji"><EmojiPicker options={FINANCE_EMOJIS} value={f.emoji} onChange={v => setF(x=>({...x,emoji:v}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type">
            <select style={SEL} value={f.type} onChange={e => setF(x=>({...x,type:e.target.value}))}>
              {BILL_TYPES.map(t => <option key={t} value={t}>{BILL_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Cycle">
            <select style={SEL} value={f.cycle} onChange={e => setF(x=>({...x,cycle:e.target.value}))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Amount (optional)">
            <input type="number" min="0" step="any" style={INP} placeholder="0.00" value={f.amount} onChange={e => setF(x=>({...x,amount:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {withCurrentCurrency(userCurrencies, f.currency).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          {isRecurring ? (
            <Field label={f.cycle === 'yearly' ? 'Renews on (date) *' : 'First due date *'}>
              <input type="date" style={INP} value={f.start_date} onChange={e => setF(x=>({...x,start_date:e.target.value}))} />
            </Field>
          ) : (
            <>
              <Field label="Bill generated (day)">
                <input type="number" min="1" max="31" style={INP} value={f.generation_day} onChange={e => setF(x=>({...x,generation_day:e.target.value}))} />
              </Field>
              <Field label="Due (day)">
                <input type="number" min="1" max="31" style={INP} value={f.due_day} onChange={e => setF(x=>({...x,due_day:e.target.value}))} />
              </Field>
            </>
          )}
          <Field label="Country">
            <select style={SEL} value={f.country} onChange={e => setF(x=>({...x,country:e.target.value}))}>
              <option value="IN">🇮🇳 India</option><option value="TH">🇹🇭 Thailand</option>
            </select>
          </Field>
        </div>
        {isRecurring && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -4, marginBottom: 14 }}>
            e.g. for a yearly mobile validity that expires 25 Feb 2027, set this to 2027-02-25 — it'll recur on the same date every {f.cycle === 'yearly' ? 'year' : '3 months'} after that.
          </div>
        )}
        <ModalActions onCancel={onClose} submitLabel={isEdit ? 'Save changes' : 'Add bill'} />
      </form>
    </ModalOverlay>
  );
}

function BillsTab({ bills, setBills, paid, onToggle, loading, userCurrencies }) {
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Delete this bill?')) return;
    await api.deleteBill(id);
    setBills(b => b.filter(x => x.id !== id));
  }

  function handleSaved(updated) {
    setBills(b => {
      const idx = b.findIndex(x => x.id === updated.id);
      if (idx === -1) return [...b, updated];
      const next = [...b]; next[idx] = updated; return next;
    });
  }

  const filtered = filter === 'all' ? bills : bills.filter(b => b.country === filter);
  const sorted   = [...filtered].map(b => ({ ...b, _days: daysUntilBilling(b, 'dueDay') })).sort((a, b) => a._days - b._days);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <FilterPill label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterPill label="🇮🇳 India" active={filter === 'IN'} onClick={() => setFilter('IN')} />
          <FilterPill label="🇹🇭 Thailand" active={filter === 'TH'} onClick={() => setFilter('TH')} />
        </div>
        <AddBtn onClick={() => setModal('add')} label="Add bill" />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="bills" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
          {sorted.map(b => (
            <BillCard key={b.id} bill={b} paid={!!paid[`bill:${b.id}`]} onToggle={onToggle}
              onDelete={() => handleDelete(b.id)} onEdit={() => setModal(b)} />
          ))}
        </div>
      )}
      {modal && <BillModal onClose={() => setModal(null)} existing={modal === 'add' ? null : modal} onSaved={handleSaved} userCurrencies={userCurrencies} />}
    </div>
  );
}

// ─── Tab 5 — Insurance ──────────────────────────────────────────────────────────

const INS_TYPES  = ['health', 'life', 'vehicle', 'home', 'travel', 'other'];
const INS_LABELS = { health: 'Health', life: 'Life', vehicle: 'Vehicle', home: 'Home', travel: 'Travel', other: 'Other' };
const INS_COLORS = { health: '#34d399', life: '#a5b4fc', vehicle: '#fb923c', home: '#fcd34d', travel: '#67e8f9', other: '#a6a6b8' };

function InsuranceCard({ ins, paid, onToggle, onDelete, onEdit }) {
  const isRecurring = ins.cycle !== 'monthly';
  const days = daysUntilBilling(ins);
  const date = nextBillingDate(ins);
  const typeColor = INS_COLORS[ins.type] || '#a6a6b8';
  return (
    <div style={{ borderRadius: 18, padding: '16px 18px', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, flex: '0 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: 'var(--surface-2)' }}>
          {ins.emoji || '🛡️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{ins.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', color: typeColor, textTransform: 'capitalize' }}>{INS_LABELS[ins.type] || ins.type}</span>
            {ins.provider && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{ins.provider}</span>}
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{ins.country === 'IN' ? '🇮🇳' : ins.country === 'TH' ? '🇹🇭' : '🌐'}</span>
          </div>
          {ins.policy_number && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Policy: {ins.policy_number}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditBtn onEdit={onEdit} />
          <DeleteBtn onDelete={onDelete} />
          <DueBadge days={days} />
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{ins.amount ? fmtAmount(ins.amount, ins.currency) : 'Varies'}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginLeft: 3 }}>{fmtCycle(ins.cycle)}</span></div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
            {isRecurring ? `Renews ${ins.cycle} · ${fmtDate(date)}` : `Premium due on ${ordinal(ins.billingDay)} · next ${fmtDate(date)}`}
          </div>
        </div>
        <PaidToggle id={ins.id} type="insurance" paid={paid} onToggle={onToggle} />
      </div>
    </div>
  );
}

function InsuranceModal({ onClose, existing, onSaved, userCurrencies }) {
  const isEdit = !!existing;
  const [f, setF] = useState(isEdit
    ? { name: existing.name, provider: existing.provider || '', type: existing.type, emoji: existing.emoji || '🛡️', amount: existing.amount != null ? String(existing.amount) : '', currency: existing.currency, billing_day: existing.billingDay != null ? String(existing.billingDay) : '1', country: existing.country, policy_number: existing.policy_number || '', cycle: existing.cycle || 'monthly', start_date: existing.startDate || '' }
    : { name: '', provider: '', type: 'health', emoji: '🛡️', amount: '', currency: userCurrencies[0] || 'INR', billing_day: '1', country: 'IN', policy_number: '', cycle: 'monthly', start_date: '' }
  );
  const isRecurring = f.cycle !== 'monthly';
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    if (isRecurring && !f.start_date) return;
    const body = {
      ...f,
      amount: f.amount ? Number(f.amount) : null,
      billing_day: isRecurring ? null : Number(f.billing_day),
      start_date:  isRecurring ? f.start_date : null,
    };
    const row = isEdit ? await api.updateInsurance(existing.id, body) : await api.createInsurance(body);
    onSaved(normInsurance(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{isEdit ? 'Edit Insurance' : 'Add Insurance'}</div>
        <Field label="Policy name *"><input autoFocus style={INP} placeholder="Health insurance, LIC policy…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <Field label="Provider / Insurer"><input style={INP} placeholder="LIC, Star Health, HDFC Ergo…" value={f.provider} onChange={e => setF(x=>({...x,provider:e.target.value}))} /></Field>
        <Field label="Emoji"><EmojiPicker options={FINANCE_EMOJIS} value={f.emoji} onChange={v => setF(x=>({...x,emoji:v}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type">
            <select style={SEL} value={f.type} onChange={e => setF(x=>({...x,type:e.target.value}))}>
              {INS_TYPES.map(t => <option key={t} value={t}>{INS_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Premium">
            <input type="number" min="0" step="any" style={INP} placeholder="0.00" value={f.amount} onChange={e => setF(x=>({...x,amount:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {withCurrentCurrency(userCurrencies, f.currency).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Cycle">
            <select style={SEL} value={f.cycle} onChange={e => setF(x=>({...x,cycle:e.target.value}))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          {isRecurring ? (
            <Field label={f.cycle === 'yearly' ? 'Renews on (date) *' : 'First due date *'}>
              <input type="date" style={INP} value={f.start_date} onChange={e => setF(x=>({...x,start_date:e.target.value}))} />
            </Field>
          ) : (
            <Field label="Due day">
              <input type="number" min="1" max="31" style={INP} value={f.billing_day} onChange={e => setF(x=>({...x,billing_day:e.target.value}))} />
            </Field>
          )}
          <Field label="Country">
            <select style={SEL} value={f.country} onChange={e => setF(x=>({...x,country:e.target.value}))}>
              <option value="IN">🇮🇳 India</option><option value="TH">🇹🇭 Thailand</option><option value="GLOBAL">🌐 Global</option>
            </select>
          </Field>
          <Field label="Policy number (optional)" >
            <input style={{...INP, gridColumn: 'span 2'}} placeholder="optional" value={f.policy_number} onChange={e => setF(x=>({...x,policy_number:e.target.value}))} />
          </Field>
        </div>
        {isRecurring && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -4, marginBottom: 14 }}>
            e.g. for a yearly premium renewing 25 Feb 2027, set this to 2027-02-25 — it'll recur on the same date every {f.cycle === 'yearly' ? 'year' : '3 months'} after that.
          </div>
        )}
        <ModalActions onCancel={onClose} submitLabel={isEdit ? 'Save changes' : 'Add insurance'} />
      </form>
    </ModalOverlay>
  );
}

function InsuranceTab({ insurance, setInsurance, paid, onToggle, loading, userCurrencies }) {
  const [modal, setModal] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Delete this insurance policy?')) return;
    await api.deleteInsurance(id);
    setInsurance(i => i.filter(x => x.id !== id));
  }

  function handleSaved(updated) {
    setInsurance(i => {
      const idx = i.findIndex(x => x.id === updated.id);
      if (idx === -1) return [...i, updated];
      const next = [...i]; next[idx] = updated; return next;
    });
  }

  const sorted = [...insurance].map(i => ({ ...i, _days: daysUntilBilling(i) })).sort((a, b) => a._days - b._days);
  const total  = {};
  insurance.forEach(i => { total[i.currency] = (total[i.currency] || 0) + thisMonthAmount(i.amount, i.cycle, nextBillingDate(i)); });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {userCurrencies.filter(cur => total[cur] > 0).map(cur => (
            <div key={cur} style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
              {currencyFlag(cur)} {currencySymbol(cur)}{Math.round(total[cur] || 0).toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>this month</span>
            </div>
          ))}
        </div>
        <AddBtn onClick={() => setModal('add')} label="Add insurance" />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="insurance policies" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 12 }}>
          {sorted.map(i => (
            <InsuranceCard key={i.id} ins={i} paid={!!paid[`insurance:${i.id}`]} onToggle={onToggle}
              onDelete={() => handleDelete(i.id)} onEdit={() => setModal(i)} />
          ))}
        </div>
      )}
      {modal && <InsuranceModal onClose={() => setModal(null)} existing={modal === 'add' ? null : modal} onSaved={handleSaved} userCurrencies={userCurrencies} />}
    </div>
  );
}

// ─── Tab 0 — Summary Dashboard ────────────────────────────────────────────────

const CYCLE_PILL = { padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' };

function UpcomingRow({ item }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: item.paid ? 0.5 : 1 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{item.categoryLabel} · {fmtDate(item.date)}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', minWidth: 74, flexShrink: 0 }}>{fmtAmount(item.amount, item.currency)}</div>
      <DueBadge days={item.days} />
    </div>
  );
}

// Lists every item contributing to a currency's total monthly spend, most expensive first —
// answers "what makes up this number" when a Summary total card is clicked.
function CurrencyBreakdownModal({ currency, items, onClose, monthLabel }) {
  const sorted = [...items].sort((a, b) => b.monthly - a.monthly);
  const total = items.reduce((sum, x) => sum + x.monthly, 0);
  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{currencyFlag(currency)} {currency} · Due in {monthLabel}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{currencySymbol(currency)}{Math.round(total).toLocaleString()}</div>
      {sorted.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Nothing in {currency} yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 380, overflowY: 'auto' }}>
          {sorted.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.categoryLabel}{item.cycle && item.cycle !== 'monthly' ? ` · billed ${item.cycle}` : ''}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>{currencySymbol(currency)}{Math.round(item.monthly).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={onClose} style={{ marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>Close</button>
    </ModalOverlay>
  );
}

function SummaryTab({ subs, loans, cards, bills, insurance, paid, loading, userCurrencies }) {
  const [breakdownCurrency, setBreakdownCurrency] = useState(null);
  if (loading) return <LoadingSkel />;

  const thisMonthLabel = APP_TODAY.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Cash-flow totals for THIS calendar month, broken down by category × currency.
  // Monthly items always count; quarterly/yearly items only count in their actual
  // due month (e.g. a yearly bill due Feb 2027 shows $0 every month except that one).
  const cats = [
    { key: 'subscriptions', label: 'Subscriptions', emoji: '📦', total: {} },
    { key: 'bills',         label: 'Bills',          emoji: '📋', total: {} },
    { key: 'loans',         label: 'Loans & EMIs',   emoji: '🏦', total: {} },
    { key: 'insurance',     label: 'Insurance',      emoji: '🛡️', total: {} },
  ];
  const [subCat, billCat, loanCat, insCat] = cats;
  subs.forEach(s => { subCat.total[s.currency] = (subCat.total[s.currency] || 0) + thisMonthAmount(s.amount, s.cycle, nextBillingDate(s)); });
  bills.forEach(b => { billCat.total[b.currency] = (billCat.total[b.currency] || 0) + thisMonthAmount(b.amount, b.cycle, nextBillingDate(b, 'dueDay')); });
  loans.forEach(l => { loanCat.total[l.currency] = (loanCat.total[l.currency] || 0) + thisMonthAmount(l.emi, 'monthly', null); });
  insurance.forEach(i => { insCat.total[i.currency] = (insCat.total[i.currency] || 0) + thisMonthAmount(i.amount, i.cycle, nextBillingDate(i)); });

  const grandTotal = {};
  cats.forEach(c => userCurrencies.forEach(cur => { grandTotal[cur] = (grandTotal[cur] || 0) + (c.total[cur] || 0); }));
  const activeCurrencies = userCurrencies.filter(cur => grandTotal[cur] > 0);

  // Every item actually contributing to this month's total, flattened — used both
  // for the breakdown modal and (filtered by currency) for the drill-down click.
  // Items not due this month (e.g. a yearly bill due in a different month) are
  // left out entirely rather than showing a misleading sliver.
  const allItems = [
    ...subs.map(s => ({ id: `subscription:${s.id}`, name: s.name, emoji: s.emoji || '📦', currency: s.currency, cycle: s.cycle, monthly: thisMonthAmount(s.amount, s.cycle, nextBillingDate(s)), categoryLabel: 'Subscription' })),
    ...bills.filter(b => b.amount).map(b => ({ id: `bill:${b.id}`, name: b.name, emoji: b.emoji || '📋', currency: b.currency, cycle: b.cycle, monthly: thisMonthAmount(b.amount, b.cycle, nextBillingDate(b, 'dueDay')), categoryLabel: BILL_LABELS[b.type] || 'Bill' })),
    ...loans.map(l => ({ id: `loan:${l.id}`, name: l.name, emoji: l.emoji || '🏦', currency: l.currency, cycle: 'monthly', monthly: thisMonthAmount(l.emi, 'monthly', null), categoryLabel: 'Loan EMI' })),
    ...insurance.filter(i => i.amount).map(i => ({ id: `insurance:${i.id}`, name: i.name, emoji: i.emoji || '🛡️', currency: i.currency, cycle: i.cycle, monthly: thisMonthAmount(i.amount, i.cycle, nextBillingDate(i)), categoryLabel: 'Insurance' })),
  ].filter(item => item.monthly > 0);

  // How many subscriptions/bills/policies bill monthly vs quarterly vs yearly
  const cycleCounts = { monthly: 0, quarterly: 0, yearly: 0 };
  [...subs, ...bills, ...insurance].forEach(x => { cycleCounts[x.cycle || 'monthly']++; });
  const hasCycles = cycleCounts.monthly + cycleCounts.quarterly + cycleCounts.yearly > 0;

  // Unified, chronologically-sorted view of every upcoming payment across all categories
  const upcoming = [
    ...subs.map(s => ({ id: `subscription:${s.id}`, name: s.name, emoji: s.emoji || '📦', amount: s.amount, currency: s.currency, days: daysUntilBilling(s), date: nextBillingDate(s), categoryLabel: 'Subscription', paid: !!paid[`subscription:${s.id}`] })),
    ...bills.map(b => ({ id: `bill:${b.id}`, name: b.name, emoji: b.emoji || '📋', amount: b.amount, currency: b.currency, days: daysUntilBilling(b, 'dueDay'), date: nextBillingDate(b, 'dueDay'), categoryLabel: BILL_LABELS[b.type] || 'Bill', paid: !!paid[`bill:${b.id}`] })),
    ...loans.map(l => ({ id: `loan:${l.id}`, name: l.name, emoji: l.emoji || '🏦', amount: l.emi, currency: l.currency, days: daysUntilDay(l.dueDay), date: nextDateForDay(l.dueDay), categoryLabel: 'Loan EMI', paid: !!paid[`loan:${l.id}`] })),
    ...cards.map(c => ({ id: `credit_card:${c.id}`, name: c.bank || c.name, emoji: c.emoji || '💳', amount: null, currency: c.currency, days: daysUntilDay(c.dueDay), date: nextDateForDay(c.dueDay), categoryLabel: 'Card payment', paid: !!paid[`credit_card:${c.id}`] })),
    ...insurance.map(i => ({ id: `insurance:${i.id}`, name: i.name, emoji: i.emoji || '🛡️', amount: i.amount, currency: i.currency, days: daysUntilBilling(i), date: nextBillingDate(i), categoryLabel: 'Insurance', paid: !!paid[`insurance:${i.id}`] })),
  ].sort((a, b) => a.days - b.days);

  return (
    <div>
      {/* Totals by currency — click a card to see what makes it up */}
      {activeCurrencies.length === 0 ? <EmptyState label="finance items" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`, gap: 14, marginBottom: 26 }}>
          {activeCurrencies.map(cur => (
            <button key={cur} type="button" onClick={() => setBreakdownCurrency(cur)}
              style={{ textAlign: 'left', borderRadius: 20, padding: '20px 22px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{currencyFlag(cur)} {cur} · Due in {thisMonthLabel}</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>{currencySymbol(cur)}{Math.round(grandTotal[cur]).toLocaleString()}</div>
              {cats.map(c => (c.total[cur] || 0) > 0 && (
                <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', color: 'var(--text-2)' }}>
                  <span>{c.emoji} {c.label}</span>
                  <span style={{ fontWeight: 700 }}>{currencySymbol(cur)}{Math.round(c.total[cur]).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Click for details →</div>
            </button>
          ))}
        </div>
      )}

      {/* Billing cycle mix */}
      {hasCycles && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Billing cycles</span>
          {cycleCounts.monthly   > 0 && <span style={CYCLE_PILL}>🔁 {cycleCounts.monthly} Monthly</span>}
          {cycleCounts.quarterly > 0 && <span style={CYCLE_PILL}>📆 {cycleCounts.quarterly} Quarterly</span>}
          {cycleCounts.yearly    > 0 && <span style={CYCLE_PILL}>🗓️ {cycleCounts.yearly} Yearly</span>}
        </div>
      )}

      {/* Coming up next */}
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Coming up next</div>
      {upcoming.length === 0 ? <EmptyState label="upcoming payments" /> : (
        <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', padding: '2px 18px' }}>
          {upcoming.slice(0, 12).map(item => <UpcomingRow key={item.id} item={item} />)}
        </div>
      )}

      {breakdownCurrency && (
        <CurrencyBreakdownModal
          currency={breakdownCurrency}
          items={allItems.filter(x => x.currency === breakdownCurrency)}
          onClose={() => setBreakdownCurrency(null)}
          monthLabel={thisMonthLabel}
        />
      )}
    </div>
  );
}

function LoadingSkel() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 12 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 130, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.5, animation: 'om-pulse 1.4s infinite' }} />
      ))}
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary',       label: '📊 Summary' },
  { id: 'subscriptions', label: '📦 Subscriptions' },
  { id: 'loans',         label: '🏦 Loans & EMIs' },
  { id: 'cards',         label: '💳 Credit Cards' },
  { id: 'bills',         label: '📋 Bills' },
  { id: 'insurance',     label: '🛡️ Insurance' },
];

export default function FinanceTracker() {
  const { state } = useAppStore();
  const userCurrencies = state.userCurrencies?.length ? state.userCurrencies : DEFAULT_CURRENCIES;
  const [tab, setTab] = useState('summary');
  const [subs,      setSubs]      = useState([]);
  const [loans,     setLoans]     = useState([]);
  const [cards,     setCards]     = useState([]);
  const [bills,     setBills]     = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [paid,  setPaid]  = useState({}); // key: "type:id" → bool
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, l, c, b, ins, p] = await Promise.all([
          api.getSubscriptions().catch(() => []),
          api.getLoans().catch(() => []),
          api.getCreditCards().catch(() => []),
          api.getBills().catch(() => []),
          api.getInsurance().catch(() => []),
          api.getPaid(CURR_MONTH).catch(() => []),
        ]);
        setSubs(s.map(normSub));
        setLoans(l.map(normLoan));
        setCards(c.map(normCC));
        setBills(b.map(normBill));
        setInsurance(ins.map(normInsurance));
        const paidMap = {};
        p.forEach(r => { if (r.paid) paidMap[`${r.item_type}:${r.item_id}`] = true; });
        setPaid(paidMap);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleToggle(type, id) {
    const key = `${type}:${id}`;
    const newVal = !paid[key];
    setPaid(p => ({ ...p, [key]: newVal }));
    try {
      const res = await api.togglePaid(type, id, CURR_MONTH);
      setPaid(p => ({ ...p, [key]: res.paid }));
    } catch {
      setPaid(p => ({ ...p, [key]: !newVal })); // revert
    }
  }

  const tabProps = { paid, onToggle: handleToggle, loading, userCurrencies };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <TabPill key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {tab === 'summary'       && <SummaryTab {...tabProps} subs={subs} loans={loans} cards={cards} bills={bills} insurance={insurance} />}
      {tab === 'subscriptions' && <SubscriptionsTab {...tabProps} subs={subs} setSubs={setSubs} />}
      {tab === 'loans'         && <LoansTab {...tabProps} loans={loans} setLoans={setLoans} />}
      {tab === 'cards'         && <CreditCardsTab {...tabProps} cards={cards} setCards={setCards} />}
      {tab === 'bills'         && <BillsTab {...tabProps} bills={bills} setBills={setBills} />}
      {tab === 'insurance'     && <InsuranceTab {...tabProps} insurance={insurance} setInsurance={setInsurance} />}
    </div>
  );
}
