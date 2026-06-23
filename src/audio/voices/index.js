// 層 → 声部ルーティング。MACRO/MID/MICRO で音色を振り分ける。
import { granularVoice } from './granular.js'
import { additiveVoice } from './additive.js'
import { glassVoice } from './glass.js'
import { softBellVoice } from './softbell.js'
import { airVoice } from './air.js'
import { dewVoice, pollenVoice } from './micro.js'

export function triggerVoice(engine, st, m, t0) {
  const base = {
    freq: m.freq, dur: m.dur, amp: m.amp, pan: m.pan,
    partials: m.partials, spread: m.spread, reverbSend: m.reverbSend,
    attack: st.attack, release: st.release, t0,
  }

  if (m.layer === 'macro' && st.layers.macro) {
    const v = st.voiceMacro
    if (v === 'granular') granularVoice(engine, base)
    else if (v === 'glass') glassVoice(engine, base)
    else additiveVoice(engine, base)
    // 和音野: 隣接ハモを additive で薄く重ねる
    for (const cf of m.chord) {
      additiveVoice(engine, { ...base, freq: cf, amp: base.amp * 0.4, partials: 4 })
    }
  } else if (m.layer === 'mid' && st.layers.mid) {
    // 中層: soft bell + 時折 air
    softBellVoice(engine, base)
    if (Math.random() < 0.25) airVoice(engine, { ...base, amp: base.amp * 0.5 })
  } else if (m.layer === 'micro' && st.layers.micro) {
    if (Math.random() < 0.6) dewVoice(engine, base)
    else pollenVoice(engine, base)
  }
}
