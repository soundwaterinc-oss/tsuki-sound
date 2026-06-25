// TSUKI shared state — single source of truth, observable via subscribe()
const listeners = new Set()

export const state = {
  // SOURCE / geometry
  mode: 'phyllotaxis',     // parenchyma | phyllotaxis | epidermis
  cellCount: 140,          // 24..400
  relax: 4,                // Lloyd iterations 0..10
  anisotropy: 1.6,         // 1.0..3.0 (epidermis 伸長率)
  seed: 7,

  // 白玉カット: この正規化面積以上の大セルは鳴らさない(小さいほど大セルを多く消す)
  sizeCut: 0.62,

  // MAPPING WEIGHTS (合計 ≈ 1.0)
  weights: {
    area: 0.30,
    centroidX: 0.20,
    centroidY: 0.20,
    sides: 0.15,
    neighbors: 0.15,
  },

  // LUNAR — 月の時間
  breathRate: 0.1,         // Hz 0.05..0.2
  breathDepth: 0.25,       // 0..1
  tideRate: 0.05,          // Hz of tide swell (1周期 ≈ 8..32 step)
  lunarPhase: 0.0,         // 0..1 (新月..満月..新月)
  spiralRate: 6.0,         // cells / sec base
  spiralDir: 'out',        // out | in

  // SYNTH layers
  layers: { macro: true, mid: true, micro: true },
  voiceMacro: 'weave',     // weave | granular | choir | glass | drone
  voiceMid: 'pad',         // pad | weave | bowed | glass | choir
  voiceMicro: 'dew',       // dew | bloom | weave
  attack: 1.4,             // s (やわらかい立ち上がり)
  release: 4.5,            // s

  // TIMBRE — 全声部に効くサインの絡み具合
  detune: 0.5,             // 0..1 ユニゾンの散らし幅(cent)
  shimmer: 0.4,            // 0..1 振幅ゆらぎ(もつれ)の深さ
  brightness: 0.5,         // 0..1 倍音/声部数
  texture: 0.35,           // 0..1 粒子/息(ノイズ⇄サインの中間度)

  // SCALE / TEMPO
  scale: 'just',           // just | overtone | pentatonic | pelog | japanese | micro
  root: 174.61,            // Hz (F3) base
  tempo: 60,               // BPM (56..66)

  // FX
  reverbWet: 0.5,
  delayWet: 0.2,
  delayFeed: 0.45,
  masterGain: 0.8,

  // PATTERN — 幾何マンダラ描画
  vizSymmetry: 6,          // N回対称(万華鏡) 1..12
  vizMirror: true,         // 二面(反転)対称
  vizWeb: 0.18,            // ラティスの濃さ 0..0.4
  vizSpin: 0.03,           // 緩慢な自転速度

  // MIDI
  midiEnabled: false,
  midiChannel: 1,

  // runtime
  running: false,
}

export function setState(patch) {
  Object.assign(state, patch)
  for (const fn of listeners) fn(state, patch)
}

// nested set, e.g. setPath('weights.area', 0.4)
export function setPath(path, value) {
  const keys = path.split('.')
  let o = state
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]]
  o[keys[keys.length - 1]] = value
  for (const fn of listeners) fn(state, { [path]: value })
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
