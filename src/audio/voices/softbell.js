// ソフトベル (MID) — 正弦モーダル(partial少・decay中)で雲の鈴。
export function softBellVoice(engine, p) {
  const { ctx, busIn } = engine
  const out = ctx.createGain(); out.gain.value = 0.0001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  out.connect(pan); pan.connect(busIn)

  const t0 = p.t0
  // 非整数倍音でベル感、ただし柔らかく
  const modes = [1, 2.01, 2.76, 3.9]
  const decays = [1.0, 0.7, 0.5, 0.35]
  modes.forEach((m, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'; osc.frequency.value = p.freq * m
    const g = ctx.createGain(); g.gain.value = 0.0001
    osc.connect(g); g.connect(out)
    const peak = p.amp * decays[i]
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur * (0.6 + decays[i]))
    osc.start(t0)
    osc.stop(t0 + p.dur * 2 + 0.1)
  })
  out.gain.setValueAtTime(p.amp, t0)
}
