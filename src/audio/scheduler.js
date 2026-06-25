// ルックアヘッド・スケジューラ (25ms tick / 0.12s先読み)。
// 螺旋を基調に巡りつつ、evolve で「複雑に変わり続ける」: ピッチドリフト・
// 隣接ウォーク(装飾)・周回ごとの起点ジャンプ/反転・潮汐(月相)の自動進行。
import { spiralOrder } from './spiral.js'
import { mapCell } from '../geometry/mapping.js'
import { triggerVoice } from './voices/index.js'

const LOOKAHEAD = 0.12
const TICK_MS = 25

export function createScheduler(engine, st, tide, midi, hooks = {}) {
  let order = []           // 螺旋順 cells
  let byId = new Map()     // id → cell (隣接ウォーク用)
  let idx = 0
  let nextTime = 0
  let timer = null
  let last = null          // 直近に鳴らした cell
  const rng = mulberry()

  function setCells(cells) {
    order = spiralOrder(cells, st)
    byId = new Map(cells.map(c => [c.id, c]))
    idx = 0; last = null
  }

  function stepInterval(t) {
    const d = tide.density(t)
    const base = 1 / Math.max(0.5, st.spiralRate)
    const beat = 60 / st.tempo
    return base * (1.4 - d) * (0.85 + 0.3 * (beat / 1.0))
  }

  // 緩慢で非周期的なピッチドリフト(±semitone)。3つの無理数比の正弦和。
  function pitchDrift(t) {
    const e = st.evolve || 0
    if (e <= 0) return 0
    const d = 0.5 * Math.sin(t * 0.273) + 0.3 * Math.sin(t * 0.153 + 1.7) + 0.2 * Math.sin(t * 0.091 + 3.1)
    return e * 7 * d // 最大 ±7 semitone (スケールに量子化される)
  }

  // 次に鳴らすセルを選ぶ。evolve に応じて隣接ウォークで枝分かれする。
  function pickCell() {
    const e = st.evolve || 0
    // 隣接ウォーク: 直近セルの隣へ飛ぶ(装飾的・非反復)
    if (last && last.neighbors.length && rng() < e * 0.55) {
      const nb = last.neighbors[(rng() * last.neighbors.length) | 0]
      const c = byId.get(nb)
      if (c) return c
    }
    // 基調: 螺旋スイープ
    const cell = order[idx % order.length]
    idx++
    // 周回末で起点をジャンプ/反転 → 同じ並びを繰り返さない
    if (idx % order.length === 0 && e > 0) {
      if (rng() < e * 0.6) order.reverse()
      idx += (rng() * order.length * e) | 0
    }
    return cell
  }

  function scheduleStep(t) {
    if (!order.length) return
    // 時間変調を反映(同じセルでも音が変わり続ける)
    st._pitchShift = pitchDrift(t)
    if (st.evolve > 0) st.lunarPhase = (st.lunarPhase + st.evolve * 0.00025) % 1

    const cell = pickCell()
    const m = mapCell(cell, st)
    if (!m) return // 白玉(大セル)は鳴らさない
    if (rng() < tide.density(t) * 0.92 + 0.04) {
      last = cell
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
