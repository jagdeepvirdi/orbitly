import { useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { APP_TODAY } from '../../utils/dateUtils';
import { parseRecipeText, extractTextFromPDF } from '../../utils/recipeParser';
import { api } from '../../api/client';

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];
const SHORT_SLOT = { Breakfast: 'B', Lunch: 'L', Dinner: 'D' };
const RECIPE_CATS = ['All','Breakfast','Lunch','Dinner','Snack','Dessert','Indian','Thai','Italian','Healthy','Quick'];
const SOURCE_ICONS = { text: '📝', pdf: '📄', image: '🖼️', youtube: '▶️' };

const SLOT_COLORS = {
  Breakfast: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', accent: '#fbbf24' },
  Lunch:     { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', accent: '#10b981' },
  Dinner:    { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)', accent: '#6366f1' },
};

function getWeekDays(offset = 0) {
  const today = new Date(APP_TODAY);
  const dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon + offset * 7);
  const todayISO = APP_TODAY.toISOString().slice(0, 10);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      iso,
      dow: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
      day: d.getDate(),
      month: months[d.getMonth()],
      isToday: iso === todayISO,
      isWeekend: i >= 5,
    };
  });
}

function fmtWeekRange(days) {
  const f = days[0], l = days[6];
  if (f.month === l.month) return `${f.day}–${l.day} ${f.month} ${f.iso.slice(0,4)}`;
  return `${f.day} ${f.month} – ${l.day} ${l.month}`;
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '22px 24px', ...style }}>
      {children}
    </div>
  );
}

function ViewBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'var(--text-2)', transition: 'all .15s',
    }}>{label}</button>
  );
}

/* ── Meal Plan ─────────────────────────────────────────── */

function MealPlanView({ recipes, mealPlan, dispatch, shopList }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [assigning, setAssigning]   = useState(null); // { key, slotLabel }
  const [search, setSearch]         = useState('');
  const days = getWeekDays(weekOffset);

  function assignRecipe(recipeId) {
    if (assigning) {
      dispatch({ type: 'SET_MEAL', key: assigning.key, recipeId });
      setAssigning(null);
    }
  }

  function clearMeal(key) {
    dispatch({ type: 'CLEAR_MEAL', key });
  }

  async function addDayToShop(iso) {
    const dayIngredients = [];
    MEAL_SLOTS.forEach(slot => {
      const key = `${iso}-${slot.toLowerCase()}`;
      const rid = mealPlan[key];
      if (!rid) return;
      const rec = recipes.find(r => r.id === rid);
      if (rec?.ingredients) dayIngredients.push(...rec.ingredients);
    });
    const existing = new Set(shopList.map(i => i.item.toLowerCase()));
    await Promise.all(dayIngredients.map(async ing => {
      if (!existing.has(ing.toLowerCase())) {
        existing.add(ing.toLowerCase());
        try {
          const row = await api.addShopItem(ing);
          dispatch({ type: 'ADD_SHOP', shopItem: row });
        } catch {
          dispatch({ type: 'ADD_SHOP', shopItem: { id: 's' + Date.now() + Math.random(), item: ing, done: false } });
        }
      }
    }));
  }

  async function addWeekToShop() {
    for (const d of days) await addDayToShop(d.iso);
  }

  const filteredForPicker = recipes.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 500 }}>Week of {fmtWeekRange(days)}</div>
        <button onClick={() => setWeekOffset(o => o + 1)} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', fontFamily: 'inherit' }}>Today's week</button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={addWeekToShop}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-2)',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
          Add week to shopping
        </button>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
            <div />
            {days.map(d => (
              <div key={d.iso} style={{
                textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                background: d.isToday ? 'var(--accent)' : d.isWeekend ? 'var(--surface)' : 'transparent',
                color: d.isToday ? '#fff' : d.isWeekend ? 'var(--text-3)' : 'var(--text)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{d.dow}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{d.day}</div>
                <div style={{ fontSize: 11, color: d.isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-3)' }}>{d.month}</div>
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {MEAL_SLOTS.map(slot => {
            const sc = SLOT_COLORS[slot];
            return (
              <div key={slot} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: sc.accent, textTransform: 'uppercase',
                  letterSpacing: '.04em', paddingRight: 4,
                }}>
                  {SHORT_SLOT[slot]}
                </div>
                {days.map(d => {
                  const key = `${d.iso}-${slot.toLowerCase()}`;
                  const rid = mealPlan[key];
                  const rec = rid ? recipes.find(r => r.id === rid) : null;
                  return (
                    <div key={d.iso} style={{
                      minHeight: 72, borderRadius: 12,
                      background: rec ? sc.bg : 'var(--surface)',
                      border: `1px solid ${rec ? sc.border : 'var(--border)'}`,
                      padding: '8px', position: 'relative', cursor: rec ? 'default' : 'pointer',
                      transition: 'border-color .15s',
                    }}
                      onClick={!rec ? () => { setAssigning({ key, slotLabel: `${slot} · ${d.dow} ${d.day}` }); setSearch(''); } : undefined}
                    >
                      {rec ? (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 600, color: sc.accent, lineHeight: 1.3 }}>{rec.title}</div>
                          {rec.cuisine && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{rec.cuisine}</div>}
                          <button
                            onClick={e => { e.stopPropagation(); clearMeal(key); }}
                            style={{
                              position: 'absolute', top: 5, right: 5,
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-3)', padding: 2,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); addDayToShop(d.iso); }}
                            title="Add ingredients to shopping list"
                            style={{
                              position: 'absolute', bottom: 5, right: 5,
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: sc.accent, padding: 2, opacity: 0.8,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18"/></svg>
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', fontSize: 18 }}>+</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recipe picker overlay */}
      {assigning && (
        <div onClick={() => setAssigning(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--surface-solid)', borderRadius: 18, border: '1px solid var(--border-strong)', padding: '22px 22px 18px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Assign Recipe · {assigning.slotLabel}</div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search recipes..."
              style={{ padding: '9px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, marginBottom: 12 }}
              autoFocus
            />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {filteredForPicker.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '20px 0' }}>
                  {recipes.length === 0 ? 'No recipes yet — add some in the Recipes tab first.' : 'No recipes match.'}
                </div>
              )}
              {filteredForPicker.map(r => (
                <button key={r.id} onClick={() => assignRecipe(r.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11,
                  border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left', width: '100%',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                    {r.cuisine && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.cuisine}</div>}
                  </div>
                  {r.ingredients?.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.ingredients.length} ing.</div>}
                </button>
              ))}
            </div>
            <button onClick={() => setAssigning(null)} style={{ marginTop: 14, padding: '9px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Recipe Library ─────────────────────────────────────── */

function RecipesView({ recipes, dispatch }) {
  const [filter, setFilter]     = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = filter === 'All' ? recipes : recipes.filter(r =>
    r.category === filter || r.cuisine === filter || r.tags?.includes(filter)
  );

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {RECIPE_CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
            background: filter === c ? 'var(--accent)' : 'var(--surface)',
            color: filter === c ? '#fff' : 'var(--text-2)',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {recipes.length === 0 ? 'No recipes yet' : `No ${filter} recipes`}
          </div>
          <div style={{ fontSize: 13 }}>Switch to the Import tab to add your first recipe.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(r => (
          <div key={r.id} style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 18px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.category && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(132,204,22,0.15)', color: '#84cc16' }}>{r.category}</span>}
                    {r.cuisine && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-2)', color: 'var(--text-3)' }}>{r.cuisine}</span>}
                    {r.servings && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Serves {r.servings}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.sourceType && <span style={{ fontSize: 16 }}>{SOURCE_ICONS[r.sourceType] || '📝'}</span>}
                  <button onClick={() => dispatch({ type: 'DELETE_RECIPE', id: r.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 3 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
              {r.ingredients?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--text-3)' }}>🥕 </span>
                  {r.ingredients.slice(0, 3).join(' · ')}
                  {r.ingredients.length > 3 && <span style={{ color: 'var(--text-3)' }}> +{r.ingredients.length - 3} more</span>}
                </div>
              )}
            </div>
            <button
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              style={{
                width: '100%', padding: '10px 18px', borderTop: '1px solid var(--border)',
                background: 'none', border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0,
                cursor: 'pointer', color: 'var(--text-3)', fontFamily: 'inherit', fontSize: 12.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {expanded === r.id ? 'Hide details' : 'View recipe'}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                {expanded === r.id ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
              </svg>
            </button>

            {expanded === r.id && (
              <div style={{ padding: '16px 18px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {r.ingredients?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 8 }}>Ingredients</div>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {r.ingredients.map((ing, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-2)' }}>{ing}</li>)}
                    </ul>
                  </div>
                )}
                {r.steps?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 8 }}>Instructions</div>
                    <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {r.steps.map((s, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{s.text || s}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Import Recipe ──────────────────────────────────────── */

const EMPTY_FORM = { title: '', category: 'Dinner', cuisine: '', servings: '', ingredients: '', steps: '' };

function ImportView({ dispatch }) {
  const [importTab, setImportTab] = useState('text');
  const [text, setText]           = useState('');
  const [parsed, setParsed]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [ytUrl, setYtUrl]         = useState('');
  const fileRef = useRef();
  const imgRef  = useRef();

  function applyParsed(p) {
    if (!p) return;
    setParsed(p);
    setForm({
      ...EMPTY_FORM,
      title: p.title || '',
      servings: p.servings || '',
      ingredients: (p.ingredients || []).join('\n'),
      steps: (p.steps || []).map(s => s.text || s).join('\n'),
    });
  }

  function handleParseText() {
    applyParsed(parseRecipeText(text));
    if (!parseRecipeText(text)) setError('Could not parse recipe. Make sure it has clear Ingredients and Instructions sections.');
  }

  async function handlePDF(file) {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const extracted = await extractTextFromPDF(file);
      applyParsed(parseRecipeText(extracted));
    } catch (e) {
      setError('Could not read PDF: ' + e.message);
    } finally { setLoading(false); }
  }

  async function handleImage(file) {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        const base64 = ev.target.result.split(',')[1];
        const mimeType = file.type;
        try {
          const res = await fetch('/api/recipes/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mimeType }),
          });
          if (!res.ok) throw new Error('API not available');
          const data = await res.json();
          applyParsed(data);
        } catch {
          setError('Image extraction requires the AI server with Claude API configured. Use text paste or PDF instead.');
        } finally { setLoading(false); }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleYouTube() {
    if (!ytUrl.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/recipes/extract-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl.trim() }),
      });
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      applyParsed(data);
    } catch {
      setError('YouTube extraction requires the AI server with Claude API configured. Use text paste or PDF instead.');
    } finally { setLoading(false); }
  }

  function saveRecipe() {
    const ings = form.ingredients.split('\n').map(s => s.trim()).filter(Boolean);
    const stes = form.steps.split('\n').map((s, i) => ({ n: i+1, text: s.trim() })).filter(s => s.text);
    dispatch({
      type: 'ADD_RECIPE',
      recipe: {
        title: form.title || 'Untitled',
        category: form.category,
        cuisine: form.cuisine,
        servings: form.servings,
        ingredients: ings,
        steps: stes,
        sourceType: importTab,
        source: importTab === 'youtube' ? ytUrl : '',
      },
    });
    setParsed(null); setForm(EMPTY_FORM); setText(''); setYtUrl('');
    setSuccess('Recipe saved to library!');
    setTimeout(() => setSuccess(''), 3000);
  }

  const tabs = [
    { key: 'text',    icon: '📝', label: 'Paste Text' },
    { key: 'pdf',     icon: '📄', label: 'Upload PDF' },
    { key: 'image',   icon: '🖼️', label: 'Photo' },
    { key: 'youtube', icon: '▶️', label: 'YouTube' },
  ];

  return (
    <div style={{ maxWidth: 760 }}>
      {success && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {/* Import method tabs */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setImportTab(t.key); setParsed(null); setError(''); }} style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: importTab === t.key ? 'var(--accent)' : 'var(--surface)',
              color: importTab === t.key ? '#fff' : 'var(--text-2)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {/* Text */}
        {importTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Paste a recipe — include an Ingredients section and Instructions section for best results.</div>
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              placeholder={'Butter Chicken\nServes: 4\n\nIngredients\n- 500g chicken\n- 2 tbsp butter\n...\n\nInstructions\n1. Marinate chicken...\n2. Cook sauce...'}
              rows={12}
              style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
            />
            <button onClick={handleParseText} disabled={!text.trim()} style={{ alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 11, border: 'none', background: text.trim() ? 'var(--accent)' : 'var(--surface)', color: text.trim() ? '#fff' : 'var(--text-3)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default' }}>
              Parse Recipe
            </button>
          </div>
        )}

        {/* PDF */}
        {importTab === 'pdf' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Upload a PDF recipe (text-based PDFs work best — scanned PDFs may not extract correctly).</div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed var(--border-strong)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface)' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Click to choose PDF file</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Max 10 pages</div>
              {loading && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>Extracting text...</div>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => handlePDF(e.target.files?.[0])} />
          </div>
        )}

        {/* Image */}
        {importTab === 'image' && (
          <div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', fontSize: 13, color: '#fdba74', marginBottom: 14 }}>
              ✨ <strong>AI-powered</strong> — requires Claude API configured in the backend server.
            </div>
            <div
              onClick={() => imgRef.current?.click()}
              style={{ border: '2px dashed var(--border-strong)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface)' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Upload recipe photo or screenshot</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>JPG, PNG, WEBP</div>
              {loading && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>Sending to AI...</div>}
            </div>
            <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImage(e.target.files?.[0])} />
          </div>
        )}

        {/* YouTube */}
        {importTab === 'youtube' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', fontSize: 13, color: '#fdba74' }}>
              ✨ <strong>AI-powered</strong> — extracts recipe from the video transcript. Requires Claude API configured in the backend server.
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Paste a YouTube cooking video link — the recipe in the description or transcript will be extracted.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14 }}
              />
              <button onClick={handleYouTube} disabled={!ytUrl.trim() || loading} style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: ytUrl.trim() ? '#ef4444' : 'var(--surface)', color: ytUrl.trim() ? '#fff' : 'var(--text-3)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: ytUrl.trim() ? 'pointer' : 'default' }}>
                {loading ? '...' : 'Extract'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Parsed preview / edit form */}
      {parsed && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: '#84cc16' }}>✓ Recipe extracted — review and save</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Recipe title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14 }}>
                {['Breakfast','Lunch','Dinner','Snack','Dessert','Drink'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Cuisine</label>
              <input value={form.cuisine} onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))} placeholder="e.g. Indian, Thai, Italian" style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Servings</label>
              <input value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} placeholder="e.g. 4" style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Ingredients (one per line)</label>
              <textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} rows={6} style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Instructions (one step per line)</label>
              <textarea value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} rows={6} style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setParsed(null)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Discard</button>
            <button onClick={saveRecipe} style={{ flex: 2, padding: '11px', borderRadius: 11, border: 'none', background: '#84cc16', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Save to Recipe Library</button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Main Food Planner ──────────────────────────────────── */

export default function FoodPlanner() {
  const { state, dispatch } = useAppStore();
  const mob = state.isMobile;
  const [view, setView] = useState('plan');

  const recipes  = state.recipes  || [];
  const mealPlan = state.mealPlan || {};
  const shopList = state.shopList || [];

  const mealsPlanned = Object.keys(mealPlan).length;
  const recipesCount = recipes.length;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: mob ? '16px 12px 60px' : '26px 34px 60px' }}>
      {/* Hero */}
      <div style={{
        borderRadius: 20, padding: '26px 28px', marginBottom: 26,
        background: 'linear-gradient(120deg, rgba(132,204,22,0.15), rgba(16,185,129,0.08))',
        border: '1px solid rgba(132,204,22,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(140deg, #84cc16, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(132,204,22,0.3)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 600, fontStyle: 'italic' }}>Food Planner</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 2 }}>
              {mealsPlanned} meal{mealsPlanned !== 1 ? 's' : ''} planned · {recipesCount} recipe{recipesCount !== 1 ? 's' : ''} in library
            </div>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 3, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 24, width: 'fit-content' }}>
        <ViewBtn label="Meal Plan"      active={view === 'plan'}    onClick={() => setView('plan')} />
        <ViewBtn label="Recipes"        active={view === 'recipes'} onClick={() => setView('recipes')} />
        <ViewBtn label="Import Recipe"  active={view === 'import'}  onClick={() => setView('import')} />
      </div>

      {view === 'plan'    && <MealPlanView recipes={recipes} mealPlan={mealPlan} dispatch={dispatch} shopList={shopList} />}
      {view === 'recipes' && <RecipesView  recipes={recipes} dispatch={dispatch} />}
      {view === 'import'  && <ImportView   dispatch={dispatch} />}
    </div>
  );
}
