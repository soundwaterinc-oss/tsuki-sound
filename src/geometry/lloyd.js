import { Delaunay } from 'd3-delaunay'

// Seeded PRNG (mulberry32) — 再現性のため state.seed を使う
export function rng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomPoints(n, bounds, rand) {
  const [x0, y0, x1, y1] = bounds
  const pts = []
  for (let i = 0; i < n; i++) pts.push([x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)])
  return pts
}

function centroid(poly) {
  // polygon centroid (closed ring from d3 voronoi)
  let a = 0, cx = 0, cy = 0
  for (let i = 0, n = poly.length - 1; i < n; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[i + 1]
    const cross = x0 * y1 - x1 * y0
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross
  }
  if (Math.abs(a) < 1e-9) return poly[0]
  a *= 0.5
  return [cx / (6 * a), cy / (6 * a)]
}

// Lloyd relaxation: 重心へ k 回寄せる → 結晶のような蜂の巣
export function lloyd(points, bounds, k) {
  let pts = points
  for (let it = 0; it < k; it++) {
    const d = Delaunay.from(pts)
    const v = d.voronoi(bounds)
    const next = []
    for (let i = 0; i < pts.length; i++) {
      const cell = v.cellPolygon(i)
      next.push(cell ? centroid(cell) : pts[i])
    }
    pts = next
  }
  return pts
}

export { centroid }
