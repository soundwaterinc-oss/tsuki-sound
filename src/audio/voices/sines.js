// サイン波パレット — 金物感(非整数倍音)とノイズを排し、
// 「もつれ合うサイン波」を中核に据えた、なめらかで温かい声部群。
import { softEnv } from './_env.js'

// --- 内部ヘルパ: 1本の正弦 + 任意の振幅ゆらぎ(shimmer) + 微小detune drift ---
function sine(ctx, dest, freq, t, life, { gain = 1, detuneCents = 0, shimmer = 0, drift = 0, idx = 0 }) {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.detune.value = detuneCents

  const g = ctx.createGain()
  g.gain.value = gain
  osc.connect(g); g.connect(dest)

  // 振幅シマー: 各声部で位相・速度を変え、ゆっくり絡み合わせる
  if (shimmer > 0) {
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.06 + 0.14 * ((idx * 0.37) % 1) // 0.06〜0.20Hz、声部ごと別
    const ld = ctx.createGain()
    ld.gain.value = gain * shimmer * 0.85
    lfo.connect(ld); ld.connect(g.gain)
    lfo.start(t); lfo.stop(t + life)
  }
  // 微小ピッチドリフト → うなり
  if (drift > 0) {
    const dl = ctx.createOscillator()
    dl.type = 'sine'
    dl.frequency.value = 0.04 + 0.1 * ((idx * 0.61) % 1)
    const dd = ctx.createGain()
    dd.gain.value = drift
    dl.connect(dd); dd.connect(osc.detune)
    dl.start(t); dl.stop(t + life)
  }
  osc.start(t); osc.stop(t + life)
  return osc
}

function head(engine, p) {
  const { ctx, busIn } = engine
  const out = ctx.createGain(); out.gain.value = 0.00001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  out.connect(pan); pan.connect(busIn)
  return { ctx, out }
}

// ============ もつれ合うサイン (signature) ============
// ユニゾンの正弦を ±数cent で散らし、各々を別位相のシマーで絡める。
export function weaveVoice(engine, p) {
  const { ctx, out } = head(engine, p)
  const bright = p.bright ?? 0.5
  const N = 3 + Math.round(bright * 3)            // 3〜6本
  const cents = (p.detune ?? 0.5) * 28            // 散らし幅
  const life = p.attack + p.dur + p.release + 0.2
  for (let i = 0; i < N; i++) {
    const d = (N === 1 ? 0 : (i / (N - 1) - 0.5) * 2) * cents
    sine(ctx, out, p.freq, p.t0, life, {
      gain: 1 / N, detuneCents: d, shimmer: p.shimmer ?? 0.4, drift: 2 + cents * 0.1, idx: i,
    })
  }
  softEnv(out.gain, p.t0, { amp: p.amp, attack: p.attack, hold: p.dur, release: p.release })
}

// ============ サイン合唱 (倍音加算) ============
export function choirVoice(engine, p) {
  const { ctx, out } = head(engine, p)
  const N = Math.max(3, Math.min(14, p.partials || 6))
  const life = p.attack + p.dur + p.release + 0.2
  for (let i = 1; i <= N; i++) {
    sine(ctx, out, p.freq * i, p.t0, life, {
      gain: (1 / i) * 0.9, shimmer: (p.shimmer ?? 0.4) * 0.5, drift: 1.5, idx: i,
    })
  }
  softEnv(out.gain, p.t0, { amp: p.amp, attack: p.attack, hold: p.dur, release: p.release })
}

// ============ サインパッド (柔らかい持続・少倍音) ============
export function padVoice(engine, p) {
  const { ctx, out } = head(engine, p)
  const life = p.attack + p.dur + p.release + 0.3
  const parts = [1, 2, 3, 4]
  parts.forEach((m, i) => sine(ctx, out, p.freq * m, p.t0, life, {
    gain: (1 / (i + 1)) * 0.8, shimmer: (p.shimmer ?? 0.4) * 0.4, drift: 1.2, idx: i,
  }))
  // パッドは特にゆっくり開く
  softEnv(out.gain, p.t0, { amp: p.amp * 0.9, attack: Math.max(p.attack, 0.9), hold: p.dur, release: p.release, minAttack: 0.6 })
}

// ============ グラス (純倍音のみ・繊細) ============
export function glassVoice(engine, p) {
  const { ctx, out } = head(engine, p)
  const life = p.attack + p.dur + p.release + 0.2
  const parts = [{ m: 1, a: 1 }, { m: 2, a: 0.3 }, { m: 3, a: 0.14 }, { m: 5, a: 0.06 }]
  parts.forEach((pa, i) => sine(ctx, out, p.freq * pa.m, p.t0, life, {
    gain: pa.a, shimmer: (p.shimmer ?? 0.4) * 0.6, drift: 1, idx: i,
  }))
  softEnv(out.gain, p.t0, { amp: p.amp * 0.8, attack: Math.max(p.attack, 0.5), hold: p.dur, release: p.release })
}

// ============ ドローン (オクターブ重ね・地鳴り) ============
export function droneVoice(engine, p) {
  const { ctx, out } = head(engine, p)
  const life = p.attack + p.dur + p.release + 0.5
  const cents = (p.detune ?? 0.5) * 18
  const layers = [
    { f: p.freq * 0.5, g: 0.7 }, { f: p.freq, g: 0.6 }, { f: p.freq * 1.5, g: 0.35 },
  ]
  layers.forEach((L, i) => {
    sine(ctx, out, L.f, p.t0, life, { gain: L.g, detuneCents: -cents, shimmer: p.shimmer ?? 0.4, drift: 2, idx: i })
    sine(ctx, out, L.f, p.t0, life, { gain: L.g, detuneCents: +cents, shimmer: p.shimmer ?? 0.4, drift: 2, idx: i + 7 })
  })
  softEnv(out.gain, p.t0, { amp: p.amp, attack: Math.max(p.attack, 1.0), hold: p.dur * 1.4, release: Math.max(p.release, 2), minAttack: 0.8 })
}

// ============ ボウ (擦弦風・ビブラート) ============
export function bowedVoice(engine, p) {
  const { ctx, out } = head(engine, p)
  const life = p.attack + p.dur + p.release + 0.2
  // 基音 + 弱いオクターブ、ゆっくりビブラート
  ;[{ m: 1, g: 1 }, { m: 2, g: 0.25 }, { m: 3, g: 0.1 }].forEach((L, i) => {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = p.freq * L.m
    const g = ctx.createGain(); g.gain.value = L.g
    osc.connect(g); g.connect(out)
    const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = 4.5 + i * 0.4
    const vd = ctx.createGain(); vd.gain.value = 4 + (p.detune ?? 0.5) * 6
    vib.connect(vd); vd.connect(osc.detune)
    osc.start(p.t0); osc.stop(p.t0 + life); vib.start(p.t0); vib.stop(p.t0 + life)
  })
  softEnv(out.gain, p.t0, { amp: p.amp * 0.85, attack: Math.max(p.attack, 0.6), hold: p.dur, release: p.release })
}

// ============ MICRO: 雫 (やわらかい正弦pluck) ============
export function dewVoice(engine, p) {
  const { ctx, busIn } = engine
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = p.freq * 2
  const g = ctx.createGain(); g.gain.value = 0.00001
  const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0
  osc.connect(g); g.connect(pan); pan.connect(busIn)
  const t0 = p.t0, amp = p.amp * 0.5
  // やわらかい立ち上がり(急出ししない) → ゆるい減衰
  g.gain.setValueAtTime(0.00001, t0)
  g.gain.linearRampToValueAtTime(amp, t0 + 0.04)
  g.gain.exponentialRampToValueAtTime(0.00001, t0 + 0.5)
  osc.frequency.setValueAtTime(p.freq * 2, t0)
  osc.frequency.exponentialRampToValueAtTime(p.freq * 1.94, t0 + 0.5)
  osc.start(t0); osc.stop(t0 + 0.6)
}

// ============ MICRO: ほころび (小さな正弦のふくらみ。粒ノイズ廃止) ============
export function bloomVoice(engine, p) {
  const { ctx, busIn } = engine
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = p.freq * 1.5
  const g = ctx.createGain(); g.gain.value = 0.00001
  const pan = ctx.createStereoPanner(); pan.pan.value = (p.pan || 0) * 0.8
  osc.connect(g); g.connect(pan); pan.connect(busIn)
  const t0 = p.t0, amp = p.amp * 0.4
  softEnv(g.gain, t0, { amp, attack: 0.25, hold: 0.15, release: 0.5, minAttack: 0.2 })
  osc.start(t0); osc.stop(t0 + 1.2)
}
