export const DEFAULT_TODAY_LAYOUT = [
  { id: 'learning',       span: 7 },
  { id: 'medication',     span: 5 },
  { id: 'workTasks',      span: 6 },
  { id: 'personalTasks',  span: 6 },
  { id: 'sports',         span: 7 },
  { id: 'pinnedFestival', span: 5 },
  { id: 'upcoming48h',    span: 7 },
  { id: 'familyFeed',     span: 5 },
  { id: 'finance',        span: 6 },
  { id: 'food',           span: 6 },
  { id: 'birthdays',      span: 12 },
];

export const SPAN_PRESETS = [
  { label: 'Small',  span: 4 },
  { label: 'Medium', span: 6 },
  { label: 'Large',  span: 8 },
  { label: 'Full',   span: 12 },
];

// Merges a persisted layout with the current default set of widgets: keeps the
// user's saved order/spans, appends any widget that's new since they last
// customized (a card added in a later release), and drops any id that no
// longer corresponds to a real widget (a card since removed).
export function normalizeTodayLayout(saved) {
  if (!Array.isArray(saved)) return DEFAULT_TODAY_LAYOUT;
  const defaultIds = new Set(DEFAULT_TODAY_LAYOUT.map(w => w.id));
  const kept = saved.filter(w => w && defaultIds.has(w.id));
  const keptIds = new Set(kept.map(w => w.id));
  const appended = DEFAULT_TODAY_LAYOUT.filter(w => !keptIds.has(w.id));
  return [...kept, ...appended];
}
