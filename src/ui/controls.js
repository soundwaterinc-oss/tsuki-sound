// コントロールパネル — SOURCE / MAPPING / LUNAR / SYNTH / SCALE / TEMPO / FX / MIDI
import { state, setState, setPath } from '../state.js'
import { theme } from './theme.js'
import { VOICE_OPTIONS } from '../audio/voices/index.js'

export function createControls(handlers) {
  const panel = document.createElement('div')
  panel.id = 'panel'
  panel.innerHTML = ''
  Object.assign(panel.style, {
    position: 'fixed', top: '0', right: '0', height: '100%', width: '300px',
    overflowY: 'auto', background: 'rgba(13,27,42,0.86)', backdropFilter: 'blur(8px)',
    borderLeft: `1px solid ${theme.cellEdge}`, color: theme.ink, padding: '14px 16px',
    font: '12px/1.5 "Hiragino Kaku Gothic ProN", system-ui, sans-serif', zIndex: '40',
    boxSizing: 'border-box',
  })
  document.body.appendChild(panel)

  const toggle = document.createElement('button')
  toggle.textContent = '≡'
  Object.assign(toggle.style, {
    position: 'fixed', top: '12px', right: '312px', zIndex: '41',
    background: theme.cell, color: theme.leaf, border: `1px solid ${theme.cellEdge}`,
    borderRadius: '6px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '16px',
  })
  document.body.appendChild(toggle)
  let open = true
  toggle.onclick = () => {
    open = !open
    panel.style.transform = open ? 'translateX(0)' : 'translateX(100%)'
    toggle.style.right = open ? '312px' : '12px'
  }
  panel.style.transition = toggle.style.transition = 'all .25s ease'

  const h = (t) => { const e = document.createElement('div'); e.textContent = t
    Object.assign(e.style, { color: theme.leaf, letterSpacing: '.2em', fontSize: '10px',
      margin: '16px 0 6px', borderBottom: `1px solid ${theme.cellEdge}`, paddingBottom: '4px' })
    panel.appendChild(e) }

  function slider(label, path, min, max, step, fmt = v => v) {
    const wrap = document.createElement('label')
    Object.assign(wrap.style, { display: 'block', margin: '8px 0' })
    const top = document.createElement('div')
    Object.assign(top.style, { display: 'flex', justifyContent: 'space-between' })
    const name = document.createElement('span'); name.textContent = label
    const val = document.createElement('span'); val.style.color = theme.dim
    const cur = get(path)
    val.textContent = fmt(cur)
    top.append(name, val)
    const inp = document.createElement('input')
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = cur
    inp.style.width = '100%'; inp.style.accentColor = theme.leaf
    inp.oninput = () => {
      const v = parseFloat(inp.value)
      setPath(path, v); val.textContent = fmt(v)
      handlers.onChange && handlers.onChange(path, v)
    }
    wrap.append(top, inp); panel.appendChild(wrap)
    return inp
  }

  function select(label, path, opts) {
    const wrap = document.createElement('label')
    Object.assign(wrap.style, { display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', margin: '8px 0' })
    const name = document.createElement('span'); name.textContent = label
    const sel = document.createElement('select')
    Object.assign(sel.style, { background: theme.cell, color: theme.ink,
      border: `1px solid ${theme.cellEdge}`, borderRadius: '4px', padding: '2px 4px' })
    for (const o of opts) {
      const op = document.createElement('option')
      op.value = typeof o === 'string' ? o : o.v
      op.textContent = typeof o === 'string' ? o : o.t
      sel.appendChild(op)
    }
    sel.value = get(path)
    sel.onchange = () => { setPath(path, sel.value); handlers.onChange && handlers.onChange(path, sel.value) }
    wrap.append(name, sel); panel.appendChild(wrap)
    return sel
  }

  function toggleBtn(label, path) {
    const b = document.createElement('button')
    const refresh = () => { b.textContent = (get(path) ? '● ' : '○ ') + label
      b.style.color = get(path) ? theme.leaf : theme.dim }
    Object.assign(b.style, { display: 'inline-block', margin: '3px 4px 3px 0',
      background: theme.cell, border: `1px solid ${theme.cellEdge}`, borderRadius: '4px',
      padding: '3px 8px', cursor: 'pointer' })
    refresh()
    b.onclick = () => { setPath(path, !get(path)); refresh(); handlers.onChange && handlers.onChange(path, get(path)) }
    panel.appendChild(b)
    return b
  }

  // ---- build ----
  const title = document.createElement('div')
  title.innerHTML = '<b style="letter-spacing:.3em">月 TSUKI</b><br><span style="color:#5b7185;font-size:10px">PLANT-CELL LUNAR INSTRUMENT</span>'
  panel.appendChild(title)

  const playBtn = document.createElement('button')
  Object.assign(playBtn.style, { width: '100%', margin: '12px 0', padding: '10px',
    background: theme.leaf, color: theme.bg, border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontWeight: '700', letterSpacing: '.2em' })
  playBtn.textContent = '▶ BREATHE'
  playBtn.onclick = () => handlers.onPlay && handlers.onPlay(playBtn)
  panel.appendChild(playBtn)

  h('SOURCE')
  select('mode', 'mode', ['phyllotaxis', 'parenchyma', 'epidermis'])
  slider('cell count N', 'cellCount', 24, 400, 1, v => v | 0)
  slider('relax k', 'relax', 0, 10, 1, v => v | 0)
  slider('anisotropy', 'anisotropy', 1, 3, 0.1)
  slider('seed', 'seed', 1, 999, 1, v => v | 0)
  const regen = document.createElement('button')
  Object.assign(regen.style, { width: '100%', margin: '6px 0', padding: '6px',
    background: theme.cell, color: theme.leaf, border: `1px solid ${theme.cellEdge}`,
    borderRadius: '4px', cursor: 'pointer' })
  regen.textContent = '↻ regenerate tissue'
  regen.onclick = () => handlers.onRegen && handlers.onRegen()
  panel.appendChild(regen)

  h('MAPPING WEIGHTS')
  slider('白玉カット (大セル消音)', 'sizeCut', 0.3, 1, 0.01)
  slider('area', 'weights.area', 0, 1, 0.01)
  slider('centroidX', 'weights.centroidX', 0, 1, 0.01)
  slider('centroidY', 'weights.centroidY', 0, 1, 0.01)
  slider('sides', 'weights.sides', 0, 1, 0.01)
  slider('neighbors', 'weights.neighbors', 0, 1, 0.01)

  h('LUNAR 月の時間')
  slider('breath rate (Hz)', 'breathRate', 0.05, 0.2, 0.005)
  slider('breath depth', 'breathDepth', 0, 0.6, 0.01)
  slider('tide rate (Hz)', 'tideRate', 0.01, 0.2, 0.005)
  slider('lunar phase', 'lunarPhase', 0, 1, 0.01)
  slider('spiral rate', 'spiralRate', 1, 14, 0.5)
  select('spiral dir', 'spiralDir', ['out', 'in'])

  h('SYNTH 層')
  toggleBtn('MACRO', 'layers.macro'); toggleBtn('MID', 'layers.mid'); toggleBtn('MICRO', 'layers.micro')
  select('MACRO voice', 'voiceMacro', VOICE_OPTIONS.macro)
  select('MID voice', 'voiceMid', VOICE_OPTIONS.mid)
  select('MICRO voice', 'voiceMicro', VOICE_OPTIONS.micro)
  slider('attack (s)', 'attack', 0.2, 4, 0.1)
  slider('release (s)', 'release', 0.5, 7, 0.1)

  h('TIMBRE もつれ')
  slider('detune (散らし)', 'detune', 0, 1, 0.01)
  slider('shimmer (ゆらぎ)', 'shimmer', 0, 1, 0.01)
  slider('brightness (倍音)', 'brightness', 0, 1, 0.01)
  slider('texture (粒子/息)', 'texture', 0, 1, 0.01)

  h('SCALE / TEMPO')
  select('scale', 'scale', ['just', 'overtone', 'pentatonic', 'pelog', 'japanese', 'micro'])
  slider('root (Hz)', 'root', 110, 330, 1, v => v | 0)
  slider('tempo (BPM)', 'tempo', 50, 72, 1, v => v | 0)

  h('FX')
  slider('reverb wet', 'reverbWet', 0, 0.9, 0.01)
  slider('delay wet', 'delayWet', 0, 0.6, 0.01)
  slider('delay feed', 'delayFeed', 0, 0.7, 0.01)
  slider('master', 'masterGain', 0, 1, 0.01)

  h('MIDI OUT')
  toggleBtn('enable', 'midiEnabled')
  const midiSel = select('output', '__midi', [{ v: '', t: '— none —' }])
  midiSel.dataset.role = 'midi'
  midiSel.onchange = () => handlers.onMidiSelect && handlers.onMidiSelect(midiSel.value)
  slider('channel', 'midiChannel', 1, 16, 1, v => v | 0)

  return {
    setMidiOutputs(list) {
      midiSel.innerHTML = ''
      const none = document.createElement('option'); none.value = ''; none.textContent = '— none —'
      midiSel.appendChild(none)
      for (const o of list) {
        const op = document.createElement('option'); op.value = o.id; op.textContent = o.name
        midiSel.appendChild(op)
      }
    },
    playBtn,
  }
}

function get(path) {
  if (path.startsWith('__')) return ''
  const keys = path.split('.')
  let o = state
  for (const k of keys) o = o[k]
  return o
}
