export const COLORS = Object.freeze({
  sky: '#6ec6f0',
  navy: '#2f62a8',
  sun: '#ffcf3a',
  white: '#f6f2e6',
  red: '#e9504f',
  green: '#7cc44f',
  black: '#34303d',
  pink: '#ff8fb1',
  grey: '#8f9bb0',
  orange: '#ff9f43',
});

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Multiplies an #rrggbb colour by factor f (f < 1 darkens, f > 1 lightens).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * f);
  const g = clamp(((n >> 8) & 255) * f);
  const b = clamp((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export const colorOf = (key) => COLORS[key] ?? '#999999';
