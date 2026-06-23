// グラスハーモニカ — 正弦コア + わずかな2f/3f、ふわっと立ち上がる擦弦的アタック。
import { adsr } from './_env.js'

export function glassVoice(engine, p) {
  const { ctx, busIn } = engine
  const out = ctx.createGain(); out.gain.value = 0.0001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  out.connect(pan); pan.connect(busIn)

  const t0 = p.t0
  const partials = [
    { m: 1, a: 1.0 }, { m: 2, a: 0.22 }, { m: 3, a: 0.12 }, { m: 4.01, a: 0.05 },
  ]
  for (const pa of partials) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'; osc.frequency.value = p.freq * pa.m
    const g = ctx.createGain(); g.gain.value = pa.a
    osc.connect(g); g.connect(out)
    osc.start(t0)
    osc.stop(t0 + p.attack + p.dur + p.release + 0.1)
  }
  // ガラス特有のゆっくりした立ち上がり
  const atk = Math.max(p.attack, 0.6)
  adsr(out.gain, t0, { amp: p.amp * 0.8, attack: atk, dur: p.dur, release: p.release })
}
