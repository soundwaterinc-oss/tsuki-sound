// グラニュラーパッド (MACRO主役) — 短いグレインを多数重ね雲のような持続をつくる。
import { hannGain } from './_env.js'

export function granularVoice(engine, p) {
  const { ctx, busIn } = engine
  const src = p.srcBuffer || engine.sineBuffer
  const amp = p.amp * 0.75
  const out = ctx.createGain()
  out.gain.value = amp
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  out.connect(pan); pan.connect(busIn)

  const t0 = p.t0
  const density = 26 + (p.spread || 0.1) * 90 // grains/sec
  const spread = p.spread ?? 0.12
  // 基準playbackRate: 220Hz バッファを目標freqへ
  const baseRate = p.freq / 220

  for (let t = t0; t < t0 + p.dur; t += 1 / density) {
    const g = ctx.createBufferSource()
    g.buffer = src
    g.playbackRate.value = baseRate * (1 + (Math.random() - 0.5) * spread)
    const env = ctx.createGain()
    const grainLen = 0.03 + Math.random() * 0.2
    hannGain(env.gain, t, grainLen, 0.7)
    const gp = ctx.createStereoPanner()
    gp.pan.value = (Math.random() - 0.5) * spread * 2
    g.connect(env).connect(gp).connect(out)
    const off = Math.random() * Math.max(0, src.duration - grainLen)
    g.start(t + Math.random() * 0.01, off, grainLen + 0.02)
    g.stop(t + grainLen + 0.05)
  }
  // 全体フェードで雲の縁を柔らかく(急出ししない)
  const atk = Math.max(0.4, p.attack)
  out.gain.setValueAtTime(0.0001, t0)
  out.gain.linearRampToValueAtTime(amp, t0 + atk)
  out.gain.setValueAtTime(amp, t0 + atk + p.dur)
  out.gain.linearRampToValueAtTime(0.0001, t0 + atk + p.dur + p.release)
}
