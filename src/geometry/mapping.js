import { quantizeToScale, harmonyAbove } from '../audio/scales.js'

// 細胞特徴 → ノート/和音野。
// 白玉(大セル)は「鳴らさない」設計: sizeCut 以上のセルは無音、その手前でなだらかに沈める。
// 主役は中〜小セル。音域も中域中心に持ち上げ、低域の濁りを避ける。
export function mapCell(cell, st) {
  const f = cell.f
  const w = st.weights
  const cut = st.sizeCut ?? 0.7

  // --- 大きいパーツ(白玉)は鳴らさない ---
  if (f.area >= cut) return null

  // 音高: 重み付き和。大セルは低めだが、下げ過ぎない(中域中心)。
  const wsum = w.area + w.centroidX + w.centroidY + w.sides + w.neighbors || 1
  const pitchNorm = (
    w.centroidY * f.centroidY +
    w.centroidX * f.centroidX +
    w.sides * f.sides +
    w.neighbors * f.neighbors +
    w.area * (1 - f.area)
  ) / wsum
  // 緩慢なピッチドリフト(scheduler が時間で更新) → 同じセルでも音が変わり続ける
  const drift = st._pitchShift || 0 // semitones
  const target = st.root * Math.pow(2, pitchNorm * 2.2 + drift / 12) // 2.2oct, 中域中心
  const freq = quantizeToScale(target, st.root, st.scale)

  // サイズ減衰: cut の手前(0.7倍)から 0 へフェード → 白玉に近いほど静かに
  const fadeStart = cut * 0.7
  const sizeGain = f.area < fadeStart
    ? 1
    : Math.max(0, 1 - (f.area - fadeStart) / (cut - fadeStart))

  const dur = lerp(0.5, 2.6, f.area)                  // 大セルでも伸ばし過ぎない
  const partials = Math.floor(lerp(4, 14, f.sides))
  // 中サイズで最大、大セルへ向けて sizeGain で沈める
  const amp = lerp(0.3, 0.5, Math.min(1, f.area / 0.5)) * sizeGain
  const pan = (f.centroidX - 0.5) * 2
  const reverbSend = f.perimeter
  const spread = lerp(0.04, 0.2, f.neighbors)

  // 層: 中〜大(ただし大は減衰)→MACRO, 中→MID, 小→MICRO
  let layer = 'mid'
  if (f.area > fadeStart * 0.95) layer = 'macro'
  else if (f.area < 0.28) layer = 'micro'

  // 和音野: 隣接が多いほど上ハモを足す
  const chord = []
  if (f.neighbors > 0.58) chord.push(harmonyAbove(freq, 'fifth'))
  if (f.neighbors > 0.8) chord.push(harmonyAbove(freq, 'third'))

  return { freq, dur, partials, amp, pan, reverbSend, spread, layer, chord }
}

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)) }
