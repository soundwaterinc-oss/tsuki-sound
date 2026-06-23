// 黄金角フィロタキシス配置 — 螺旋スキャンの土台
const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // ≈ 137.5°

// center: [cx,cy], spread c はバウンズに収まるよう自動算出
export function phyllotaxis(n, bounds) {
  const [x0, y0, x1, y1] = bounds
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const maxR = Math.min(x1 - x0, y1 - y0) * 0.46
  const c = maxR / Math.sqrt(Math.max(1, n - 1))
  const pts = []
  for (let i = 0; i < n; i++) {
    const r = c * Math.sqrt(i)
    const th = i * GOLDEN
    pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)])
  }
  return pts // index i がそのまま螺旋順
}

export { GOLDEN }
