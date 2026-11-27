// Procedural pictures: colorAt(u, v) returns a palette key for u, v in [0, 1].
const circle = (u, v, cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 <= r * r;

function tri(u, v, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (u - bx) * (ay - by) - (ax - bx) * (v - by);
  const d2 = (u - cx) * (by - cy) - (bx - cx) * (v - cy);
  const d3 = (u - ax) * (cy - ay) - (cx - ax) * (v - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function inHeart(u, v) {
  const x = (u - 0.5) * 2.9;
  const y = (0.5 - v) * 2.9;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

const CAT_DAISIES = [[0.12, 0.12], [0.9, 0.1], [0.1, 0.58], [0.9, 0.62], [0.14, 0.9], [0.86, 0.9], [0.5, 0.06]];

// Small daisies scattered in a background: yellow centre, five white petals.
function daisy(u, v, spots) {
  for (const [x, y] of spots) {
    if (circle(u, v, x, y, 0.03)) return 'sun';
    for (let k = 0; k < 5; k++) {
      const a = (k * 72 - 90) * (Math.PI / 180);
      if (circle(u, v, x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05, 0.035)) return 'white';
    }
  }
  return null;
}

export const PICTURES = Object.freeze({
  heart: {
    name: 'Kalp',
    colorAt(u, v) {
      if (!inHeart(u, v)) return 'pink';
      return circle(u, v, 0.33, 0.33, 0.06) ? 'white' : 'red';
    },
  },
  boat: {
    name: 'Yelkenli',
    colorAt(u, v) {
      if (v >= 0.6 && v <= 0.72) {
        const d = (v - 0.6) * 1.1;
        if (u >= 0.2 + d && u <= 0.8 - d) return 'red';
      }
      if (tri(u, v, [0.52, 0.1], [0.52, 0.58], [0.8, 0.58])) return 'white';
      if (tri(u, v, [0.48, 0.2], [0.48, 0.58], [0.26, 0.58])) return 'white';
      return v >= 0.66 ? 'navy' : 'sky';
    },
  },
  flower: {
    name: 'Papatya',
    colorAt(u, v) {
      if (circle(u, v, 0.5, 0.5, 0.1)) return 'sun';
      for (let k = 0; k < 5; k++) {
        const a = (k * 72 - 90) * (Math.PI / 180);
        if (circle(u, v, 0.5 + Math.cos(a) * 0.19, 0.5 + Math.sin(a) * 0.19, 0.13)) return 'white';
      }
      return 'green';
    },
  },
  mountain: {
    name: 'Karlı Dağ',
    colorAt(u, v) {
      if (v > 0.8) return 'green';
      if (tri(u, v, [0.05, 0.82], [0.5, 0.16], [0.95, 0.82])) return v < 0.36 ? 'white' : 'grey';
      return 'sky';
    },
  },
  cat: {
    name: 'Kedi',
    colorAt(u, v) {
      if (circle(u, v, 0.5, 0.72, 0.03)) return 'pink';
      for (const ex of [0.38, 0.62]) {
        if (circle(u, v, ex + 0.01, 0.61, 0.045)) return 'black';
        if (circle(u, v, ex, 0.6, 0.09)) return 'white';
      }
      if (circle(u, v, 0.5, 0.6, 0.3)) return 'black';
      if (tri(u, v, [0.22, 0.46], [0.28, 0.16], [0.46, 0.34])) return 'black';
      if (tri(u, v, [0.78, 0.46], [0.72, 0.16], [0.54, 0.34])) return 'black';
      return daisy(u, v, CAT_DAISIES) ?? 'green';
    },
  },
  sunset: {
    name: 'Gün Batımı',
    colorAt(u, v) {
      if (v > 0.68) return 'navy';
      return circle(u, v, 0.5, 0.48, 0.23) ? 'sun' : 'sky';
    },
  },
});
