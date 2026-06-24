// AudioContext + master chain + FX (大Reverb / pingpong Delay / soft sat / limiter)
// breath が掛かる masterBreathGain と masterLPF を公開する。

export function createEngine(st) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()

  // --- master chain ---
  // voices → busIn → [reverbSend/delaySend] → breathGain → LPF → satShaper → limiter → out
  const busIn = ctx.createGain()
  const dry = ctx.createGain(); dry.gain.value = 1

  // soft saturation で正弦群にわずかな温度を(控えめ)
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSatCurve(0.18)
  shaper.oversample = '2x'

  const breathGain = ctx.createGain(); breathGain.gain.value = 0.9  // breath が乗る
  const lpf = ctx.createBiquadFilter()
  lpf.type = 'lowpass'; lpf.frequency.value = 4200; lpf.Q.value = 0.3

  // やわらかいグルー(急なポンピングを避ける)
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6; limiter.knee.value = 18
  limiter.ratio.value = 4; limiter.attack.value = 0.05; limiter.release.value = 0.5

  const master = ctx.createGain(); master.gain.value = st.masterGain

  // --- Reverb (synthetic IR convolver, 大空間) ---
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 8.0, 3.0)
  const reverbReturn = ctx.createGain(); reverbReturn.gain.value = st.reverbWet

  // --- Delay (pingpong) ---
  const delaySend = ctx.createGain(); delaySend.gain.value = st.delayWet
  const dL = ctx.createDelay(2.0), dR = ctx.createDelay(2.0)
  const dt = beatDelay(st.tempo)
  dL.delayTime.value = dt; dR.delayTime.value = dt * 1.5
  const fb = ctx.createGain(); fb.gain.value = st.delayFeed
  const mergerL = ctx.createGain(), mergerR = ctx.createGain()
  // pingpong cross-feedback
  dL.connect(mergerL); dR.connect(mergerR)
  dL.connect(fb); fb.connect(dR); dR.connect(dL)
  const panL = ctx.createStereoPanner(); panL.pan.value = -0.7
  const panR = ctx.createStereoPanner(); panR.pan.value = 0.7
  mergerL.connect(panL); mergerR.connect(panR)

  // wiring
  busIn.connect(dry); dry.connect(shaper)
  busIn.connect(convolver); convolver.connect(reverbReturn); reverbReturn.connect(shaper)
  busIn.connect(delaySend); delaySend.connect(dL)
  panL.connect(shaper); panR.connect(shaper)

  shaper.connect(breathGain)
  breathGain.connect(lpf)
  lpf.connect(limiter)
  limiter.connect(master)
  master.connect(ctx.destination)

  // shared 正弦バッファ (granular ソース)
  const sineBuffer = makeSineBuffer(ctx, 1.0, 220)
  const fieldBuffer = makeNoiseBuffer(ctx, 2.0) // air / breath tick 用

  const engine = {
    ctx, busIn, breathGain, lpf, master,
    reverbReturn, delaySend, dL, dR, fb,
    sineBuffer, fieldBuffer,
    setReverbWet: v => reverbReturn.gain.value = v,
    setDelay: (wet, feed) => { delaySend.gain.value = wet; fb.gain.value = feed },
    setMaster: v => master.gain.setTargetAtTime(v, ctx.currentTime, 0.05),
    setTempo: bpm => { const d = beatDelay(bpm); dL.delayTime.value = d; dR.delayTime.value = d * 1.5 },
  }
  return engine
}

function beatDelay(bpm) { return Math.min(1.8, (60 / bpm) * 0.75) } // 付点八分風

function makeSatCurve(amount) {
  const n = 1024, c = new Float32Array(n)
  const k = amount * 8
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    c[i] = (1 + k) * x / (1 + k * Math.abs(x))
  }
  return c
}

// 指数減衰のステレオIR (大空間リバーブ)
function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / len
      // 初期の薄い拡散 + 滑らかなテール
      const env = Math.pow(1 - t, decay)
      d[i] = (Math.random() * 2 - 1) * env * (0.4 + 0.6 * Math.pow(1 - t, 0.5))
    }
  }
  return buf
}

function makeSineBuffer(ctx, seconds, freq) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / rate
    d[i] = Math.sin(2 * Math.PI * freq * t) * 0.6
      + Math.sin(2 * Math.PI * freq * 2 * t) * 0.18
      + Math.sin(2 * Math.PI * freq * 3 * t) * 0.08
  }
  return buf
}

function makeNoiseBuffer(ctx, seconds) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    // やや低域寄りのピンク風ノイズ
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
  return buf
}
