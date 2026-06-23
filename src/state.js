// TSUKI shared state — single source of truth, observable via subscribe()
const listeners = new Set()

export const state = {
  // SOURCE / geometry
  mode: 'phyllotaxis',     // parenchyma | phyllotaxis | epidermis
  cellCount: 140,          // 24..400
  relax: 4,                // Lloyd iterations 0..10
  anisotropy: 1.6,         // 1.0..3.0 (epidermis 伸長率)
  seed: 7,

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
  voiceMacro: 'granular',  // granular | additive | glass
  attack: 1.2,             // s
  release: 4.0,            // s

  // SCALE / TEMPO
  scale: 'just',           // just | overtone | pentatonic | pelog | japanese | micro
  root: 174.61,            // Hz (F3) base
  tempo: 60,               // BPM (56..66)

  // FX
  reverbWet: 0.5,
  delayWet: 0.2,
  delayFeed: 0.45,
  masterGain: 0.8,

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
