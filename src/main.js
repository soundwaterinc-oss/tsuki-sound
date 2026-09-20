import { state, setState, subscribe } from './state.js'
import { buildTissue } from './geometry/tissue.js'
import { extractFeatures } from './geometry/features.js'
import { createEngine } from './audio/engine.js'
import { createBreath } from './audio/breath.js'
import { createTide } from './audio/tide.js'
import { createScheduler } from './audio/scheduler.js'
import { createMidi } from './audio/midi.js'
import { createCanvas } from './ui/canvas.js'
import { createControls } from './ui/controls.js'
import {
  loadLast, saveLast, savePreset, deletePreset, presetNames, listPresets, snapshot,
} from './ui/presets.js'

const BOUNDS = [0, 0, 1000, 1000] // 正方フィールド
const FIELD_ON = /[?&#]field/.test(location.href)

const app = document.getElementById('app')
const startEl = document.getElementById('start')

let engine = null, breath = null, tide = null, scheduler = null, midi = null
let canvas = null, controls = null
let cells = []
let bridgeRegistered = false

// 起動時に「最後の設定」を復元(UI構築前に state へ反映)
const last = loadLast()
if (last) Object.assign(state, last)

function rebuildTissue() {
  cells = buildTissue({
    mode: state.mode, cellCount: state.cellCount, relax: state.relax,
    anisotropy: state.anisotropy, seed: state.seed, bounds: BOUNDS,
  })
  extractFeatures(cells, BOUNDS)
  if (canvas) canvas.setCells(cells)
  if (scheduler) scheduler.setCells(cells)
}

function initAudio() {
  engine = createEngine(state)
  tide = createTide(state)
  midi = createMidi(state)
  breath = createBreath(engine, state)
  scheduler = createScheduler(engine, state, tide, midi, {
    breath,
    onCell: (cell, m) => canvas && canvas.flash(cell, m),
  })
  scheduler.setCells(cells)
  engine.setTone(brightToHz(state.brightness)) // brightness を即マスター音色へ
  if (canvas) canvas.setBreath(() => breath.phase())
  maybeRegisterFieldBridge()

  // MIDI 出力一覧
  midi.init().then(list => {
    controls && controls.setMidiOutputs(list.map(o => ({ id: o.id, name: o.name })))
  }).catch(() => {})
}

const SOURCE_KEYS = new Set(['mode', 'cellCount', 'relax', 'anisotropy', 'seed'])

function onChange(path, v) {
  if (SOURCE_KEYS.has(path)) { rebuildTissue(); return }
  if (!engine) return
  switch (path) {
    case 'breathRate': breath.setRate(v); break
    case 'breathDepth': breath.setDepth(v); break
    case 'spiralDir': scheduler.setCells(cells); break
    case 'reverbWet': engine.setReverbWet(v); break
    case 'delayWet': case 'delayFeed': engine.setDelay(state.delayWet, state.delayFeed); break
    case 'masterGain': engine.setMaster(v); break
    case 'tempo': engine.setTempo(v); break
    case 'brightness': engine.setTone(brightToHz(v)); break
  }
}

// brightness(0..1) → LPFカットオフ(指数 1.2k〜9kHz)
function brightToHz(v) { return 1200 * Math.pow(9000 / 1200, Math.max(0, Math.min(1, v))) }

// 現在の state を音声エンジンへ一括反映(プリセット読込時に使う)
function syncAudioFromState() {
  if (!engine) return
  engine.setTone(brightToHz(state.brightness))
  engine.setReverbWet(state.reverbWet)
  engine.setDelay(state.delayWet, state.delayFeed)
  engine.setMaster(state.masterGain)
  engine.setTempo(state.tempo)
  breath.setRate(state.breathRate)
  breath.setDepth(state.breathDepth)
}

// プリセット/保存設定を適用: state上書き → 幾何再生成 → 音声反映 → UI再同期
function applySettings(obj) {
  if (!obj) return
  Object.assign(state, obj)
  rebuildTissue()
  if (engine) { syncAudioFromState(); scheduler.setCells(cells) }
  controls && controls.refresh()
}

function clamp01(v) { return Math.min(1, Math.max(0, v)) }
function lerp(a, b, t) { return a + (b - a) * clamp01(t) }

function setRunning(on, btn = controls && controls.playBtn) {
  if (!engine) return
  if (on) {
    if (engine.ctx.state === 'suspended') engine.ctx.resume()
    scheduler.start()
    setState({ running: true })
    if (btn) {
      btn.textContent = '❚❚ rest'
      btn.style.background = '#cfd8e3'
    }
  } else {
    scheduler.stop()
    setState({ running: false })
    if (btn) {
      btn.textContent = '▶ BREATHE'
      btn.style.background = '#9fd6b0'
    }
  }
}

function applyMacro(name, value) {
  const v = clamp01(value)
  switch (name) {
    case 'macro.a':
      state.breathRate = lerp(0.05, 0.2, v)
      state.breathDepth = lerp(0.05, 0.6, v)
      state.tideRate = lerp(0.01, 0.2, v)
      state.spiralRate = lerp(1, 14, v)
      break
    case 'macro.b':
      state.cellCount = Math.round(lerp(32, 320, v))
      state.relax = Math.round(lerp(0, 10, v))
      state.anisotropy = lerp(1, 3, v)
      state.sizeCut = lerp(0.9, 0.35, v)
      rebuildTissue()
      break
    case 'macro.c':
      state.brightness = lerp(0.08, 1, v)
      state.texture = lerp(0.02, 1, v)
      state.reverbWet = lerp(0.05, 0.8, v)
      state.delayWet = lerp(0.02, 0.5, v)
      state.delayFeed = lerp(0.1, 0.7, v)
      break
    case 'volume':
      state.masterGain = lerp(0, 1, v)
      break
    default:
      return
  }
  if (engine) syncAudioFromState()
  if (controls) controls.refresh()
}

// 卓（EL-SYSTEMA Live）から見えるように読み込み時点で登録し、audio は initAudio 後に attachAudio で差し込む。
// 卓の ▶ は、開始画面がまだなら start() を代行してから鳴らす（自動再生制限で ctx が起きなければ接続層が案内を出す）。
let fieldBridge = null
function maybeRegisterFieldBridge() {
  if (!FIELD_ON || typeof window.registerElSystemaInstrument !== 'function') return
  if (bridgeRegistered) { if (engine && fieldBridge && fieldBridge.attachAudio) fieldBridge.attachAudio({ audioContext: engine.ctx, outputNode: engine.masterOut }); return }
  fieldBridge = window.registerElSystemaInstrument({
    id: 'tsuki-sound',
    audioContext: engine ? engine.ctx : undefined,
    outputNode: engine ? engine.masterOut : undefined,
    onPlay: () => { if (!engine) start(); setRunning(true) },
    onStop: () => setRunning(false),
    onSetParam: (name, value) => applyMacro(name, value),
    onLoadPreset: (preset) => applySettings(preset && preset.params ? preset.params : preset),
    onSnapshot: () => snapshot(state),
  })
  bridgeRegistered = true
}

function start() {
  startEl.style.opacity = '0'
  setTimeout(() => startEl.remove(), 500)
  canvas = createCanvas(app, BOUNDS)
  rebuildTissue()
  canvas.setCells(cells)
  initAudio()
  canvas.setBreath(() => breath.phase())
}

controls = createControls({
  onChange,
  onRegen: () => { state.seed = (state.seed % 999) + 1; rebuildTissue(); controls.refresh() },
  onMidiSelect: id => midi && midi.selectOutput(id),
  onSavePreset: (name) => { savePreset(name, state); controls.setPresetList(presetNames()) },
  onLoadPreset: (name) => { applySettings(listPresets()[name]) },
  onDeletePreset: (name) => { deletePreset(name); controls.setPresetList(presetNames()) },
  onPlay: (btn) => {
    if (!engine) return
    setRunning(!state.running, btn)
  },
})
controls.setPresetList(presetNames())

// 設定変更を「最後の設定」として自動保存(デバウンス)
let saveTimer = null
subscribe(() => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveLast(state), 400)
})

// 初回ジェスチャで起動（AudioContextの解放）
startEl.addEventListener('click', () => {
  start()
  if (engine && engine.ctx.state === 'suspended') engine.ctx.resume()
}, { once: true })

// 読み込み時に場へ登録（?field の時だけ有効）。audio は start() 後に差し込まれる
maybeRegisterFieldBridge()
