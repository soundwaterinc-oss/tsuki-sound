// 呼吸LFO — 全声部を貫く超低域 (0.05〜0.2Hz)。
// masterBreathGain.gain と masterLPF.frequency に直結し組織全体を満ち引きさせる。
export function createBreath(engine, st) {
  const { ctx } = engine
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = st.breathRate

  // 音量を揺らす depth
  const ampDepth = ctx.createGain()
  ampDepth.gain.value = st.breathDepth
  osc.connect(ampDepth)
  ampDepth.connect(engine.breathGain.gain) // 0.9 を中心に ±depth

  // 開きを揺らす (LPF cutoff, scaled)
  const cutDepth = ctx.createGain()
  cutDepth.gain.value = 1500 * st.breathDepth
  osc.connect(cutDepth)
  cutDepth.connect(engine.lpf.frequency)

  osc.start()

  return {
    setRate: hz => osc.frequency.setTargetAtTime(hz, ctx.currentTime, 0.2),
    setDepth: d => {
      ampDepth.gain.setTargetAtTime(d, ctx.currentTime, 0.2)
      cutDepth.gain.setTargetAtTime(1500 * d, ctx.currentTime, 0.2)
    },
    // 現在の breath 位相値 (近似) — UI/canvas の脈動に使う
    phase: () => 0.5 + 0.5 * Math.sin(2 * Math.PI * osc.frequency.value * ctx.currentTime),
  }
}
