// 潮汐エンベロープ — 発音の確率/密度を緩慢な正弦で変調 (満潮=密 / 干潮=疎)。
// lunarPhase(0..1, 29.5を圧縮) で満ち欠けを重ねる。
export function createTide(st) {
  return {
    // t: AudioContext時刻。0..1 の密度係数を返す。
    density(t) {
      const base = 0.5 + 0.5 * Math.sin(2 * Math.PI * st.tideRate * t)
      // 月相: 満月(0.5付近)で密、新月で疎
      const moon = 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(2 * Math.PI * st.lunarPhase))
      return Math.max(0.08, base * (0.5 + 0.5 * moon))
    },
    // 発音閾値: density が高いほど鳴りやすい
    gate(t, r) {
      return r < this.density(t)
    },
  }
}
