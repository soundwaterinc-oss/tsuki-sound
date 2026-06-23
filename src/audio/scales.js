// スケール定義 — 正弦/倍音は近接音が濁るので純正・倍音列で透明感を出す
// 各配列は 1オクターブ内の周波数比 (root に対する乗数)
export const SCALES = {
  just:        [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8],      // 純正律長音階
  overtone:    [1, 9/8, 5/4, 11/8, 3/2, 7/4, 15/8],     // 倍音列(7,11倍音含む)
  pentatonic:  [1, 9/8, 5/4, 3/2, 5/3],                  // 純正ペンタ
  pelog:       [1, 1.12, 1.31, 1.49, 1.62, 1.86],        // ペロッグ近似
  japanese:    [1, 16/15, 4/3, 3/2, 8/5],                // 都節(陰音階)近似
  micro:       [1, 33/32, 9/8, 5/4, 11/8, 3/2, 7/4],     // 微分音
}

// freq を最寄りのスケール音(複数オクターブ)に量子化
export function quantizeToScale(freq, root, scaleName) {
  const ratios = SCALES[scaleName] || SCALES.just
  // 候補: -2..+3 オクターブ × 各比
  let best = root, bestErr = Infinity
  for (let oct = -2; oct <= 3; oct++) {
    const base = root * Math.pow(2, oct)
    for (const r of ratios) {
      const f = base * r
      const err = Math.abs(Math.log2(f) - Math.log2(freq))
      if (err < bestErr) { bestErr = err; best = f }
    }
  }
  return best
}

// 純正3度/5度の上ハモ周波数 (chord field 用)
export function harmonyAbove(freq, kind = 'fifth') {
  const r = kind === 'third' ? 5 / 4 : kind === 'octave' ? 2 : 3 / 2
  return freq * r
}
