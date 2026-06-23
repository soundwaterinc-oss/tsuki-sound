// 共通エンベロープ補助
export function hannGain(param, t, len, peak = 1) {
  // Hann窓近似 (上り/下りを setValueCurve なしで)
  param.setValueAtTime(0.0001, t)
  param.linearRampToValueAtTime(peak, t + len * 0.5)
  param.linearRampToValueAtTime(0.0001, t + len)
}

// 長ADSR (満ち欠けに似た立ち上がり) — gainParam に適用
export function adsr(param, t, { amp, attack, dur, release }) {
  param.setValueAtTime(0.0001, t)
  param.exponentialRampToValueAtTime(Math.max(0.0002, amp), t + attack)
  param.setValueAtTime(Math.max(0.0002, amp), t + Math.max(attack, dur))
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, dur) + release)
}
