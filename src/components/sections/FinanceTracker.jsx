import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { APP_TODAY } from '../../utils/dateUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOL = { INR: '₹', THB: '฿', USD: '$' };
const CURR_MONTH = APP_TODAY.toISOString().slice(0, 7);

function fmtAmount(amount, currency) {
  if (amount === null || amount === undefined) return 'Varies';
  return `${CURRENCY_SYMBOL[currency] || ''}${Number(amount).toLocaleString()}`;
}
function fmtCycle(cycle) { return cycle === 'yearly' ? '/yr' : '/mo'; }
function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function daysUntilDay(targetDay) {
  const y = APP_TODAY.getFullYear(), m = APP_TODAY.getMonth(), d = APP_TODAY.getDate();
  const t = targetDay >= d ? new Date(y, m, targetDay) : new Date(y, m + 1, targetDay);
  return Math.round((t - new Date(y, m, d)) / 86400000);
}
function nextDateForDay(targetDay) {
  const y = APP_TODAY.getFullYear(), m = APP_TODAY.getMonth(), d = APP_TODAY.getDate();
  return targetDay >= d ? new Date(y, m, targetDay) : new Date(y, m + 1, targetDay);
}
function fmtDate(dt) { return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function dueBadge(days) {
  if (days === 0) return { bg: 'rgba(16,185,129,0.15)',  color: '#34d399', label: 'Today' };
  if (days <= 3)  return { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', label: `${days}d` };
  if (days <= 7)  return { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', label: `${days}d` };
  return           { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', label: `${days}d` };
}

// Snake_case DB rows → camelCase component shapes
function normSub(r)  { return { ...r, billingDay:   Number(r.billing_day), amount: Number(r.amount) }; }
function normLoan(r) { return { ...r, dueDay:       Number(r.due_day), emi: Number(r.emi) }; }
function normCC(r)   { return { ...r, dueDay:       Number(r.due_day), statementDay: Number(r.statement_day) }; }
function normBill(r) { return { ...r, dueDay:       Number(r.due_day), generationDay: Number(r.generation_day), amount: r.amount ? Number(r.amount) : null }; }

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

function SubCard({ sub, paid, onToggle, onDelete }) {
  const days = daysUntilDay(sub.billingDay);
  const date = nextDateForDay(sub.billingDay);
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DeleteBtn onDelete={onDelete} />
          <DueBadge days={days} />
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{fmtAmount(sub.amount, sub.currency)}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginLeft: 3 }}>{fmtCycle(sub.cycle)}</span></div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Bills on {ordinal(sub.billingDay)} · next {fmtDate(date)}</div>
        </div>
        <PaidToggle id={sub.id} type="subscription" paid={paid} onToggle={onToggle} />
      </div>
    </div>
  );
}

function AddSubModal({ onClose, onAdded }) {
  const [f, setF] = useState({ name: '', cat: 'streaming', emoji: '📦', amount: '', currency: 'INR', billing_day: '1', cycle: 'monthly', country: 'GLOBAL' });
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.billing_day) return;
    const row = await api.createSubscription({ ...f, amount: Number(f.amount), billing_day: Number(f.billing_day) });
    onAdded(normSub(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Add Subscription</div>
        <Field label="Name *"><input autoFocus style={INP} placeholder="Netflix, Spotify…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Emoji"><input style={INP} maxLength={2} value={f.emoji} onChange={e => setF(x=>({...x,emoji:e.target.value}))} /></Field>
          <Field label="Category">
            <select style={SEL} value={f.cat} onChange={e => setF(x=>({...x,cat:e.target.value}))}>
              {SUB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input type="number" min="0" style={INP} placeholder="0" value={f.amount} onChange={e => setF(x=>({...x,amount:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {['INR','THB','USD'].map(c => <option key={c}>{c}</option>)}
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
        </div>
        <ModalActions onCancel={onClose} submitLabel="Add subscription" />
      </form>
    </ModalOverlay>
  );
}

function SubscriptionsTab({ subs, setSubs, paid, onToggle, loading }) {
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(id) {
    if (!confirm('Delete this subscription?')) return;
    await api.deleteSubscription(id);
    setSubs(s => s.filter(x => x.id !== id));
  }

  const filtered = filter === 'all' ? subs : subs.filter(s => s.country === filter);
  const sorted   = [...filtered].map(s => ({ ...s, _days: daysUntilDay(s.billingDay) })).sort((a, b) => a._days - b._days);
  const total    = { INR: 0, THB: 0, USD: 0 };
  subs.forEach(s => { if (s.cycle !== 'yearly') total[s.currency] = (total[s.currency] || 0) + Number(s.amount || 0); });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['INR','₹','🇮🇳'],['THB','฿','🇹🇭'],['USD','$','🌐']].map(([cur, sym, flag]) => (
            <div key={cur} style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
              {flag} {sym}{total[cur]?.toLocaleString() || 0}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>/mo</span>
            </div>
          ))}
        </div>
        <AddBtn onClick={() => setShowAdd(true)} label="Add subscription" />
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
        <FilterPill label={`All (${subs.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterPill label="🇮🇳 India" active={filter === 'IN'}     onClick={() => setFilter('IN')} />
        <FilterPill label="🇹🇭 Thailand" active={filter === 'TH'} onClick={() => setFilter('TH')} />
        <FilterPill label="🌐 Global" active={filter === 'GLOBAL'} onClick={() => setFilter('GLOBAL')} />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="subscriptions" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 12 }}>
          {sorted.map(s => <SubCard key={s.id} sub={s} paid={!!paid[`subscription:${s.id}`]} onToggle={onToggle} onDelete={() => handleDelete(s.id)} />)}
        </div>
      )}
      {showAdd && <AddSubModal onClose={() => setShowAdd(false)} onAdded={r => setSubs(s => [...s, r])} />}
    </div>
  );
}

// ─── Tab 2 — Loans & EMIs ───────────────────────────────────────────────────────

function LoanCard({ loan, paid, onToggle, onDelete }) {
  const days = daysUntilDay(loan.dueDay);
  const date = nextDateForDay(loan.dueDay);
  return (
    <div style={{ borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border)', background: 'var(--surface)', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flex: '0 0 42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'rgba(99,102,241,0.12)' }}>🏦</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{loan.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{loan.bank}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

function AddLoanModal({ onClose, onAdded }) {
  const [f, setF] = useState({ name: '', bank: '', emi: '', currency: 'INR', due_day: '5' });
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    const row = await api.createLoan({ ...f, emi: Number(f.emi), due_day: Number(f.due_day) });
    onAdded(normLoan(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Add Loan / EMI</div>
        <Field label="Loan name *"><input autoFocus style={INP} placeholder="Home loan, Car loan…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <Field label="Bank / Lender"><input style={INP} placeholder="HDFC, ICICI…" value={f.bank} onChange={e => setF(x=>({...x,bank:e.target.value}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="EMI amount">
            <input type="number" min="0" style={INP} placeholder="0" value={f.emi} onChange={e => setF(x=>({...x,emi:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {['INR','THB','USD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Due day">
            <input type="number" min="1" max="31" style={INP} value={f.due_day} onChange={e => setF(x=>({...x,due_day:e.target.value}))} />
          </Field>
        </div>
        <ModalActions onCancel={onClose} submitLabel="Add loan" />
      </form>
    </ModalOverlay>
  );
}

function LoansTab({ loans, setLoans, paid, onToggle, loading }) {
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(id) {
    if (!confirm('Delete this loan?')) return;
    await api.deleteLoan(id);
    setLoans(l => l.filter(x => x.id !== id));
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
        <AddBtn onClick={() => setShowAdd(true)} label="Add loan" />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="loans" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12 }}>
          {sorted.map(l => <LoanCard key={l.id} loan={l} paid={!!paid[`loan:${l.id}`]} onToggle={onToggle} onDelete={() => handleDelete(l.id)} />)}
        </div>
      )}
      {showAdd && <AddLoanModal onClose={() => setShowAdd(false)} onAdded={r => setLoans(l => [...l, r])} />}
    </div>
  );
}

// ─── Tab 3 — Credit Cards ───────────────────────────────────────────────────────

function CCCard({ cc, paid, onToggle, onDelete }) {
  const stmtDays = daysUntilDay(cc.statementDay);
  const dueDays  = daysUntilDay(cc.dueDay);
  const stmtDate = nextDateForDay(cc.statementDay);
  const dueDate  = nextDateForDay(cc.dueDay);
  return (
    <div style={{ borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border)', background: 'var(--surface)', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flex: '0 0 42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'rgba(168,85,247,0.12)' }}>💳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{cc.bank}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{cc.name}</div>
        </div>
        <DeleteBtn onDelete={onDelete} />
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

function AddCCModal({ onClose, onAdded }) {
  const [f, setF] = useState({ name: '', bank: '', statement_day: '1', due_day: '20', currency: 'INR' });
  async function submit(e) {
    e.preventDefault();
    if (!f.bank.trim()) return;
    const row = await api.createCreditCard({ ...f, statement_day: Number(f.statement_day), due_day: Number(f.due_day) });
    onAdded(normCC(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Add Credit Card</div>
        <Field label="Bank *"><input autoFocus style={INP} placeholder="HDFC, ICICI, SBI…" value={f.bank} onChange={e => setF(x=>({...x,bank:e.target.value}))} /></Field>
        <Field label="Card name"><input style={INP} placeholder="Regalia, Diners…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Statement day">
            <input type="number" min="1" max="31" style={INP} value={f.statement_day} onChange={e => setF(x=>({...x,statement_day:e.target.value}))} />
          </Field>
          <Field label="Due day">
            <input type="number" min="1" max="31" style={INP} value={f.due_day} onChange={e => setF(x=>({...x,due_day:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {['INR','THB','USD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <ModalActions onCancel={onClose} submitLabel="Add card" />
      </form>
    </ModalOverlay>
  );
}

function CreditCardsTab({ cards, setCards, paid, onToggle, loading }) {
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(id) {
    if (!confirm('Delete this credit card?')) return;
    await api.deleteCreditCard(id);
    setCards(c => c.filter(x => x.id !== id));
  }

  return (
    <div>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <AddBtn onClick={() => setShowAdd(true)} label="Add card" />
      </div>
      {loading ? <LoadingSkel /> : cards.length === 0 ? <EmptyState label="credit cards" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12 }}>
          {cards.map(cc => <CCCard key={cc.id} cc={cc} paid={!!paid[`credit_card:${cc.id}`]} onToggle={onToggle} onDelete={() => handleDelete(cc.id)} />)}
        </div>
      )}
      {showAdd && <AddCCModal onClose={() => setShowAdd(false)} onAdded={r => setCards(c => [...c, r])} />}
    </div>
  );
}

// ─── Tab 4 — Bills ──────────────────────────────────────────────────────────────

const BILL_TYPES  = ['phone', 'utility', 'internet', 'other'];
const BILL_LABELS = { phone: 'Phone', utility: 'Utility', internet: 'Internet', other: 'Other' };

function BillCard({ bill, paid, onToggle, onDelete }) {
  const dueDays = daysUntilDay(bill.dueDay);
  const genDays = daysUntilDay(bill.generationDay);
  const dueDate = nextDateForDay(bill.dueDay);
  const genDate = nextDateForDay(bill.generationDay);
  return (
    <div style={{ borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border)', background: 'var(--surface)', opacity: paid ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flex: '0 0 42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: 'var(--surface-2)' }}>
          {bill.emoji || '📋'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{bill.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{BILL_LABELS[bill.type] || bill.type}</span>
            <span style={{ fontSize: 12 }}>{bill.country === 'IN' ? '🇮🇳' : '🇹🇭'}</span>
            {bill.amount && <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtAmount(bill.amount, bill.currency)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DeleteBtn onDelete={onDelete} />
          <DueBadge days={dueDays} />
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Bill generated</span>
          <span style={{ fontWeight: 600 }}>{ordinal(bill.generationDay)} · {fmtDate(genDate)} <span style={{ color: 'var(--text-3)' }}>({genDays}d)</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-3)' }}>Payment due</span>
          <span style={{ fontWeight: 600, color: dueDays <= 5 ? '#fca5a5' : 'inherit' }}>{ordinal(bill.dueDay)} · {fmtDate(dueDate)}</span>
        </div>
      </div>
      <PaidToggle id={bill.id} type="bill" paid={paid} onToggle={onToggle} />
    </div>
  );
}

function AddBillModal({ onClose, onAdded }) {
  const [f, setF] = useState({ name: '', country: 'IN', type: 'utility', emoji: '📋', generation_day: '1', due_day: '10', amount: '', currency: 'INR' });
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    const row = await api.createBill({ ...f, generation_day: Number(f.generation_day), due_day: Number(f.due_day), amount: f.amount ? Number(f.amount) : null });
    onAdded(normBill(row));
    onClose();
  }
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Add Bill</div>
        <Field label="Bill name *"><input autoFocus style={INP} placeholder="AIS mobile, EGAT electricity…" value={f.name} onChange={e => setF(x=>({...x,name:e.target.value}))} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Emoji"><input style={INP} maxLength={2} value={f.emoji} onChange={e => setF(x=>({...x,emoji:e.target.value}))} /></Field>
          <Field label="Type">
            <select style={SEL} value={f.type} onChange={e => setF(x=>({...x,type:e.target.value}))}>
              {BILL_TYPES.map(t => <option key={t} value={t}>{BILL_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Amount (optional)">
            <input type="number" min="0" style={INP} placeholder="0" value={f.amount} onChange={e => setF(x=>({...x,amount:e.target.value}))} />
          </Field>
          <Field label="Currency">
            <select style={SEL} value={f.currency} onChange={e => setF(x=>({...x,currency:e.target.value}))}>
              {['INR','THB','USD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Bill generated (day)">
            <input type="number" min="1" max="31" style={INP} value={f.generation_day} onChange={e => setF(x=>({...x,generation_day:e.target.value}))} />
          </Field>
          <Field label="Due (day)">
            <input type="number" min="1" max="31" style={INP} value={f.due_day} onChange={e => setF(x=>({...x,due_day:e.target.value}))} />
          </Field>
          <Field label="Country">
            <select style={SEL} value={f.country} onChange={e => setF(x=>({...x,country:e.target.value}))}>
              <option value="IN">🇮🇳 India</option><option value="TH">🇹🇭 Thailand</option>
            </select>
          </Field>
        </div>
        <ModalActions onCancel={onClose} submitLabel="Add bill" />
      </form>
    </ModalOverlay>
  );
}

function BillsTab({ bills, setBills, paid, onToggle, loading }) {
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(id) {
    if (!confirm('Delete this bill?')) return;
    await api.deleteBill(id);
    setBills(b => b.filter(x => x.id !== id));
  }

  const filtered = filter === 'all' ? bills : bills.filter(b => b.country === filter);
  const sorted   = [...filtered].map(b => ({ ...b, _days: daysUntilDay(b.dueDay) })).sort((a, b) => a._days - b._days);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <FilterPill label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterPill label="🇮🇳 India" active={filter === 'IN'} onClick={() => setFilter('IN')} />
          <FilterPill label="🇹🇭 Thailand" active={filter === 'TH'} onClick={() => setFilter('TH')} />
        </div>
        <AddBtn onClick={() => setShowAdd(true)} label="Add bill" />
      </div>
      {loading ? <LoadingSkel /> : sorted.length === 0 ? <EmptyState label="bills" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
          {sorted.map(b => <BillCard key={b.id} bill={b} paid={!!paid[`bill:${b.id}`]} onToggle={onToggle} onDelete={() => handleDelete(b.id)} />)}
        </div>
      )}
      {showAdd && <AddBillModal onClose={() => setShowAdd(false)} onAdded={r => setBills(b => [...b, r])} />}
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
  { id: 'subscriptions', label: '📦 Subscriptions' },
  { id: 'loans',         label: '🏦 Loans & EMIs' },
  { id: 'cards',         label: '💳 Credit Cards' },
  { id: 'bills',         label: '📋 Bills' },
];

export default function FinanceTracker() {
  const [tab, setTab] = useState('subscriptions');
  const [subs,  setSubs]  = useState([]);
  const [loans, setLoans] = useState([]);
  const [cards, setCards] = useState([]);
  const [bills, setBills] = useState([]);
  const [paid,  setPaid]  = useState({}); // key: "type:id" → bool
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, l, c, b, p] = await Promise.all([
          api.getSubscriptions().catch(() => []),
          api.getLoans().catch(() => []),
          api.getCreditCards().catch(() => []),
          api.getBills().catch(() => []),
          api.getPaid(CURR_MONTH).catch(() => []),
        ]);
        setSubs(s.map(normSub));
        setLoans(l.map(normLoan));
        setCards(c.map(normCC));
        setBills(b.map(normBill));
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

  const tabProps = { paid, onToggle: handleToggle, loading };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <TabPill key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {tab === 'subscriptions' && <SubscriptionsTab {...tabProps} subs={subs} setSubs={setSubs} />}
      {tab === 'loans'         && <LoansTab {...tabProps} loans={loans} setLoans={setLoans} />}
      {tab === 'cards'         && <CreditCardsTab {...tabProps} cards={cards} setCards={setCards} />}
      {tab === 'bills'         && <BillsTab {...tabProps} bills={bills} setBills={setBills} />}
    </div>
  );
}
