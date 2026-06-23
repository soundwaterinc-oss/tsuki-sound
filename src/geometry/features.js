// 細胞特徴を 0..1 正規化。順序付け(ring/spiralIndex)もここで確定。
export function extractFeatures(cells, bounds) {
  const [x0, y0, x1, y1] = bounds
  const w = x1 - x0, h = y1 - y0
  const areas = cells.map(c => c.area)
  const perims = cells.map(c => c.perimeter)
  const aMin = Math.min(...areas), aMax = Math.max(...areas)
  const pMin = Math.min(...perims), pMax = Math.max(...perims)
  const nMax = Math.max(1, ...cells.map(c => c.neighbors.length))
  const rMax = Math.max(...cells.map(c => c.ring)) || 1
  const norm = (v, lo, hi) => (hi - lo < 1e-9 ? 0.5 : (v - lo) / (hi - lo))

  for (const c of cells) {
    c.f = {
      area: norm(c.area, aMin, aMax),
      centroidX: (c.centroid[0] - x0) / w,
      centroidY: 1 - (c.centroid[1] - y0) / h, // 上=高い
      sides: Math.min(1, Math.max(0, (c.sides - 4) / 6)), // 4..10 → 0..1
      neighbors: c.neighbors.length / nMax,
      ring: c.ring / rMax,
      perimeter: norm(c.perimeter, pMin, pMax),
    }
  }
  return cells
}
