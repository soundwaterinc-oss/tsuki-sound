// Air — 帯域ノイズ(フォルマント風)で息のテクスチャ。MID浮遊 + MICRO breath tick。
export function airVoice(engine, p) {
  const { ctx, busIn } = engine
  const src = ctx.createBufferSource()
  src.buffer = engine.fieldBuffer
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = p.freq * 2
  bp.Q.value = 4 + Math.random() * 4
  const out = ctx.createGain(); out.gain.value = 0.0001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  src.connect(bp); bp.connect(out); out.connect(pan); pan.connect(busIn)

  const t0 = p.t0
  const amp = p.amp * 0.5
  const atk = Math.max(0.4, p.attack)
  out.gain.setValueAtTime(0.0001, t0)
  out.gain.linearRampToValueAtTime(amp, t0 + atk)
  out.gain.setValueAtTime(amp, t0 + p.dur)
  out.gain.linearRampToValueAtTime(0.0001, t0 + p.dur + p.release)
  src.start(t0, Math.random() * 1.5)
  src.stop(t0 + p.dur + p.release + 0.1)
}
