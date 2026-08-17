import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SPAN_PRESETS } from '../../data/todayLayout';

const GRIP_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="5" r="1.6"/><circle cx="16" cy="5" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="8" cy="19" r="1.6"/><circle cx="16" cy="19" r="1.6"/></svg>';
const RESIZE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';

// Wraps a Today dashboard card with dnd-kit drag-to-reorder + a width-preset
// menu, active only while `editing` is true. Card visuals (background,
// border, padding, overflow) match the original static Card component so
// toggling "Customize layout" off looks pixel-identical to before this
// feature existed.
export default function SortableCard({ id, span, editing, onSpanChange, children, style = {} }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <section
      ref={setNodeRef}
      style={{
        gridColumn: `span ${span}`,
        background: 'var(--surface)',
        border: editing ? '1px dashed var(--border-strong)' : '1px solid var(--border)',
        borderRadius: 22,
        padding: 24,
        backdropFilter: 'blur(20px)',
        position: 'relative',
        overflow: 'hidden',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
        ...style,
      }}
    >
      {editing && (
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 5 }}>
          <button
            {...attributes}
            {...listeners}
            title="Drag to reorder"
            style={{
              width: 28, height: 28, borderRadius: 8, cursor: 'grab',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: GRIP_ICON }}
          />
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              title="Resize"
              style={{
                width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              dangerouslySetInnerHTML={{ __html: RESIZE_ICON }}
            />
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, minWidth: 100,
                background: 'var(--surface-solid)', border: '1px solid var(--border-strong)',
                borderRadius: 12, padding: 5, display: 'flex', flexDirection: 'column', gap: 2,
                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              }}>
                {SPAN_PRESETS.map(p => (
                  <button
                    key={p.span}
                    onClick={() => { onSpanChange(p.span); setMenuOpen(false); }}
                    style={{
                      padding: '7px 10px', borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: p.span === span ? 'var(--accent-soft)' : 'transparent',
                      color: p.span === span ? 'var(--accent)' : 'var(--text-2)',
                      fontFamily: 'inherit', fontSize: 12.5, fontWeight: p.span === span ? 700 : 500,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}
