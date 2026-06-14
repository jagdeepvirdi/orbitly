import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { APP_TODAY } from '../../utils/dateUtils';

const HOBBY_COLORS = ['#f97316','#6366f1','#10b981','#f43f5e','#f59e0b','#a855f7','#0ea5e9','#84cc16'];

const HOBBY_TYPES = ['Art & Craft','Photography','Music','Reading','Gaming','Cooking','Gardening','Fitness','Travel','Writing','DIY','Other'];

function fmtDate(iso) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = iso.split('-');
  return `${d} ${months[+m-1]} ${y}`;
}

function daysFromToday(iso) {
  const t = new Date(iso);
  const now = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate());
  return Math.round((t - now) / 86400000);
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--text-2)',
        transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
      padding: '22px 24px', ...style,
    }}>
      {children}
    </div>
  );
}

function UpcomingTab({ importedCalEvents }) {
  const hobbyEvents = importedCalEvents
    .filter(e => e.category === 'hobby' && e.date >= APP_TODAY.toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);

  const pastEvents = importedCalEvents
    .filter(e => e.category === 'hobby' && e.date < APP_TODAY.toISOString().slice(0, 10))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (!hobbyEvents.length && !pastEvents.length) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No hobby events yet</div>
          <div style={{ fontSize: 13 }}>Import a .ics file from the Calendar section and assign it the <strong style={{ color: '#f97316' }}>Hobby</strong> category — events will appear here.</div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hobbyEvents.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hobbyEvents.map(ev => {
              const d = daysFromToday(ev.date);
              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '11px 14px', borderRadius: 12,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderLeft: '3px solid #f97316',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.title}</div>
                    {ev.location && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{ev.location}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{fmtDate(ev.date)}</div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, marginTop: 2,
                      color: d === 0 ? '#10b981' : d <= 3 ? '#f59e0b' : 'var(--text-3)',
                    }}>
                      {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {pastEvents.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>Recent</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastEvents.map(ev => (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 14px', borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
                opacity: 0.7,
              }}>
                <div style={{ flex: 1, fontSize: 14 }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(ev.date)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ProjectsTab({ hobbyProjects, dispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [name,  setName]  = useState('');
  const [color, setColor] = useState(HOBBY_COLORS[0]);
  const [desc,  setDesc]  = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    dispatch({ type: 'ADD_HOBBY_PROJECT', project: { name: name.trim(), color, desc: desc.trim(), progress: 0 } });
    setName(''); setDesc(''); setColor(HOBBY_COLORS[0]); setShowForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hobbyProjects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {hobbyProjects.map(p => (
            <Card key={p.id} style={{ position: 'relative' }}>
              <button
                onClick={() => dispatch({ type: 'DELETE_HOBBY_PROJECT', id: p.id })}
                style={{
                  position: 'absolute', top: 14, right: 14, background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: p.color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.color }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
              </div>
              {p.desc && <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>{p.desc}</div>}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
                  <span>Progress</span><span>{p.progress}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: p.color, width: `${p.progress}%`, transition: 'width .3s' }} />
                </div>
              </div>
              <input
                type="range" min={0} max={100} value={p.progress}
                onChange={e => dispatch({ type: 'UPDATE_HOBBY_PROJECT', id: p.id, fields: { progress: +e.target.value } })}
                style={{ width: '100%', accentColor: p.color, cursor: 'pointer' }}
              />
            </Card>
          ))}
        </div>
      )}
      {showForm ? (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>New Hobby Project</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Project name e.g. Watercolour series"
              style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14,
              }}
            />
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Short description (optional)"
              rows={2}
              style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14,
                resize: 'none',
              }}
            />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Colour</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {HOBBY_COLORS.map(c => (
                  <button
                    key={c} onClick={() => setColor(c)}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', background: c, border: 'none',
                      cursor: 'pointer', outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Add Project</button>
            </div>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: '2px dashed var(--border-strong)', background: 'transparent',
            color: 'var(--text-3)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add Hobby Project
        </button>
      )}
    </div>
  );
}

function LogTab({ hobbyLog, dispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [hobby, setHobby]   = useState('');
  const [dur,   setDur]     = useState('');
  const [notes, setNotes]   = useState('');
  const today = APP_TODAY.toISOString().slice(0, 10);

  function handleLog() {
    if (!hobby.trim()) return;
    dispatch({ type: 'ADD_HOBBY_LOG', entry: { hobby: hobby.trim(), duration: dur.trim(), notes: notes.trim(), date: today } });
    setHobby(''); setDur(''); setNotes(''); setShowForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showForm ? (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Log Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select
              value={hobby} onChange={e => setHobby(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: hobby ? 'var(--text)' : 'var(--text-3)', fontFamily: 'inherit', fontSize: 14 }}
            >
              <option value="">Select hobby...</option>
              {HOBBY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              value={dur} onChange={e => setDur(e.target.value)}
              placeholder="Duration e.g. 1 hour, 45 min"
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14 }}
            />
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLog} disabled={!hobby} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: hobby ? 'var(--accent)' : 'var(--surface)', color: hobby ? '#fff' : 'var(--text-3)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: hobby ? 'pointer' : 'default' }}>Log Activity</button>
            </div>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            border: '2px dashed var(--border-strong)', background: 'transparent',
            color: 'var(--text-3)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Log Activity Today
        </button>
      )}
      {hobbyLog.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>Activity Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hobbyLog.map(entry => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 13px', borderRadius: 10,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.hobby}</div>
                  {entry.duration && <div style={{ fontSize: 12, color: '#f97316', marginTop: 2 }}>⏱ {entry.duration}</div>}
                  {entry.notes && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>{entry.notes}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</div>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_HOBBY_LOG', id: entry.id })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 3 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {!hobbyLog.length && !showForm && (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 13 }}>No activity logged yet. Press the button above to log your first session.</div>
        </div>
      )}
    </div>
  );
}

export default function HobbyTracker() {
  const { state, dispatch } = useAppStore();
  const mob = state.isMobile;
  const [tab, setTab] = useState('upcoming');

  const tabs = [
    ['upcoming', 'Upcoming'],
    ['projects', 'Projects'],
    ['log', 'Log'],
  ];

  const hobbyCount = state.importedCalEvents?.filter(e => e.category === 'hobby' && e.date >= APP_TODAY.toISOString().slice(0, 10)).length || 0;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: mob ? '16px 12px 60px' : '26px 34px 60px' }}>
      {/* Hero */}
      <div style={{
        borderRadius: 20, padding: '26px 28px', marginBottom: 26,
        background: 'linear-gradient(120deg, rgba(249,115,22,0.18), rgba(251,191,36,0.1))',
        border: '1px solid rgba(249,115,22,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(140deg, #f97316, #fbbf24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(249,115,22,0.35)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 600, fontStyle: 'italic' }}>Hobby Tracker</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 2 }}>
              {hobbyCount > 0 ? `${hobbyCount} upcoming event${hobbyCount !== 1 ? 's' : ''} · ` : ''}
              {(state.hobbyProjects || []).length} project{(state.hobbyProjects || []).length !== 1 ? 's' : ''} · {(state.hobbyLog || []).length} logged
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 3, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 22, width: 'fit-content' }}>
        {tabs.map(([key, label]) => <TabBtn key={key} label={label} active={tab === key} onClick={() => setTab(key)} />)}
      </div>

      {tab === 'upcoming' && <UpcomingTab importedCalEvents={state.importedCalEvents || []} />}
      {tab === 'projects' && <ProjectsTab hobbyProjects={state.hobbyProjects || []} dispatch={dispatch} />}
      {tab === 'log'      && <LogTab hobbyLog={state.hobbyLog || []} dispatch={dispatch} />}
    </div>
  );
}
