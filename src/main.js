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
  loadLast, saveLast, savePreset, deletePreset, presetNames, listPresets,
} from './ui/presets.js'

const BOUNDS = [0, 0, 1000, 1000] // 正方フィールド

const app = document.getElementById('app')
const startEl = document.getElementById('start')

let engine = null, breath = null, tide = null, scheduler = null, midi = null
let canvas = null, controls = null
let cells = []

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
    if (state.running) {
      scheduler.stop(); setState({ running: false })
      btn.textContent = '▶ BREATHE'; btn.style.background = '#9fd6b0'
    } else {
      if (engine.ctx.state === 'suspended') engine.ctx.resume()
      scheduler.start(); setState({ running: true })
      btn.textContent = '❚❚ rest'; btn.style.background = '#cfd8e3'
    }
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
