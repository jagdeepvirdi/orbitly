import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { fmtBday, nextBdayDays } from '../../data/familyDirectory';
import { api } from '../../api/client';
import CheckRow from '../ui/CheckRow';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOMENT_EMOJIS = ['📸','🎉','🎂','🏖️','🎬','🍳','🌳','🎨','☕','🏊','🎵','🥳','❤️','🌸','⭐','🏡','✈️','🐾','🌅','🎁'];
const TERM_COLORS   = ['#6366f1','#f59e0b','#10b981','#ef4444','#a855f7','#0ea5e9','#f43f5e','#f97316','#64748b','#d4af37'];

// ─── Shared constants ─────────────────────────────────────────────────────────

const CONTACT_FIELDS = [
  { key: 'phone',     label: 'Phone',     icon: '📞' },
  { key: 'email',     label: 'Email',     icon: '✉️' },
  { key: 'address',   label: 'Address',   icon: '📍' },
  { key: 'workplace', label: 'Workplace', icon: '🏢' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
  { key: 'facebook',  label: 'Facebook',  icon: '👥' },
];

const MONTHS     = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL= ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const INPUT = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normMember(row) {
  return {
    id: row.id,
    realName: row.real_name,
    petName: row.pet_name,
    side: row.side,
    group: row.group_id,
    relation: row.relation || '',
    bday: row.bday_month ? [row.bday_month, row.bday_day] : null,
  };
}

function normEvent(row) {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    side: row.side,
    group: row.group_id,
    m: row.event_month,
    d: row.event_day,
  };
}

// ─── Side colour helper ───────────────────────────────────────────────────────

function sc(side) {
  if (side === 'sahmbi') return { bg: 'rgba(244,63,94,0.15)',  text: '#fb7185', border: 'rgba(244,63,94,0.3)',  accent: 'rgba(244,63,94,0.12)'  };
  if (side === 'virdi')  return { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc', border: 'rgba(99,102,241,0.3)', accent: 'rgba(99,102,241,0.12)' };
  return                        { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.3)', accent: 'rgba(16,185,129,0.12)' };
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalBase({ children, onClose, maxWidth = 460 }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth, borderRadius: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, sub, onClose }) {
  return (
    <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: 2 }}>✕</button>
    </div>
  );
}

function ModalFooter({ onSave, onClose, saveLabel = 'Save', disabled }) {
  return (
    <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
      <button
        onClick={onSave}
        disabled={disabled}
        style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, background: 'var(--accent)', color: '#fff', opacity: disabled ? 0.4 : 1 }}
      >
        {saveLabel}
      </button>
      <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, background: 'transparent', color: 'var(--text-2)' }}>
        Cancel
      </button>
    </div>
  );
}

// ─── Icon buttons ─────────────────────────────────────────────────────────────

function IBtn({ icon, onClick, title, size = 26 }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: size, height: size, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {icon}
    </button>
  );
}

// ─── Group Modal ──────────────────────────────────────────────────────────────

function GroupModal({ group, onSave, onClose }) {
  const [form, setForm] = useState({ label: group?.label || '', emoji: group?.emoji || '👥' });
  const isEdit = !!group;
  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={isEdit ? 'Edit Group' : 'Add New Group'} sub={isEdit ? undefined : 'Create a custom group to organise your contacts'} onClose={onClose} />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Emoji</label>
          <input style={{ ...INPUT, width: 64, textAlign: 'center', fontSize: 22, padding: '7px 8px' }} value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} maxLength={2} />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Group Name *</label>
          <input style={INPUT} value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Work Friends, College Buddies…" autoFocus />
        </div>
      </div>
      <ModalFooter onSave={() => form.label.trim() && onSave(form)} onClose={onClose} saveLabel={isEdit ? 'Save Changes' : 'Create Group'} disabled={!form.label.trim()} />
    </ModalBase>
  );
}

// ─── Member Modal ─────────────────────────────────────────────────────────────

function MemberModal({ member, groups, defaultGroupId, onSave, onClose }) {
  const [form, setForm] = useState({
    realName:  member?.realName   || '',
    petName:   member?.petName    || '',
    relation:  member?.relation   || '',
    groupId:   member?.group      || defaultGroupId || '',
    bdayMonth: member?.bday?.[0]  || '',
    bdayDay:   member?.bday?.[1]  || '',
  });
  const valid = form.realName.trim() && form.groupId;
  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={member ? 'Edit Person' : 'Add Person'} onClose={onClose} />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Full Name *</label>
          <input style={INPUT} value={form.realName} onChange={e => setForm(p => ({ ...p, realName: e.target.value }))} placeholder="Legal / full name" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Nickname / Pet Name</label>
          <input style={INPUT} value={form.petName} onChange={e => setForm(p => ({ ...p, petName: e.target.value }))} placeholder="What you call them" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Relation</label>
          <input style={INPUT} value={form.relation} onChange={e => setForm(p => ({ ...p, relation: e.target.value }))} placeholder="e.g. Brother, Colleague, Best friend" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Group *</label>
          <select style={INPUT} value={form.groupId} onChange={e => setForm(p => ({ ...p, groupId: e.target.value }))}>
            <option value="">— select group —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Birthday</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...INPUT, flex: 3 }} value={form.bdayMonth} onChange={e => setForm(p => ({ ...p, bdayMonth: e.target.value }))}>
              <option value="">Month</option>
              {MONTHS_FULL.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input style={{ ...INPUT, flex: 1 }} type="number" min="1" max="31" value={form.bdayDay} onChange={e => setForm(p => ({ ...p, bdayDay: e.target.value }))} placeholder="Day" />
          </div>
        </div>
      </div>
      <ModalFooter onSave={() => valid && onSave(form)} onClose={onClose} saveLabel={member ? 'Save Changes' : 'Add Person'} disabled={!valid} />
    </ModalBase>
  );
}

// ─── Event Modal ──────────────────────────────────────────────────────────────

function EventModal({ event, onSave, onClose }) {
  const [form, setForm] = useState({
    label: event?.label || '',
    type:  event?.type  || 'marriage',
    month: event?.m     || '',
    day:   event?.d     || '',
  });
  const valid = form.label.trim() && form.month && form.day;
  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={event ? 'Edit Event' : 'Add Event'} sub="Anniversary, engagement, or other milestone" onClose={onClose} />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Event Label *</label>
          <input style={INPUT} value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. John & Jane Anniversary" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Type</label>
          <select style={INPUT} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="marriage">💑 Anniversary / Marriage</option>
            <option value="engagement">💍 Engagement</option>
            <option value="court">⚖️ Court / Civil</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Date *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...INPUT, flex: 3 }} value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
              <option value="">Month</option>
              {MONTHS_FULL.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input style={{ ...INPUT, flex: 1 }} type="number" min="1" max="31" value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))} placeholder="Day" />
          </div>
        </div>
      </div>
      <ModalFooter onSave={() => valid && onSave(form)} onClose={onClose} saveLabel={event ? 'Save Changes' : 'Add Event'} disabled={!valid} />
    </ModalBase>
  );
}

// ─── Profile / Contacts Modal ─────────────────────────────────────────────────

function ProfileModal({ person, groups, contacts, onSave, onClose }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', email: '', address: '', workplace: '', instagram: '', linkedin: '', facebook: '', ...contacts });

  const group    = groups.find(g => g.id === person.group);
  const bdayStr  = fmtBday(person.bday);
  const daysLeft = person.bday ? nextBdayDays(person.bday) : null;
  const colors   = sc(person.side);

  function handleSave() { onSave(person.id, form); setEditing(false); }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      {/* Header */}
      <div style={{ padding: '22px 24px 18px', background: `linear-gradient(120deg,${colors.accent},transparent)`, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 52, height: 52, borderRadius: '50%', marginBottom: 12, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: colors.text }}>
              {person.petName.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{person.realName}</div>
            {person.petName !== person.realName && (
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>"{person.petName}"</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {person.relation && <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' }}>{person.relation}</span>}
          {group && <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>{group.emoji} {group.label}</span>}
        </div>
      </div>

      {/* Birthday */}
      {bdayStr && (
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🎂</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Birthday · {bdayStr}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {daysLeft === 0 ? '🎉 Today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} away`}
            </div>
          </div>
          {daysLeft <= 7 && daysLeft > 0 && <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>Soon!</span>}
        </div>
      )}

      {/* Contact fields */}
      <div style={{ padding: '16px 24px 20px', maxHeight: 300, overflowY: 'auto' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTACT_FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{f.icon} {f.label}</label>
                <input style={INPUT} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={`Enter ${f.label.toLowerCase()}…`} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CONTACT_FIELDS.map(f => {
              const val = contacts?.[f.key];
              if (!val) return null;
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'var(--surface)' }}>
                  <span style={{ fontSize: 16, flex: '0 0 20px' }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 1 }}>{f.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
                  </div>
                </div>
              );
            })}
            {CONTACT_FIELDS.every(f => !contacts?.[f.key]) && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>No contact details yet</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        {editing ? (
          <>
            <button onClick={handleSave} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, background: 'var(--accent)', color: '#fff' }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, background: 'transparent', color: 'var(--text-2)' }}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, background: 'transparent', color: 'var(--text)' }}>✏️ Edit contact details</button>
        )}
      </div>
    </ModalBase>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, members, events, contacts, onPersonClick, onEditGroup, onDeleteGroup, onAddMember, onEditMember, onDeleteMember, onAddEvent, onEditEvent, onDeleteEvent }) {
  const [expanded, setExpanded] = useState(false);
  const colors = sc(group.side);

  const nextBday = useMemo(() => {
    return members
      .filter(m => m.bday)
      .map(m => ({ ...m, days: nextBdayDays(m.bday) }))
      .sort((a, b) => a.days - b.days)[0];
  }, [members]);

  const upcomingSoon = nextBday && nextBday.days <= 30;

  return (
    <div style={{ borderRadius: 20, border: `1px solid ${upcomingSoon ? colors.border : 'var(--border)'}`, background: upcomingSoon ? colors.accent : 'var(--surface)', overflow: 'hidden', transition: 'all 0.15s' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '14px 14px 14px 18px' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12, padding: 0, minWidth: 0 }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>{group.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{group.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
              {events.length > 0 && ` · ${events.length} event${events.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          {nextBday && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>🎂 next</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: nextBday.days <= 7 ? '#ef4444' : nextBday.days <= 30 ? '#f59e0b' : 'var(--text-2)' }}>
                {nextBday.petName} · {nextBday.days === 0 ? 'Today!' : `${MONTHS[nextBday.bday[0]]} ${nextBday.bday[1]}`}
              </div>
            </div>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</span>
        </button>
        {/* Group edit/delete — only for custom groups */}
        {(onEditGroup || onDeleteGroup) && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 4 }}>
            {onEditGroup  && <IBtn icon="✏️" onClick={() => onEditGroup(group)} title="Edit group" />}
            {onDeleteGroup && <IBtn icon="🗑️" onClick={() => { if (window.confirm(`Delete "${group.label}" and all its members?`)) onDeleteGroup(group); }} title="Delete group" />}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Members */}
          {members.map(person => {
            const days = person.bday ? nextBdayDays(person.bday) : null;
            const hasContact = contacts[person.id] && Object.values(contacts[person.id]).some(v => v);
            return (
              <div
                key={person.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px 11px 18px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Clickable person info */}
                <div onClick={() => onPersonClick(person)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: colors.text }}>
                    {person.petName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{person.petName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {person.relation || person.realName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {days !== null && (
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, fontWeight: 600, background: days === 0 ? 'rgba(16,185,129,0.2)' : days <= 7 ? 'rgba(239,68,68,0.15)' : days <= 30 ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.1)', color: days === 0 ? '#34d399' : days <= 7 ? '#fca5a5' : days <= 30 ? '#fcd34d' : '#94a3b8' }}>
                        {days === 0 ? '🎉 Today' : `🎂 ${MONTHS[person.bday[0]]} ${person.bday[1]}`}
                      </span>
                    )}
                    {hasContact && <span style={{ fontSize: 11, color: '#6ee7b7' }}>●</span>}
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>›</span>
                  </div>
                </div>
                {/* Edit/Delete person */}
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {onEditMember   && <IBtn icon="✏️" onClick={() => onEditMember(person)} title="Edit person" />}
                  {onDeleteMember && <IBtn icon="🗑️" onClick={() => { if (window.confirm(`Remove ${person.petName} from the directory?`)) onDeleteMember(person); }} title="Delete person" />}
                </div>
              </div>
            );
          })}

          {/* Events */}
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 10px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {ev.type === 'engagement' ? '💍' : ev.type === 'court' ? '⚖️' : '💑'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{ev.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{MONTHS[ev.m]} {ev.d}</div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {onEditEvent   && <IBtn icon="✏️" onClick={() => onEditEvent(ev)} title="Edit event" />}
                {onDeleteEvent && <IBtn icon="🗑️" onClick={() => { if (window.confirm(`Delete "${ev.label}"?`)) onDeleteEvent(ev); }} title="Delete event" />}
              </div>
            </div>
          ))}

          {/* Add buttons */}
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
            {onAddMember && (
              <button onClick={() => onAddMember(group)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>
                + Add Person
              </button>
            )}
            {onAddEvent && (
              <button onClick={() => onAddEvent(group)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>
                + Add Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Directory View ───────────────────────────────────────────────────────────

function DirectoryView({ state, dispatch }) {
  const [groups,  setGroups]  = useState([]);
  const [members, setMembers] = useState([]);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [side,    setSide]    = useState(state.directorySide || 'sahmbi');

  // Modals
  const [addGroupOpen,   setAddGroupOpen]   = useState(false);
  const [editGroupData,  setEditGroupData]  = useState(null);
  const [addMemberGroup, setAddMemberGroup] = useState(null);
  const [editMemberData, setEditMemberData] = useState(null);
  const [addEventGroup,  setAddEventGroup]  = useState(null);
  const [editEventData,  setEditEventData]  = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [grps, mems, evs] = await Promise.all([
        api.getFamilyGroups(),
        api.getFamilyMembers(),
        api.getFamilyEvents(),
      ]);
      setGroups(grps);
      setMembers(mems.map(normMember));
      setEvents(evs.map(normEvent));
    } catch (e) {
      console.error('Family load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const changeSide = (s) => {
    setSide(s);
    dispatch({ type: 'SET_DIRECTORY_SIDE', side: s });
  };

  // Groups for the active side
  const sideGroups = useMemo(() => groups.filter(g => g.side === side), [groups, side]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return sideGroups;
    const q = search.toLowerCase();
    return sideGroups.filter(g => {
      const gm = members.filter(m => m.group === g.id);
      return g.label.toLowerCase().includes(q) || gm.some(m =>
        m.petName.toLowerCase().includes(q) || m.realName.toLowerCase().includes(q) || m.relation.toLowerCase().includes(q)
      );
    });
  }, [sideGroups, members, search]);

  const totalMembers   = members.filter(m => groups.find(g => g.id === m.group && g.side === side)).length;
  const upcomingCount  = members.filter(m => {
    const g = groups.find(gr => gr.id === m.group && gr.side === side);
    return g && m.bday && nextBdayDays(m.bday) <= 30;
  }).length;

  // ── CRUD handlers ──

  async function handleAddGroup(form) {
    const row = await api.createGroup({ ...form, side });
    setGroups(gs => [...gs, row]);
    setAddGroupOpen(false);
  }

  async function handleEditGroup(form) {
    const row = await api.updateGroup(editGroupData.id, form);
    setGroups(gs => gs.map(g => g.id === row.id ? row : g));
    setEditGroupData(null);
  }

  async function handleDeleteGroup(group) {
    await api.deleteGroup(group.id);
    setGroups(gs => gs.filter(g => g.id !== group.id));
    setMembers(ms => ms.filter(m => m.group !== group.id));
    setEvents(es => es.filter(e => e.group !== group.id));
  }

  async function handleAddMember(form) {
    const row = await api.createMember(form);
    setMembers(ms => [...ms, normMember(row)]);
    setAddMemberGroup(null);
  }

  async function handleEditMember(form) {
    const row = await api.updateMember(editMemberData.id, form);
    setMembers(ms => ms.map(m => m.id === row.id ? normMember(row) : m));
    setEditMemberData(null);
  }

  async function handleDeleteMember(person) {
    await api.deleteMember(person.id);
    setMembers(ms => ms.filter(m => m.id !== person.id));
  }

  async function handleAddEvent(form) {
    const row = await api.createEvent({ ...form, groupId: addEventGroup.id });
    setEvents(es => [...es, normEvent(row)]);
    setAddEventGroup(null);
  }

  async function handleEditEvent(form) {
    const row = await api.updateEvent(editEventData.id, form);
    setEvents(es => es.map(e => e.id === row.id ? normEvent(row) : e));
    setEditEventData(null);
  }

  async function handleDeleteEvent(ev) {
    await api.deleteEvent(ev.id);
    setEvents(es => es.filter(e => e.id !== ev.id));
  }

  const SIDES = [
    { id: 'sahmbi', label: '🌸 Sahmbi Family', sub: "Mother's side" },
    { id: 'virdi',  label: '🏠 Virdi Family',  sub: "Father's side" },
    { id: 'custom', label: '✨ My Groups',       sub: 'Custom groups' },
  ];

  return (
    <div>
      {/* Side tabs + stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {SIDES.map(s => {
          const c = sc(s.id);
          return (
            <button
              key={s.id}
              onClick={() => changeSide(s.id)}
              style={{ padding: '10px 20px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${side === s.id ? c.border : 'var(--border)'}`, background: side === s.id ? c.accent : 'transparent', color: side === s.id ? 'var(--text)' : 'var(--text-3)', textAlign: 'left' }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.sub}</div>
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setAddGroupOpen(true)}
            style={{ padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: 'var(--accent)', color: '#fff' }}
          >
            + {side === 'custom' ? 'New Group' : 'Add Family'}
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{totalMembers}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>members</div>
          </div>
          {upcomingCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{upcomingCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>bdays soon</div>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, nickname, or relation…"
        style={{ width: '100%', padding: '11px 16px', borderRadius: 14, marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>Loading directory…</div>
      ) : filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-3)' }}>
          {side === 'custom' ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-2)' }}>No custom groups yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>Click <strong style={{ color: 'var(--text)' }}>+ New Group</strong> to create a group like<br />"Work Friends", "College Buddies", or "Thailand Friends"</div>
            </>
          ) : (
            <div>No groups found</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filteredGroups.map(group => {
            const grpMembers = members.filter(m => m.group === group.id);
            const grpEvents  = events.filter(e => e.group === group.id);
            if (search.trim()) {
              const q = search.toLowerCase();
              const matchedMembers = grpMembers.filter(m =>
                m.petName.toLowerCase().includes(q) || m.realName.toLowerCase().includes(q) || m.relation.toLowerCase().includes(q)
              );
              if (matchedMembers.length === 0 && !group.label.toLowerCase().includes(q)) return null;
            }
            return (
              <GroupCard
                key={group.id}
                group={group}
                members={grpMembers}
                events={grpEvents}
                contacts={state.familyContacts}
                onPersonClick={setSelectedPerson}
                onEditGroup={setEditGroupData}
                onDeleteGroup={handleDeleteGroup}
                onAddMember={setAddMemberGroup}
                onEditMember={setEditMemberData}
                onDeleteMember={handleDeleteMember}
                onAddEvent={setAddEventGroup}
                onEditEvent={setEditEventData}
                onDeleteEvent={handleDeleteEvent}
              />
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {addGroupOpen && (
        <GroupModal onSave={handleAddGroup} onClose={() => setAddGroupOpen(false)} />
      )}
      {editGroupData && (
        <GroupModal group={editGroupData} onSave={handleEditGroup} onClose={() => setEditGroupData(null)} />
      )}

      {(addMemberGroup || editMemberData) && (
        <MemberModal
          member={editMemberData}
          groups={sideGroups}
          defaultGroupId={addMemberGroup?.id}
          onSave={editMemberData ? handleEditMember : handleAddMember}
          onClose={() => { setAddMemberGroup(null); setEditMemberData(null); }}
        />
      )}

      {(addEventGroup || editEventData) && (
        <EventModal
          event={editEventData}
          onSave={editEventData ? handleEditEvent : handleAddEvent}
          onClose={() => { setAddEventGroup(null); setEditEventData(null); }}
        />
      )}

      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          groups={groups}
          contacts={state.familyContacts[selectedPerson.id] || {}}
          onSave={(id, fields) => dispatch({ type: 'SET_FAMILY_CONTACT', id, fields })}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}

// ─── School Term Form Modal ───────────────────────────────────────────────────

function SchoolTermFormModal({ term, onClose, onSave }) {
  const isEdit = !!term;
  const [form, setForm] = useState({
    label:        term?.label        || '',
    date_display: term?.date_display || '',
    date_start:   term?.date_start   || '',
    color:        term?.color        || '#6366f1',
    sort_order:   term?.sort_order   ?? 0,
  });
  const valid = form.label.trim();

  async function handleSave() {
    if (!valid) return;
    await onSave({ ...form, sort_order: Number(form.sort_order) });
    onClose();
  }

  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={isEdit ? 'Edit Term / Milestone' : 'Add Term / Milestone'} onClose={onClose} />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Label *</label>
          <input autoFocus style={INPUT} value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Term 3 begins" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Display date / range</label>
          <input style={INPUT} value={form.date_display} onChange={e => setForm(p => ({ ...p, date_display: e.target.value }))} placeholder="e.g. 17 Aug 2026  or  25 Jul – 14 Aug 2026" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Start date <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(for countdown)</span></label>
          <input type="date" style={INPUT} value={form.date_start} onChange={e => setForm(p => ({ ...p, date_start: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TERM_COLORS.map(c => (
              <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                style={{ width: 28, height: 28, borderRadius: 8, border: `3px solid ${form.color === c ? '#fff' : 'transparent'}`, background: c, cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
            <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }} title="Custom colour" />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Sort order</label>
          <input type="number" style={{ ...INPUT, width: 90 }} value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} min="0" />
        </div>
      </div>
      <ModalFooter onSave={handleSave} onClose={onClose} saveLabel={isEdit ? 'Save Changes' : 'Add Term'} disabled={!valid} />
    </ModalBase>
  );
}

// ─── Moment Form Modal ────────────────────────────────────────────────────────

function MomentFormModal({ moment, onClose, onSave }) {
  const isEdit = !!moment;
  const [form, setForm] = useState({
    caption:     moment?.caption     || '',
    emoji:       moment?.emoji       || '📸',
    moment_date: moment?.moment_date || '',
    notes:       moment?.notes       || '',
  });
  const valid = form.caption.trim();

  async function handleSave() {
    if (!valid) return;
    await onSave(form);
    onClose();
  }

  return (
    <ModalBase onClose={onClose}>
      <ModalHeader title={isEdit ? 'Edit Moment' : 'Add Family Moment'} onClose={onClose} />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Caption *</label>
          <input autoFocus style={INPUT} value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} placeholder="What happened?" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Emoji</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MOMENT_EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(p => ({ ...p, emoji: e }))}
                style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.emoji === e ? 'var(--accent)' : 'var(--border)'}`, background: form.emoji === e ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Date</label>
          <input type="date" style={INPUT} value={form.moment_date} onChange={e => setForm(p => ({ ...p, moment_date: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Notes</label>
          <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 68 }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any extra details…" />
        </div>
      </div>
      <ModalFooter onSave={handleSave} onClose={onClose} saveLabel={isEdit ? 'Save Changes' : 'Add Moment'} disabled={!valid} />
    </ModalBase>
  );
}

// ─── Moment Card (hover reveals edit/delete) ──────────────────────────────────

function MomentCard({ m, onEdit, onDelete, fmtDate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: 18, background: 'linear-gradient(135deg,var(--surface-2),var(--surface))', border: '1px solid var(--border)', overflow: 'hidden', transition: 'transform .15s', position: 'relative', transform: hovered ? 'scale(1.02)' : 'scale(1)' }}
    >
      {hovered && (
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, zIndex: 2 }}>
          <button onClick={onEdit}   style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
          <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(239,68,68,0.75)', cursor: 'pointer', fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
        </div>
      )}
      <div style={{ aspectRatio: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 10px' }}>
        <div style={{ fontSize: 36 }}>{m.emoji || '📸'}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{m.caption}</div>
          {m.moment_date && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{fmtDate(m.moment_date)}</div>}
          {m.notes && <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.notes}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Family Wall ──────────────────────────────────────────────────────────────

function FamilyWall({ state, dispatch }) {
  const [shopInput,    setShopInput]    = useState('');
  const [moments,      setMoments]      = useState([]);
  const [momLoading,   setMomLoading]   = useState(true);
  const [momModal,     setMomModal]     = useState(null);
  const [terms,        setTerms]        = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termModal,    setTermModal]    = useState(null); // null | 'new' | term-object
  const shopDone = state.shopList.filter(i => i.done).length;

  useEffect(() => {
    api.getMoments()
      .then(rows => setMoments(rows))
      .catch(console.error)
      .finally(() => setMomLoading(false));
    api.getSchoolTerms()
      .then(rows => setTerms(rows))
      .catch(console.error)
      .finally(() => setTermsLoading(false));
  }, []);

  async function handleAddShop() {
    const v = shopInput.trim();
    if (!v) return;
    setShopInput('');
    try {
      const row = await api.addShopItem(v);
      dispatch({ type: 'ADD_SHOP', shopItem: row });
    } catch {
      dispatch({ type: 'ADD_SHOP', shopItem: { id: 's' + Date.now(), item: v, done: false } });
    }
  }

  async function handleSaveTerm(form) {
    if (termModal === 'new') {
      const row = await api.createSchoolTerm(form);
      setTerms(ts => [...ts, row].sort((a, b) => a.sort_order - b.sort_order));
    } else {
      const row = await api.updateSchoolTerm(termModal.id, form);
      setTerms(ts => ts.map(t => t.id === row.id ? row : t).sort((a, b) => a.sort_order - b.sort_order));
    }
  }

  async function handleDeleteTerm(t) {
    if (!window.confirm(`Remove "${t.label}"?`)) return;
    await api.deleteSchoolTerm(t.id);
    setTerms(ts => ts.filter(x => x.id !== t.id));
  }

  async function handleSaveMoment(form) {
    if (momModal === 'new') {
      const row = await api.createMoment(form);
      setMoments(ms => [row, ...ms]);
    } else {
      const row = await api.updateMoment(momModal.id, form);
      setMoments(ms => ms.map(m => m.id === row.id ? row : m));
    }
  }

  async function handleDeleteMoment(m) {
    if (!window.confirm(`Delete "${m.caption}"?`)) return;
    await api.deleteMoment(m.id);
    setMoments(ms => ms.filter(x => x.id !== m.id));
  }

  function fmtDate(d) {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  }

  function daysFromDate(iso) {
    if (!iso) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(iso + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 18, alignItems: 'start' }}>
      {/* Jasleen's school year */}
      <section style={{ gridColumn: 'span 7', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>📚</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Jasleen's School Year</span>
          </div>
          <button onClick={() => setTermModal('new')}
            style={{ padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, background: 'var(--accent)', color: '#fff' }}>
            + Add
          </button>
        </div>
        {termsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
        ) : terms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>No terms added yet</div>
        ) : terms.map(t => {
          const days = daysFromDate(t.date_start);
          const isPast = days !== null && days < 0;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 16px', borderRadius: 15, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 8, opacity: isPast ? 0.55 : 1 }}>
              <div style={{ width: 4, height: 44, borderRadius: 99, background: t.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
                {t.date_display && <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{t.date_display}</div>}
              </div>
              {days !== null && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isPast ? 'var(--text-3)' : t.color }}>
                    {isPast ? 'Done' : days === 0 ? 'Today' : days}
                  </div>
                  {!isPast && days !== 0 && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>days</div>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <IBtn icon="✏️" onClick={() => setTermModal(t)} title="Edit" />
                <IBtn icon="🗑️" onClick={() => handleDeleteTerm(t)} title="Remove" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Shopping list */}
      <section style={{ gridColumn: 'span 5', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Shopping List</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{shopDone}/{state.shopList.length}</span>
        </div>
        {state.shopList.map(item => (
          <CheckRow key={item.id} done={item.done} onToggle={() => {
            dispatch({ type: 'TOGGLE_SHOP', id: item.id });
            api.toggleShopItem(item.id, !item.done).catch(() => {});
          }} label={item.item} accent="#6366f1" />
        ))}
        <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
          <input type="text" value={shopInput} onChange={e => setShopInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddShop()} placeholder="Add item…"
            style={{ flex: 1, padding: '10px 13px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }} />
          <button onClick={handleAddShop} style={{ padding: '10px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: '#fff' }}>+</button>
        </div>
      </section>

      {/* Family moments */}
      <section style={{ gridColumn: 'span 12', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>📸</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Family Moments</span>
          </div>
          <button
            onClick={() => setMomModal('new')}
            style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: 'var(--accent)', color: '#fff' }}
          >
            + Add Moment
          </button>
        </div>

        {momLoading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
        ) : moments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>No moments yet</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>Click <strong style={{ color: 'var(--text)' }}>+ Add Moment</strong> to capture a family memory</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 13 }}>
            {moments.map(m => (
              <MomentCard key={m.id} m={m} onEdit={() => setMomModal(m)} onDelete={() => handleDeleteMoment(m)} fmtDate={fmtDate} />
            ))}
            {/* Add tile */}
            <div onClick={() => setMomModal('new')}
              style={{ borderRadius: 18, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', color: 'var(--text-3)', transition: 'all .15s', minHeight: 160 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Add moment</span>
            </div>
          </div>
        )}
      </section>

      {momModal && (
        <MomentFormModal
          moment={momModal === 'new' ? null : momModal}
          onClose={() => setMomModal(null)}
          onSave={handleSaveMoment}
        />
      )}
      {termModal && (
        <SchoolTermFormModal
          term={termModal === 'new' ? null : termModal}
          onClose={() => setTermModal(null)}
          onSave={handleSaveTerm}
        />
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function FamilySpace() {
  const { state, dispatch } = useAppStore();
  const tab = state.familyTab || 'wall';

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
        {[
          { id: 'wall',      label: '🏠 Family Wall' },
          { id: 'directory', label: '📖 Family Directory' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'SET_FAMILY_TAB', tab: t.id })}
            style={{ padding: '9px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, border: `1px solid ${tab === t.id ? 'var(--accent)' : 'var(--border)'}`, background: tab === t.id ? 'rgba(99,102,241,0.16)' : 'transparent', color: tab === t.id ? 'var(--text)' : 'var(--text-3)' }}
          >{t.label}</button>
        ))}
      </div>
      {tab === 'wall'      && <FamilyWall      state={state} dispatch={dispatch} />}
      {tab === 'directory' && <DirectoryView   state={state} dispatch={dispatch} />}
    </div>
  );
}
