// 幾何マンダラ描画 — 細胞の隣接ラティス + フィロタキシ螺旋を
// N回対称(万華鏡)＋加算合成で重ね、発音セルを光で咲かせる。
import { theme } from './theme.js'
import { state } from '../state.js'

export function createCanvas(container, bounds) {
  const cv = document.createElement('canvas')
  cv.style.position = 'absolute'; cv.style.inset = '0'
  container.appendChild(cv)
  const ctx = cv.getContext('2d')
  let cells = []
  let pairs = []          // 隣接エッジ(重複なし)
  let spirals = []        // フィロタキシ螺旋(i→i+fib)
  const flashes = new Map()
  let dpr = 1, scale = 1, ox = 0, oy = 0
  let breathFn = () => 0.5
  let angle = 0

  function resize() {
    dpr = window.devicePixelRatio || 1
    cv.width = container.clientWidth * dpr
    cv.height = container.clientHeight * dpr
    const side = Math.min(container.clientWidth, container.clientHeight) * 0.96
    scale = (side * dpr) / (bounds[2] - bounds[0])
    ox = (cv.width - side * dpr) / 2
    oy = (cv.height - side * dpr) / 2
  }
  window.addEventListener('resize', resize)
  resize()

  const X = x => ox + (x - bounds[0]) * scale
  const Y = y => oy + (y - bounds[1]) * scale

  function setCells(c) {
    cells = c; flashes.clear()
    // 隣接エッジを一意化
    pairs = []
    const idIndex = new Map(c.map((cell, i) => [cell.id, i]))
    for (const cell of c) {
      for (const nb of cell.neighbors) {
        if (cell.id < nb && idIndex.has(nb)) pairs.push([idIndex.get(cell.id), idIndex.get(nb)])
      }
    }
    // フィロタキシ螺旋: id順に Fibonacci 間隔で結ぶ(parastichy)
    spirals = []
    if (state.mode === 'phyllotaxis') {
      const fib = [8, 13, 21]
      for (let i = 0; i < c.length; i++) {
        for (const f of fib) {
          const j = i + f
          if (j < c.length) spirals.push([i, j, f])
        }
      }
    }
  }
  function setBreath(fn) { breathFn = fn }
  function flash(cell, m) {
    const idx = cells.indexOf(cell)
    if (idx < 0) return
    flashes.set(idx, { level: 1, big: m.chord.length > 0 })
  }

  function frame() {
    const b = breathFn()                       // 0..1 呼吸
    const K = Math.max(1, Math.round(state.vizSymmetry || 6))
    const webA = state.vizWeb ?? 0.18
    angle += (state.vizSpin ?? 0.02) * 0.016    // 緩慢な自転

    // 背景(満ち引き)
    ctx.globalCompositeOperation = 'source-over'
    const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, 10,
      cv.width / 2, cv.height / 2, cv.height * 0.75)
    g.addColorStop(0, mix(theme.bgGrad, theme.bg, 1 - b * 0.5))
    g.addColorStop(1, '#070f18')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, cv.width, cv.height)

    const Cx = X((bounds[0] + bounds[2]) / 2)
    const Cy = Y((bounds[1] + bounds[3]) / 2)
    // 中心相対座標(1フレーム1回)
    const rc = cells.map(c => [X(c.centroid[0]) - Cx, Y(c.centroid[1]) - Cy])

    ctx.save()
    ctx.translate(Cx, Cy)
    ctx.rotate(angle)
    ctx.globalCompositeOperation = 'lighter'    // 重なりが光になる
    ctx.lineCap = 'round'

    for (let k = 0; k < K; k++) {
      ctx.save()
      ctx.rotate((k * 2 * Math.PI) / K)
      if (state.vizMirror && k % 2 === 1) ctx.scale(1, -1) // 反転で二面対称
      drawLattice(rc, b, webA)
      drawFlashes(rc, b)
      ctx.restore()
    }
    ctx.restore()

    // 減衰
    for (const [id, fl] of flashes) {
      fl.level *= 0.9
      if (fl.level < 0.02) flashes.delete(id)
    }
    requestAnimationFrame(frame)
  }

  function drawLattice(rc, b, webA) {
    const dpr2 = dpr
    // 隣接ラティス
    ctx.lineWidth = 0.6 * dpr2
    for (const [a, c] of pairs) {
      const ca = cells[a], pa = rc[a], pc = rc[c]
      const hue = 150 + (ca.f.ring || 0) * 90
      ctx.strokeStyle = `hsla(${hue},55%,62%,${webA * (0.55 + 0.45 * b)})`
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pc[0], pc[1]); ctx.stroke()
    }
    // フィロタキシ螺旋(parastichy) — 太さ/色を間隔で変える
    if (spirals.length) {
      for (const [a, c, f] of spirals) {
        const pa = rc[a], pc = rc[c]
        const hue = f === 8 ? 165 : f === 13 ? 195 : 140
        ctx.strokeStyle = `hsla(${hue},60%,66%,${webA * 0.7 * (0.5 + 0.5 * b)})`
        ctx.lineWidth = 0.5 * dpr2
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pc[0], pc[1]); ctx.stroke()
      }
    }
    // 細胞核(淡い点)
    ctx.fillStyle = `hsla(190,30%,80%,${0.06 + 0.05 * b})`
    for (const p of rc) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.8 * dpr2, 0, 6.283); ctx.fill()
    }
  }

  function drawFlashes(rc, b) {
    for (const [id, fl] of flashes) {
      const p = rc[id]; if (!p) continue
      const lvl = fl.level
      const r = (fl.big ? 16 : 9) * dpr * (0.6 + lvl)
      // グロー
      const gg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r)
      gg.addColorStop(0, `hsla(${fl.big ? 150 : 175},80%,82%,${0.9 * lvl})`)
      gg.addColorStop(0.5, `hsla(160,70%,60%,${0.4 * lvl})`)
      gg.addColorStop(1, 'hsla(160,70%,50%,0)')
      ctx.fillStyle = gg
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.283); ctx.fill()
      // セルの輪郭を一瞬光らせる
      const cell = cells[id]
      if (cell && cell.vertices) {
        ctx.strokeStyle = `hsla(150,80%,85%,${0.7 * lvl})`
        ctx.lineWidth = 1.2 * dpr
        ctx.beginPath()
        const Cx = X((bounds[0] + bounds[2]) / 2), Cy = Y((bounds[1] + bounds[3]) / 2)
        const v = cell.vertices
        ctx.moveTo(X(v[0][0]) - Cx, Y(v[0][1]) - Cy)
        for (let i = 1; i < v.length; i++) ctx.lineTo(X(v[i][0]) - Cx, Y(v[i][1]) - Cy)
        ctx.closePath(); ctx.stroke()
      }
    }
  }

  requestAnimationFrame(frame)
  return { setCells, flash, setBreath, resize }
}

function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t))
  const ca = hex(a), cb = hex(b)
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)},${Math.round(ca[1] + (cb[1] - ca[1]) * t)},${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`
}
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
