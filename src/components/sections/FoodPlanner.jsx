import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { APP_TODAY } from '../../utils/dateUtils';
import { parseRecipeText, extractTextFromPDF } from '../../utils/recipeParser';
import { api } from '../../api/client';
import { parseMealDbRecipe } from '../../utils/recipeUtils';

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

/* ── Discover & Cuisine Library ─────────────────────────── */

function ScrollArrowButton({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'}
      style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
        border: '1px solid var(--border)', background: 'var(--surface)',
        color: 'var(--text-2)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {dir < 0 ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}

function DiscoverView({ recipes, dispatch }) {
  const areaScrollRef = useRef(null);
  const categoryScrollRef = useRef(null);

  // Let mouse-wheel scroll these horizontal pill rows (they have no visible
  // scrollbar, so without this, mouse users can't reach items past the fold)
  const handleWheelScroll = e => {
    if (e.deltaY === 0) return;
    e.currentTarget.scrollLeft += e.deltaY;
    e.preventDefault();
  };
  const scrollRow = (ref, dir) => {
    ref.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerRecipe, setDrawerRecipe] = useState(null);
  const [drawerError, setDrawerError] = useState('');
  const [notification, setNotification] = useState('');
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [planDate, setPlanDate] = useState(() => {
    return new Date(APP_TODAY).toISOString().slice(0, 10);
  });
  const [planSlot, setPlanSlot] = useState('Breakfast');

  // Load categories and areas on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getRecipeCategories(), api.getRecipeAreas()])
      .then(([cats, ars]) => {
        if (!isMounted) return;
        setCategories(cats || []);
        setAreas(ars || []);
        // Set default category to first available if everything is empty
        if (cats && cats.length > 0 && selectedCategory === 'All' && selectedArea === 'All' && !searchQuery) {
          setSelectedCategory(cats[0]);
        }
      })
      .catch(err => {
        if (isMounted) setError(err.message || 'Failed to load filters');
      });
    return () => { isMounted = false; };
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch recipes when debounced query, area, category, or categories list changes
  useEffect(() => {
    let isMounted = true;

    if (debouncedQuery.trim()) {
      setLoading(true);
      setError('');
      api.searchRecipes(debouncedQuery)
        .then(res => {
          if (!isMounted) return;
          setResults(res || []);
          setLoading(false);
        })
        .catch(err => {
          if (!isMounted) return;
          setError(err.message || 'Search failed');
          setLoading(false);
        });
    } else {
      // Normal filtering
      if (selectedArea !== 'All') {
        setLoading(true);
        setError('');
        api.getRecipesByArea(selectedArea)
          .then(res => {
            if (!isMounted) return;
            setResults(res || []);
            setLoading(false);
          })
          .catch(err => {
            if (!isMounted) return;
            setError(err.message || 'Failed to fetch by area');
            setLoading(false);
          });
      } else if (selectedCategory !== 'All') {
        setLoading(true);
        setError('');
        api.getRecipesByCategory(selectedCategory)
          .then(res => {
            if (!isMounted) return;
            setResults(res || []);
            setLoading(false);
          })
          .catch(err => {
            if (!isMounted) return;
            setError(err.message || 'Failed to fetch by category');
            setLoading(false);
          });
      } else {
        // Fallback to first category if both are All and search is empty
        if (categories.length > 0) {
          setSelectedCategory(categories[0]);
        } else {
          setResults([]);
        }
      }
    }

    return () => { isMounted = false; };
  }, [debouncedQuery, selectedArea, selectedCategory, categories]);

  // Frontend filter for search results
  const displayedResults = useMemo(() => {
    let filtered = results;
    if (debouncedQuery.trim()) {
      if (selectedArea !== 'All') {
        filtered = filtered.filter(r => r.area === selectedArea);
      }
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(r => r.category === selectedCategory);
      }
    }
    return filtered;
  }, [results, debouncedQuery, selectedArea, selectedCategory]);

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    if (!searchQuery) {
      setSelectedCategory('All');
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    if (!searchQuery) {
      setSelectedArea('All');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedArea('All');
    if (categories.length > 0) {
      setSelectedCategory(categories[0]);
    } else {
      setSelectedCategory('All');
    }
  };

  const openDrawer = (recipeId) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerRecipe(null);
    setDrawerError('');
    setShowPlanPicker(false);
    setNotification('');

    api.getRecipeDetail(recipeId)
      .then(res => {
        setDrawerRecipe(res);
        setDrawerLoading(false);
      })
      .catch(err => {
        setDrawerError(err.message || 'Failed to load recipe details');
        setDrawerLoading(false);
      });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    // Keep the recipe visible during the transition, clear it later
    setTimeout(() => {
      setDrawerRecipe(null);
      setDrawerError('');
    }, 300);
  };

  const handleSaveToLibrary = () => {
    if (!drawerRecipe) return;
    const isSaved = recipes.some(r => r.sourceId === drawerRecipe.idMeal);
    if (isSaved) return;

    const parsed = parseMealDbRecipe(drawerRecipe);
    dispatch({ type: 'ADD_RECIPE', recipe: parsed });
    setNotification('Saved to Recipe Library!');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAddToMealPlan = (e) => {
    e.preventDefault();
    if (!drawerRecipe) return;

    // Save to library first if it doesn't exist there
    let existingRecipe = recipes.find(r => r.sourceId === drawerRecipe.idMeal);
    let recipeId;

    if (!existingRecipe) {
      const parsed = parseMealDbRecipe(drawerRecipe);
      recipeId = parsed.id;
      dispatch({ type: 'ADD_RECIPE', recipe: parsed });
    } else {
      recipeId = existingRecipe.id;
    }

    const key = `${planDate}-${planSlot.toLowerCase()}`;
    dispatch({ type: 'SET_MEAL', key, recipeId });

    setShowPlanPicker(false);
    setNotification('Successfully added to Meal Plan!');
    setTimeout(() => setNotification(''), 3000);
  };

  // Check if current drawer recipe is already saved
  const isCurrentRecipeSaved = drawerRecipe
    ? recipes.some(r => r.sourceId === drawerRecipe.idMeal)
    : false;

  // Pulse animation CSS injection
  const pulseStyle = `
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    .skeleton-pulse {
      animation: pulse 1.5s infinite ease-in-out;
      background: var(--surface-2);
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: pulseStyle }} />

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search global recipes by name (e.g., chicken, beef, chocolate)..."
          style={{
            width: '100%',
            padding: '12px 16px 12px 42px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 15,
            boxSizing: 'border-box',
          }}
        />
        <svg
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
              padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Cuisine / Area Filters */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 8 }}>
          Cuisine
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ScrollArrowButton dir={-1} onClick={() => scrollRow(areaScrollRef, -1)} />
          <div
            ref={areaScrollRef}
            onWheel={handleWheelScroll}
            className="hide-scrollbar"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
          >
            <button
              onClick={() => handleSelectArea('All')}
              style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
                background: selectedArea === 'All' ? 'var(--accent)' : 'var(--surface)',
                color: selectedArea === 'All' ? '#fff' : 'var(--text-2)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all .15s',
              }}
            >
              All Cuisines
            </button>
            {areas.map(area => (
              <button
                key={area}
                onClick={() => handleSelectArea(area)}
                style={{
                  padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
                  background: selectedArea === area ? 'var(--accent)' : 'var(--surface)',
                  color: selectedArea === area ? '#fff' : 'var(--text-2)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all .15s',
                }}
              >
                {area}
              </button>
            ))}
          </div>
          <ScrollArrowButton dir={1} onClick={() => scrollRow(areaScrollRef, 1)} />
        </div>
      </div>

      {/* Category Filters */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 8 }}>
          Category
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ScrollArrowButton dir={-1} onClick={() => scrollRow(categoryScrollRef, -1)} />
          <div
            ref={categoryScrollRef}
            onWheel={handleWheelScroll}
            className="hide-scrollbar"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
          >
            <button
              onClick={() => handleSelectCategory('All')}
              style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
                background: selectedCategory === 'All' ? 'var(--accent)' : 'var(--surface)',
                color: selectedCategory === 'All' ? '#fff' : 'var(--text-2)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all .15s',
              }}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleSelectCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)',
                  background: selectedCategory === cat ? 'var(--accent)' : 'var(--surface)',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-2)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all .15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <ScrollArrowButton dir={1} onClick={() => scrollRow(categoryScrollRef, 1)} />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Recipe Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 220 }}>
              <div className="skeleton-pulse" style={{ height: 130, width: '100%' }} />
              <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton-pulse" style={{ height: 14, width: '85%', borderRadius: 4 }} />
                <div className="skeleton-pulse" style={{ height: 14, width: '55%', borderRadius: 4 }} />
                <div style={{ flex: 1 }} />
                <div className="skeleton-pulse" style={{ height: 18, width: 70, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayedResults.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No recipes found</div>
          <div style={{ fontSize: 13 }}>Try different filters or search keywords.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {displayedResults.map(r => (
            <div
              key={r.id}
              onClick={() => openDrawer(r.id)}
              style={{
                background: 'var(--surface)',
                borderRadius: 14,
                border: '1px solid var(--border)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                height: 230,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Thumbnail */}
              <div style={{ height: 125, width: '100%', overflow: 'hidden', background: 'var(--surface-2)', position: 'relative' }}>
                <img
                  src={r.thumbnail}
                  alt={r.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>

              {/* Card Body */}
              <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: 'var(--text)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 6,
                  }}
                >
                  {r.name}
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.category && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(132,204,22,0.15)', color: '#84cc16' }}>
                      {r.category}
                    </span>
                  )}
                  {r.area && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                      {r.area}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Sliding Drawer */}
      <div>
        {/* Backdrop Overlay */}
        <div
          onClick={closeDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            opacity: drawerOpen ? 1 : 0,
            pointerEvents: drawerOpen ? 'auto' : 'none',
            transition: 'opacity 300ms ease',
            zIndex: 150,
          }}
        />

        {/* Drawer Panel */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxWidth: 550,
            background: 'var(--surface-solid, var(--surface))',
            borderLeft: '1px solid var(--border-strong, var(--border))',
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.25)',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 160,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {drawerLoading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              <div className="skeleton-pulse" style={{ width: 48, height: 48, borderRadius: 99, marginBottom: 16 }} />
              <div style={{ fontSize: 14 }}>Loading recipe details...</div>
            </div>
          ) : drawerError ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Failed to load recipe</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>{drawerError}</div>
              <button
                onClick={closeDrawer}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Close Drawer
              </button>
            </div>
          ) : drawerRecipe ? (
            <>
              {/* Drawer Hero Image */}
              <div style={{ position: 'relative', height: 220, width: '100%', flexShrink: 0, background: 'var(--surface-2)' }}>
                <img
                  src={drawerRecipe.strMealThumb}
                  alt={drawerRecipe.strMeal}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Gradient Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)' }} />

                {/* Close Button */}
                <button
                  onClick={closeDrawer}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    width: 36, height: 36, borderRadius: 18,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>

                {/* Title overlay */}
                <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
                  <div style={{ fontFamily: "'Newsreader', serif", fontSize: 24, fontWeight: 600, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
                    {drawerRecipe.strMeal}
                  </div>
                </div>
              </div>

              {/* Scrollable details */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Notification Area */}
                {notification && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>
                    ✓ {notification}
                  </div>
                )}

                {/* Tags and Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {drawerRecipe.strCategory && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(132,204,22,0.15)', color: '#84cc16' }}>
                      {drawerRecipe.strCategory}
                    </span>
                  )}
                  {drawerRecipe.strArea && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                      {drawerRecipe.strArea}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  {drawerRecipe.strYoutube && (
                    <a
                      href={drawerRecipe.strYoutube}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 99,
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Watch Video
                    </a>
                  )}
                </div>

                {/* Ingredients */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                    Ingredients
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {(drawerRecipe.ingredients || []).map((ing, i) => (
                      <div key={i} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '8px 0', fontSize: 13.5, color: 'var(--text-2)' }}>
                        <div style={{ width: '30%', fontWeight: 600, color: 'var(--text)', paddingRight: 8 }}>
                          {ing.measure}
                        </div>
                        <div style={{ flex: 1 }}>
                          {ing.ingredient}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                    Instructions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {((drawerRecipe.strInstructions || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)).map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 99,
                          background: 'rgba(132,204,22,0.15)', color: '#84cc16',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, flex: 1 }}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-solid, var(--surface))', flexShrink: 0 }}>
                {showPlanPicker ? (
                  <form onSubmit={handleAddToMealPlan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Slot</label>
                        <select
                          value={planSlot}
                          onChange={e => setPlanSlot(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13.5 }}
                        >
                          <option>Breakfast</option>
                          <option>Lunch</option>
                          <option>Dinner</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Date</label>
                        <input
                          type="date"
                          value={planDate}
                          onChange={e => setPlanDate(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowPlanPicker(false)}
                        style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Confirm Add
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={isCurrentRecipeSaved}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: isCurrentRecipeSaved ? 'var(--surface-2)' : 'var(--surface)',
                        color: isCurrentRecipeSaved ? 'var(--text-3)' : 'var(--text)',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: isCurrentRecipeSaved ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!isCurrentRecipeSaved) e.currentTarget.style.background = 'var(--surface-2)';
                      }}
                      onMouseLeave={e => {
                        if (!isCurrentRecipeSaved) e.currentTarget.style.background = 'var(--surface)';
                      }}
                    >
                      {isCurrentRecipeSaved ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          Saved
                        </>
                      ) : (
                        'Save to Library'
                      )}
                    </button>
                    <button
                      onClick={() => setShowPlanPicker(true)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Add to Meal Plan
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Main Food Planner ──────────────────────────────────── */

export default function FoodPlanner() {
  const { state, dispatch } = useAppStore();
  const mob = state.isMobile;
  const [view, setView] = useState('plan');

  useEffect(() => {
    if (localStorage.getItem('open-food-discover') === 'true') {
      setView('discover');
      localStorage.removeItem('open-food-discover');
    }
  }, []);

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
        <ViewBtn label="Discover"       active={view === 'discover'} onClick={() => setView('discover')} />
      </div>

      {view === 'plan'    && <MealPlanView recipes={recipes} mealPlan={mealPlan} dispatch={dispatch} shopList={shopList} />}
      {view === 'recipes' && <RecipesView  recipes={recipes} dispatch={dispatch} />}
      {view === 'import'  && <ImportView   dispatch={dispatch} />}
      {view === 'discover'&& <DiscoverView recipes={recipes} dispatch={dispatch} />}
    </div>
  );
}
