import { quantizeToScale, harmonyAbove } from '../audio/scales.js'

// 細胞特徴 → ノート/和音野。重み付き和で音高を決め、面積で音色層を振る。
export function mapCell(cell, st) {
  const f = cell.f
  const w = st.weights

  // 音高: 重み付き和 (大セル=低域バイアス area→ -pitch)
  const wsum = w.area + w.centroidX + w.centroidY + w.sides + w.neighbors || 1
  const pitchNorm = (
    w.centroidY * f.centroidY +
    w.centroidX * f.centroidX +
    w.sides * f.sides +
    w.neighbors * f.neighbors +
    w.area * (1 - f.area) // 大セルは低い
  ) / wsum

  // 2.5 オクターブ幅
  const target = st.root * Math.pow(2, pitchNorm * 2.5 - 0.5)
  const freq = quantizeToScale(target, st.root, st.scale)

  const dur = lerp(0.6, 4.5, f.area)                  // 大セルほど長い
  const partials = Math.floor(lerp(4, 16, f.sides))   // 辺数→倍音声部
  // 大セルが大音量で濁らないよう上限を抑える
  const amp = lerp(0.18, 0.62, f.area)
  const pan = (f.centroidX - 0.5) * 2
  const reverbSend = f.perimeter
  const spread = lerp(0.04, 0.2, f.neighbors)

  // 層: 大→MACRO, 中→MID, 小→MICRO
  let layer = 'mid'
  if (f.area > 0.62) layer = 'macro'
  else if (f.area < 0.3) layer = 'micro'

  // 和音野: 隣接が多いほど上ハモを足す
  const chord = []
  if (f.neighbors > 0.55) chord.push(harmonyAbove(freq, 'fifth'))
  if (f.neighbors > 0.78) chord.push(harmonyAbove(freq, 'third'))

  return { freq, dur, partials, amp, pan, reverbSend, spread, layer, chord }
}

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)) }
