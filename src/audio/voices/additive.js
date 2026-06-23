// 正弦加算合唱 — N本の正弦を倍音/純正比で重ね、緩慢detune driftで揺らす。
import { adsr } from './_env.js'

export function additiveVoice(engine, p) {
  const { ctx, busIn } = engine
  const out = ctx.createGain()
  out.gain.value = 0.0001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  out.connect(pan); pan.connect(busIn)

  const N = Math.max(3, Math.min(16, p.partials || 6))
  const t0 = p.t0
  for (let i = 1; i <= N; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = p.freq * i
    // 各声部に微小LFO detune (±数cent) → 合唱の揺らぎ
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.07 + Math.random() * 0.18
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 2 + Math.random() * 5 // cents
    lfo.connect(lfoGain); lfoGain.connect(osc.detune)
    // 上倍音ほど弱く
    const g = ctx.createGain()
    g.gain.value = (1 / i) * 0.9
    osc.connect(g); g.connect(out)
    osc.start(t0); lfo.start(t0)
    const end = t0 + p.attack + p.dur + p.release + 0.1
    osc.stop(end); lfo.stop(end)
  }
  adsr(out.gain, t0, { amp: p.amp, attack: p.attack, dur: p.dur, release: p.release })
}
