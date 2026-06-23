import { Delaunay } from 'd3-delaunay'
import { rng, randomPoints, lloyd, centroid } from './lloyd.js'
import { phyllotaxis } from './phyllotaxis.js'

// 3モードの植物細胞組織を生成して cell[] を返す
// parenchyma=柔組織 / phyllotaxis=螺旋 / epidermis=表皮(異方)
export function buildTissue(opts) {
  const { mode, cellCount: N, relax, anisotropy, seed, bounds } = opts
  const rand = rng(seed)

  let points
  if (mode === 'phyllotaxis') {
    points = phyllotaxis(N, bounds)
  } else if (mode === 'epidermis') {
    // 縦伸長: y方向に圧縮した空間で散布 → 細長い表皮細胞
    points = randomPoints(N, bounds, rand)
    const cy = (bounds[1] + bounds[3]) / 2
    points = points.map(([x, y]) => [x, cy + (y - cy) / anisotropy])
    points = lloyd(points, bounds, Math.max(2, relax))
  } else {
    // parenchyma
    points = randomPoints(N, bounds, rand)
    points = lloyd(points, bounds, relax)
  }

  const delaunay = Delaunay.from(points)
  const voronoi = delaunay.voronoi(bounds)
  const cx = (bounds[0] + bounds[2]) / 2
  const cy = (bounds[1] + bounds[3]) / 2

  // 隣接 (delaunay.neighbors)
  const cells = []
  for (let i = 0; i < points.length; i++) {
    const poly = voronoi.cellPolygon(i)
    if (!poly) continue
    const ct = centroid(poly)
    const verts = poly.slice(0, poly.length - 1)
    const sides = verts.length
    let area = 0, perim = 0
    for (let j = 0; j < verts.length; j++) {
      const [x0, y0] = verts[j], [x1, y1] = verts[(j + 1) % verts.length]
      area += x0 * y1 - x1 * y0
      perim += Math.hypot(x1 - x0, y1 - y0)
    }
    area = Math.abs(area) / 2
    const neighbors = [...delaunay.neighbors(i)]
    const dist = Math.hypot(ct[0] - cx, ct[1] - cy)
    cells.push({
      id: i, centroid: ct, area, perimeter: perim, sides,
      vertices: verts, neighbors,
      dist,
      ring: mode === 'phyllotaxis' ? i : dist, // spiralIndex or distance band
    })
  }
  return cells
}
