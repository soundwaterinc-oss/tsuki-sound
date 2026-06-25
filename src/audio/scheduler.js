// ルックアヘッド・スケジューラ (25ms tick / 0.1s先読み)。
// 螺旋順に細胞を巡り、潮汐で密度を、呼吸で全体振幅を変調。カルマ(tide伸縮)あり。
import { spiralOrder } from './spiral.js'
import { mapCell } from '../geometry/mapping.js'
import { triggerVoice } from './voices/index.js'

const LOOKAHEAD = 0.12
const TICK_MS = 25

export function createScheduler(engine, st, tide, midi, hooks = {}) {
  let order = []
  let idx = 0
  let nextTime = 0
  let timer = null
  const rng = mulberry()

  function setCells(cells) {
    order = spiralOrder(cells, st)
    idx = 0
  }

  function stepInterval(t) {
    const d = tide.density(t)            // 0..1
    const base = 1 / Math.max(0.5, st.spiralRate) // sec/cell
    const beat = 60 / st.tempo
    // 密度高→詰まる, 低→空く。テンポでも微妙に格子に寄せる。
    return base * (1.4 - d) * (0.85 + 0.3 * (beat / 1.0))
  }

  function scheduleStep(t) {
    if (!order.length) return
    const cell = order[idx % order.length]
    idx++
    const m = mapCell(cell, st)
    if (!m) return // 白玉(大セル)は鳴らさない
    // 潮汐ゲート: 密度に応じて発音確率
    if (rng() < tide.density(t) * 0.92 + 0.04) {
      triggerVoice(engine, st, m, t)
      midi.noteOn(m.freq, Math.round(40 + m.amp * 80), Math.round(m.dur * 1000))
      for (const cf of m.chord) midi.noteOn(cf, Math.round(30 + m.amp * 50), Math.round(m.dur * 800))
      if (hooks.onCell) hooks.onCell(cell, m, t)
    }
  }

  function tick() {
    const now = engine.ctx.currentTime
    while (nextTime < now + LOOKAHEAD) {
      scheduleStep(nextTime)
      nextTime += stepInterval(nextTime)
    }
    // breath を CC で外部音源へ
    if (hooks.breath) midi.breathCC(hooks.breath.phase())
  }

  function start() {
    nextTime = engine.ctx.currentTime + 0.1
    timer = setInterval(tick, TICK_MS)
  }
  function stop() { clearInterval(timer); timer = null }

  return { setCells, start, stop }
}

function mulberry(seed = 12345) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
