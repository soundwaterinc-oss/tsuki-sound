// 細胞描画 — 淡塗り、発音セルを文字色に発火→減衰、隣接和音はエッジを光らせる。
import { theme } from './theme.js'

export function createCanvas(container, bounds) {
  const cv = document.createElement('canvas')
  cv.style.position = 'absolute'; cv.style.inset = '0'
  container.appendChild(cv)
  const ctx = cv.getContext('2d')
  let cells = []
  const flashes = new Map() // id → {level, edge}
  let dpr = 1, scale = 1, ox = 0, oy = 0
  let breathFn = () => 0.5

  function resize() {
    dpr = window.devicePixelRatio || 1
    cv.width = container.clientWidth * dpr
    cv.height = container.clientHeight * dpr
    // 正方形フィールドを中央に収める (bounds is square)
    const side = Math.min(container.clientWidth, container.clientHeight) * 0.92
    scale = (side * dpr) / (bounds[2] - bounds[0])
    ox = (cv.width - side * dpr) / 2
    oy = (cv.height - side * dpr) / 2
  }
  window.addEventListener('resize', resize)
  resize()

  const X = x => ox + (x - bounds[0]) * scale
  const Y = y => oy + (y - bounds[1]) * scale

  function setCells(c) { cells = c; flashes.clear() }
  function setBreath(fn) { breathFn = fn }
  function flash(cell, m) {
    flashes.set(cell.id, { level: 1, edge: m.chord.length > 0 ? 1 : 0.3 })
  }

  function frame() {
    const b = breathFn() // 0..1
    ctx.clearRect(0, 0, cv.width, cv.height)
    // 背景の淡い満ち引き
    const g = ctx.createRadialGradient(cv.width / 2, cv.height * 0.42, 10,
      cv.width / 2, cv.height * 0.42, cv.height * 0.8)
    g.addColorStop(0, mix(theme.bgGrad, theme.bg, 1 - b * 0.4))
    g.addColorStop(1, theme.bg)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, cv.width, cv.height)

    for (const c of cells) {
      const fl = flashes.get(c.id)
      const lvl = fl ? fl.level : 0
      ctx.beginPath()
      const v = c.vertices
      ctx.moveTo(X(v[0][0]), Y(v[0][1]))
      for (let i = 1; i < v.length; i++) ctx.lineTo(X(v[i][0]), Y(v[i][1]))
      ctx.closePath()
      // 塗り: 基本は暗、発火で淡緑へ
      ctx.fillStyle = lvl > 0 ? mix(theme.cell, theme.flash, lvl * 0.85) : theme.cell
      ctx.globalAlpha = 0.5 + b * 0.25
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.lineWidth = 1 * dpr
      ctx.strokeStyle = lvl > 0 ? mix(theme.cellEdge, theme.flashEdge, lvl) : theme.cellEdge
      ctx.stroke()
      if (fl) {
        fl.level *= 0.92
        if (fl.level < 0.02) flashes.delete(c.id)
      }
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return { setCells, flash, setBreath, resize }
}

function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t))
  const ca = hex(a), cb = hex(b)
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t)
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t)
  return `rgb(${r},${g},${bl})`
}
function hex(h) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
