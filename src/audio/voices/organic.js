// 粒子的／ノイズ⇄サイン中間／オルガン的な有機声部。
// texture(0..1): 0=純音寄り, 1=粒子・息(ノイズ)寄り。
import { softEnv } from './_env.js'
import { sine, head } from './sines.js'

// ============ particle: バンドパスで音程を持たせたノイズ粒の雲 ============
// Q を texture で変化させ、純音の粒⇄エアリーな砂の質感へモーフ。
export function particleVoice(engine, p) {
  const { ctx, whiteBuffer } = engine
  const { out } = head(engine, p)
  const tex = p.texture ?? 0.4
  const t0 = p.t0
  const dur = p.dur
  const density = 38 + (p.bright ?? 0.5) * 70           // grains/sec
  const Q = 1.5 + (1 - tex) * 26                         // tex小→高Q(音程明瞭) tex大→低Q(砂)
  const scatter = 0.01 + tex * 0.12                      // ピッチの散らばり
  const maxGrains = 260
  let n = 0
  for (let t = t0; t < t0 + dur && n < maxGrains; t += 1 / density, n++) {
    const src = ctx.createBufferSource()
    src.buffer = whiteBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = p.freq * (1 + (Math.random() - 0.5) * scatter)
    bp.Q.value = Q
    const env = ctx.createGain()
    const gl = 0.04 + Math.random() * 0.12
    env.gain.setValueAtTime(0.0001, t)
    env.gain.linearRampToValueAtTime(0.9, t + gl * 0.5)
    env.gain.linearRampToValueAtTime(0.0001, t + gl)
    const gp = ctx.createStereoPanner()
    gp.pan.value = (Math.random() - 0.5) * 1.4
    src.connect(bp); bp.connect(env); env.connect(gp); gp.connect(out)
    const off = Math.random() * (whiteBuffer.duration - gl - 0.05)
    src.start(t, Math.max(0, off), gl + 0.03)
    src.stop(t + gl + 0.06)
  }
  // 全体は控えめに(粒のピークがあるため)
  softEnv(out.gain, t0, { amp: p.amp * 0.7, attack: Math.max(0.3, p.attack), hold: dur, release: p.release })
}

// ============ airtone: サイン × 高Qバンドパスノイズ のモーフ(中間音) ============
export function airtoneVoice(engine, p) {
  const { ctx, whiteBuffer } = engine
  const { out } = head(engine, p)
  const tex = p.texture ?? 0.4
  const life = p.attack + p.dur + p.release + 0.3

  // 純サイン成分
  sine(ctx, out, p.freq, p.t0, life, {
    gain: (1 - tex * 0.85) * 0.9, shimmer: p.shimmer ?? 0.4, drift: 1.5, idx: 0,
  })
  // 倍音をほのかに
  sine(ctx, out, p.freq * 2, p.t0, life, {
    gain: (1 - tex) * 0.18, shimmer: (p.shimmer ?? 0.4) * 0.5, drift: 1, idx: 3,
  })

  // 息成分: 高Qバンドパスノイズ(音程感のあるエア)
  const src = ctx.createBufferSource()
  src.buffer = whiteBuffer; src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = p.freq
  bp.Q.value = 8 + (1 - tex) * 22          // tex大ほど広く(息っぽく)
  const ng = ctx.createGain(); ng.gain.value = tex * 0.5
  // ゆっくりした息のうねり
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12
  const ld = ctx.createGain(); ld.gain.value = tex * 0.22
  lfo.connect(ld); ld.connect(ng.gain)
  src.connect(bp); bp.connect(ng); ng.connect(out)
  src.start(p.t0, Math.random()); src.stop(p.t0 + life)
  lfo.start(p.t0); lfo.stop(p.t0 + life)

  softEnv(out.gain, p.t0, { amp: p.amp * 0.85, attack: Math.max(0.4, p.attack), hold: p.dur, release: p.release })
}

// ============ organ: ドローバー加算 + 各倍音の微ドリフトで有機的オルガン ============
const DRAWBARS = [
  { m: 1, a: 1.0 }, { m: 2, a: 0.6 }, { m: 3, a: 0.7 }, { m: 4, a: 0.35 },
  { m: 6, a: 0.22 }, { m: 8, a: 0.14 },
]
export function organVoice(engine, p) {
  const { ctx, whiteBuffer } = engine
  const { out } = head(engine, p)
  const life = p.attack + p.dur + p.release + 0.25
  // 各ドローバーを sine() で(独立ドリフト+シマー=有機性)
  DRAWBARS.forEach((db, i) => sine(ctx, out, p.freq * db.m, p.t0, life, {
    gain: db.a * 0.5, shimmer: (p.shimmer ?? 0.4) * 0.6, drift: 1 + i * 0.4, idx: i,
  }))
  // やわらかいキーオン(息のひと吹き。texで増減)
  const tex = p.texture ?? 0.4
  if (tex > 0.05) {
    const src = ctx.createBufferSource(); src.buffer = whiteBuffer
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = p.freq * 2; bp.Q.value = 6
    const cg = ctx.createGain()
    cg.gain.setValueAtTime(0.0001, p.t0)
    cg.gain.linearRampToValueAtTime(tex * 0.25, p.t0 + 0.02)
    cg.gain.exponentialRampToValueAtTime(0.0001, p.t0 + 0.14)
    src.connect(bp); bp.connect(cg); cg.connect(out)
    src.start(p.t0, Math.random()); src.stop(p.t0 + 0.2)
  }
  // オルガンらしいやや速めのアタック/サスティン
  softEnv(out.gain, p.t0, { amp: p.amp * 0.7, attack: Math.max(0.25, p.attack * 0.6), hold: p.dur, release: p.release, minAttack: 0.18 })
}

// ============ reed: 奇数倍音 + 微かな息ノイズ のハルモニウム ============
const REED = [
  { m: 1, a: 1.0 }, { m: 3, a: 0.5 }, { m: 5, a: 0.28 }, { m: 7, a: 0.16 }, { m: 9, a: 0.09 },
]
export function reedVoice(engine, p) {
  const { ctx, whiteBuffer } = engine
  const { out } = head(engine, p)
  const tex = p.texture ?? 0.4
  const life = p.attack + p.dur + p.release + 0.25
  REED.forEach((r, i) => sine(ctx, out, p.freq * r.m, p.t0, life, {
    gain: r.a * 0.4, shimmer: (p.shimmer ?? 0.4) * 0.7, drift: 1.5 + i * 0.5, idx: i,
  }))
  // リードの息(常時微量)
  const src = ctx.createBufferSource(); src.buffer = whiteBuffer; src.loop = true
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = p.freq * 3; bp.Q.value = 5
  const ng = ctx.createGain(); ng.gain.value = (0.1 + tex * 0.3) * 0.4
  src.connect(bp); bp.connect(ng); ng.connect(out)
  src.start(p.t0, Math.random()); src.stop(p.t0 + life)
  softEnv(out.gain, p.t0, { amp: p.amp * 0.62, attack: Math.max(0.3, p.attack * 0.7), hold: p.dur, release: p.release })
}
