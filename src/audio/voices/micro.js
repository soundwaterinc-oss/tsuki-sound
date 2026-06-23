// MICRO — Dew Drop / Pollen grain。1サイクル正弦pluck/単一グレインの点描。
export function dewVoice(engine, p) {
  const { ctx, busIn } = engine
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = p.freq * 2 // 高め registerの雫
  const g = ctx.createGain(); g.gain.value = 0.0001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  osc.connect(g); g.connect(pan); pan.connect(busIn)

  const t0 = p.t0
  const amp = p.amp * 0.6
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(amp, t0 + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
  // ピッチがわずかに落ちる雫感
  osc.frequency.setValueAtTime(p.freq * 2, t0)
  osc.frequency.exponentialRampToValueAtTime(p.freq * 1.88, t0 + 0.18)
  osc.start(t0)
  osc.stop(t0 + 0.25)
}

export function pollenVoice(engine, p) {
  const { ctx, busIn } = engine
  const g = ctx.createBufferSource()
  g.buffer = engine.sineBuffer
  g.playbackRate.value = (p.freq * 3) / 220
  const env = ctx.createGain(); env.gain.value = 0.0001
  const pan = ctx.createStereoPanner(); pan.pan.value = (Math.random() - 0.5) * 1.4
  g.connect(env); env.connect(pan); pan.connect(busIn)
  const t0 = p.t0
  const amp = p.amp * 0.35
  env.gain.setValueAtTime(0.0001, t0)
  env.gain.linearRampToValueAtTime(amp, t0 + 0.01)
  env.gain.linearRampToValueAtTime(0.0001, t0 + 0.06)
  g.start(t0, Math.random() * 0.3, 0.1)
  g.stop(t0 + 0.12)
}
