// 設定の保存/復元 — localStorage に「最後の設定」と「名前付きプリセット」を持つ。
const PKEY = 'tsuki.presets.v1'
const LKEY = 'tsuki.last.v1'

// 永続化する param キー(runtime/midi接続などは除く)
const PARAM_KEYS = [
  'mode', 'cellCount', 'relax', 'anisotropy', 'seed', 'sizeCut', 'weights',
  'breathRate', 'breathDepth', 'tideRate', 'lunarPhase', 'spiralRate', 'spiralDir',
  'layers', 'voiceMacro', 'voiceMid', 'voiceMicro', 'attack', 'release', 'evolve',
  'detune', 'shimmer', 'brightness', 'texture',
  'scale', 'root', 'tempo',
  'reverbWet', 'delayWet', 'delayFeed', 'masterGain',
  'vizSymmetry', 'vizMirror', 'vizWeb', 'vizSpin',
  'midiChannel',
]

export function snapshot(state) {
  const o = {}
  for (const k of PARAM_KEYS) o[k] = clone(state[k])
  return o
}

function clone(v) { return (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v }

export function saveLast(state) {
  try { localStorage.setItem(LKEY, JSON.stringify(snapshot(state))) } catch {}
}
export function loadLast() {
  try { return JSON.parse(localStorage.getItem(LKEY)) } catch { return null }
}

export function listPresets() {
  try { return JSON.parse(localStorage.getItem(PKEY)) || {} } catch { return {} }
}
export function savePreset(name, state) {
  const all = listPresets(); all[name] = snapshot(state)
  try { localStorage.setItem(PKEY, JSON.stringify(all)) } catch {}
}
export function deletePreset(name) {
  const all = listPresets(); delete all[name]
  try { localStorage.setItem(PKEY, JSON.stringify(all)) } catch {}
}
export function presetNames() { return Object.keys(listPresets()) }
