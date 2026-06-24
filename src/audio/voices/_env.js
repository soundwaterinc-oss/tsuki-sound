// 共通エンベロープ補助 — 急出しを避け、すべて raised-cosine でなめらかに開閉する。

const CURVE_N = 64
const _rise = new Float32Array(CURVE_N)
const _fall = new Float32Array(CURVE_N)
for (let i = 0; i < CURVE_N; i++) {
  const x = i / (CURVE_N - 1)
  _rise[i] = 0.5 - 0.5 * Math.cos(Math.PI * x)      // 0→1 S字
  _fall[i] = 0.5 + 0.5 * Math.cos(Math.PI * x)      // 1→0 S字
}

// なめらかな立ち上がり/保持/減衰。クリック・急出しゼロ。
// minAttack でどんな設定でも一定のやわらかさを保証する。
export function softEnv(param, t, { amp, attack, hold, release, minAttack = 0.25 }) {
  const a = Math.max(minAttack, attack)
  const h = Math.max(0.02, hold)
  const r = Math.max(0.4, release)
  const riseCurve = scale(_rise, amp)
  const fallCurve = scale(_fall, amp)
  param.cancelScheduledValues(t)
  param.setValueAtTime(0.00001, t)
  param.setValueCurveAtTime(riseCurve, t, a)
  param.setValueAtTime(amp, t + a)
  param.setValueCurveAtTime(fallCurve, t + a + h, r)
  return t + a + h + r
}

function scale(curve, amp) {
  const out = new Float32Array(curve.length)
  for (let i = 0; i < curve.length; i++) out[i] = Math.max(0.00001, curve[i] * amp)
  return out
}

// グレイン用 Hann 窓（granular のみ。これは点描なので従来どおり）
export function hannGain(param, t, len, peak = 1) {
  param.setValueAtTime(0.0001, t)
  param.linearRampToValueAtTime(peak, t + len * 0.5)
  param.linearRampToValueAtTime(0.0001, t + len)
}
