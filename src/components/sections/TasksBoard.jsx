import { useState } from 'react';
import { useAppStore, CAT, PRIORITY } from '../../store/appStore';
import { fmtShortDate } from '../../utils/dateUtils';
import { api } from '../../api/client';

const COLS = [['todo', 'To Do'], ['doing', 'In Progress'], ['done', 'Done']];
const LANES = [
  { key: 'workTasks', label: 'Work', dot: CAT.work, list: 'work' },
  { key: 'personalTasks', label: 'Personal', dot: CAT.family, list: 'personal' },
];

function ViewBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 15px', borderRadius: 9, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--text-2)',
      }}
    >{label}</button>
  );
}

const BLANK_FORM = { title: '', priority: 'Normal', due: '' };

const inputStyle = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
  color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
};

export default function TasksBoard() {
  const { state, dispatch } = useAppStore();
  const allTasks = state.workTasks.concat(state.personalTasks);
  const doneToday = allTasks.filter(t => t.status === 'done').length;
  const overdueCount = allTasks.filter(t => t.overdue).length;
  const isKanban = state.taskView === 'kanban';

  const [addModal, setAddModal] = useState(null); // 'workTasks' | 'personalTasks' | null
  const [form, setForm] = useState(BLANK_FORM);

  function openModal(list) { setAddModal(list); setForm(BLANK_FORM); }
  function closeModal() { setAddModal(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const due = form.due || null;
    const laneList = LANES.find(l => l.key === addModal)?.list || 'work';
    dispatch({ type: 'ADD_TASK', list: addModal, title: form.title.trim(), priority: form.priority, due });
    closeModal();
    try {
      await api.createTask({ title: form.title.trim(), list: laneList, priority: form.priority, due, status: 'todo' });
    } catch {}
  }

  async function handleAdvance(lane, taskId, currentStatus) {
    const order = ['todo', 'doing', 'done'];
    const nextStatus = order[(order.indexOf(currentStatus) + 1) % 3];
    dispatch({ type: 'ADVANCE_TASK', list: lane.key, id: taskId });
    try {
      await api.updateTask(taskId, { status: nextStatus });
    } catch {}
  }

  async function handleToggle(lane, taskId, currentStatus) {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    dispatch({ type: 'TOGGLE_TASK', list: lane.key, id: taskId });
    try {
      await api.updateTask(taskId, { status: nextStatus });
    } catch {}
  }

  async function handleDelete(lane, taskId) {
    dispatch({ type: 'DELETE_TASK', list: lane.key, id: taskId });
    try {
      await api.deleteTask(taskId);
    } catch {}
  }

  const lanes = LANES.map(({ key, label, dot, list }) => {
    const tasks = state[key];
    return {
      key, label, dot, list,
      total: tasks.length,
      doneCount: tasks.filter(t => t.status === 'done').length,
      columns: COLS.map(([cKey, cLabel]) => ({
        key: cKey, label: cLabel,
        cards: tasks.filter(t => t.status === cKey),
      })),
      checklist: tasks,
    };
  });

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 14,
            background: 'linear-gradient(120deg, rgba(16,185,129,0.16), rgba(16,185,129,0.06))',
            border: '1px solid rgba(16,185,129,0.25)',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{doneToday} of {allTasks.length} done today</span>
          </div>
          {overdueCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 14,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                animation: 'om-pulse 1.6s infinite',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>{overdueCount} overdue</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <ViewBtn label="Kanban" active={isKanban} onClick={() => dispatch({ type: 'SET_TASK_VIEW', view: 'kanban' })} />
          <ViewBtn label="Checklist" active={!isKanban} onClick={() => dispatch({ type: 'SET_TASK_VIEW', view: 'checklist' })} />
        </div>
      </div>

      {/* KANBAN */}
      {isKanban && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {lanes.map(lane => (
              <div key={lane.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: lane.dot }} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{lane.label} Tasks</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                    {lane.doneCount}/{lane.total}
                  </span>
                  <button
                    onClick={() => openModal(lane.key)}
                    style={{
                      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add task
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {lane.columns.map(col => (
                    <div key={col.key} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 16, padding: 13, minHeight: 120,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>
                          {col.label}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, padding: '0 5px',
                          borderRadius: 99, background: 'var(--surface-2)', color: 'var(--text-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {col.cards.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {col.cards.length === 0 && (
                          <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '16px 0', borderRadius: 10, border: '1px dashed var(--border)' }}>
                            No tasks
                          </div>
                        )}
                        {col.cards.map(t => (
                          <KanbanCard
                            key={t.id}
                            task={t}
                            onAdvance={() => handleAdvance(lane, t.id, t.status)}
                            onDelete={() => handleDelete(lane, t.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Tip · click a card to advance it · hover for delete
          </div>
        </>
      )}

      {/* ADD TASK MODAL */}
      {addModal && (
        <div
          onClick={closeModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit}
            style={{ background: 'var(--surface-solid)', border: '1px solid var(--border-strong)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 440 }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Add {addModal === 'workTasks' ? 'Work' : 'Personal'} Task
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title *</div>
              <input
                autoFocus
                style={inputStyle}
                placeholder="What needs to be done?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</div>
                <select
                  style={{ ...inputStyle, appearance: 'none' }}
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                >
                  {['Urgent', 'High', 'Normal', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due date</div>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.due}
                  onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={closeModal}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}
              >Cancel</button>
              <button
                type="submit"
                style={{ flex: 2, padding: '11px 0', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700 }}
              >Add task</button>
            </div>
          </form>
        </div>
      )}

      {/* CHECKLIST */}
      {!isKanban && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 18 }}>
          {lanes.map(lane => (
            <section key={lane.key} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 20, padding: 22,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: lane.dot }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>{lane.label} Tasks</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{lane.doneCount}/{lane.total}</span>
                <button
                  onClick={() => openModal(lane.key)}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-2)', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add task
                </button>
              </div>
              {lane.checklist.map(t => {
                const done = t.status === 'done';
                const checkColor = lane.key === 'workTasks' ? '#64748b' : '#f59e0b';
                return (
                  <CheckRow
                    key={t.id}
                    task={t}
                    done={done}
                    checkColor={checkColor}
                    onToggle={() => handleToggle(lane, t.id, t.status)}
                    onDelete={() => handleDelete(lane, t.id)}
                  />
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanCard({ task: t, onAdvance, onDelete }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onAdvance}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${t.overdue ? 'rgba(239,68,68,0.45)' : 'var(--border)'}`,
        borderRadius: 12, padding: '12px 13px', cursor: 'pointer',
        transition: 'transform .12s, background .15s', position: 'relative',
      }}
      onMouseEnterCapture={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeaveCapture={e => e.currentTarget.style.background = 'var(--surface-2)'}
    >
      <div style={{
        fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 9,
        ...(t.status === 'done' ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}),
      }}>
        {t.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
          background: PRIORITY[t.priority]?.bg || PRIORITY.Normal.bg,
          color: PRIORITY[t.priority]?.color || PRIORITY.Normal.color,
        }}>{t.priority}</span>
        {t.recurring && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        )}
        <span style={{ flex: 1 }} />
        {hov && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{
              width: 20, height: 20, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: t.overdue ? '#fca5a5' : 'var(--text-3)' }}>
          {t.due ? fmtShortDate(t.due) : ''}
        </span>
      </div>
    </div>
  );
}

function CheckRow({ task: t, done, checkColor, onToggle, onDelete }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '11px 10px', margin: '0 -10px', borderRadius: 12,
        background: hov ? 'var(--surface-2)' : 'transparent', transition: 'background .15s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          flex: '0 0 22px', width: 22, height: 22, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${done ? checkColor : 'var(--border-strong)'}`,
          background: done ? checkColor : 'transparent', cursor: 'pointer',
        }}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        )}
      </button>
      <span style={{
        flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500,
        ...(done ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}),
      }}>{t.title}</span>
      {t.recurring && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2">
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
      )}
      <span style={{
        fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7,
        background: PRIORITY[t.priority]?.bg || PRIORITY.Normal.bg,
        color: PRIORITY[t.priority]?.color || PRIORITY.Normal.color,
      }}>{t.priority}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, minWidth: 58, textAlign: 'right',
        color: t.overdue ? '#fca5a5' : 'var(--text-3)',
      }}>{t.due ? fmtShortDate(t.due) : ''}</span>
      {hov && (
        <button
          onClick={onDelete}
          style={{
            width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}
