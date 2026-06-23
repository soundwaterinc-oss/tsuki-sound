// 螺旋スキャン順序 — phyllotaxis では i 順(黄金角アルペジオ)、
// その他では中心からの距離帯(ring)順。方向(out/in)で反転。
export function spiralOrder(cells, st) {
  const sorted = [...cells].sort((a, b) => a.ring - b.ring)
  return st.spiralDir === 'in' ? sorted.reverse() : sorted
}
