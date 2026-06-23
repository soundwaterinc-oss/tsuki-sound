// グラニュラーパッド (MACRO主役) — 短いグレインを多数重ね雲のような持続をつくる。
import { hannGain } from './_env.js'

export function granularVoice(engine, p) {
  const { ctx, busIn } = engine
  const src = p.srcBuffer || engine.sineBuffer
  const out = ctx.createGain()
  out.gain.value = p.amp
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  out.connect(pan); pan.connect(busIn)

  const t0 = p.t0
  const density = 28 + (p.spread || 0.1) * 120 // grains/sec
  const spread = p.spread ?? 0.12
  // 基準playbackRate: 220Hz バッファを目標freqへ
  const baseRate = p.freq / 220

  for (let t = t0; t < t0 + p.dur; t += 1 / density) {
    const g = ctx.createBufferSource()
    g.buffer = src
    g.playbackRate.value = baseRate * (1 + (Math.random() - 0.5) * spread)
    const env = ctx.createGain()
    const grainLen = 0.02 + Math.random() * 0.18
    hannGain(env.gain, t, grainLen, 0.9)
    const gp = ctx.createStereoPanner()
    gp.pan.value = (Math.random() - 0.5) * spread * 2
    g.connect(env).connect(gp).connect(out)
    const off = Math.random() * Math.max(0, src.duration - grainLen)
    g.start(t + Math.random() * 0.01, off, grainLen + 0.02)
    g.stop(t + grainLen + 0.05)
  }
  // 全体フェードで雲の縁を柔らかく
  out.gain.setValueAtTime(0, t0)
  out.gain.linearRampToValueAtTime(p.amp, t0 + Math.min(p.attack, p.dur * 0.5))
  out.gain.setValueAtTime(p.amp, t0 + p.dur)
  out.gain.linearRampToValueAtTime(0, t0 + p.dur + p.release)
}
