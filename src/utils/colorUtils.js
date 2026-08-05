export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Mosaic Life accent palette — blue / green / purple / orange / coral / teal
export const ACCENT_SWATCHES = ['#1d98d9', '#86ba46', '#9460c1', '#fea91a', '#ff6d53', '#2bb9bb'];
