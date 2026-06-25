// 層 → 声部ルーティング。各層(MACRO/MID/MICRO)で音色を任意に選べる。
import { granularVoice } from './granular.js'
import {
  weaveVoice, choirVoice, padVoice, glassVoice, droneVoice, bowedVoice,
  dewVoice, bloomVoice,
} from './sines.js'
import {
  particleVoice, airtoneVoice, organVoice, reedVoice,
} from './organic.js'

// 名前 → 関数。UIの選択肢と一致させる。
export const VOICES = {
  weave: weaveVoice,
  granular: granularVoice,
  particle: particleVoice,
  airtone: airtoneVoice,
  organ: organVoice,
  reed: reedVoice,
  choir: choirVoice,
  pad: padVoice,
  glass: glassVoice,
  drone: droneVoice,
  bowed: bowedVoice,
  dew: dewVoice,
  bloom: bloomVoice,
}

// 各層で選べる声部(UI用)
export const VOICE_OPTIONS = {
  macro: ['weave', 'granular', 'particle', 'airtone', 'organ', 'choir', 'glass', 'drone'],
  mid:   ['pad', 'weave', 'organ', 'reed', 'airtone', 'bowed', 'glass', 'choir'],
  micro: ['dew', 'bloom', 'particle', 'weave'],
}

export function triggerVoice(engine, st, m, t0) {
  const base = {
    freq: m.freq, dur: m.dur, amp: m.amp, pan: m.pan,
    partials: m.partials, spread: m.spread, reverbSend: m.reverbSend,
    attack: st.attack, release: st.release, t0,
    // グローバル音色シェイプ
    detune: st.detune, shimmer: st.shimmer, bright: st.brightness, texture: st.texture,
  }

  if (m.layer === 'macro' && st.layers.macro) {
    play(engine, st.voiceMacro, base)
    // 和音野: 隣接ハモを weave で薄く絡める
    for (const cf of m.chord) {
      (VOICES.weave)(engine, { ...base, freq: cf, amp: base.amp * 0.35 })
    }
  } else if (m.layer === 'mid' && st.layers.mid) {
    play(engine, st.voiceMid, base)
  } else if (m.layer === 'micro' && st.layers.micro) {
    play(engine, st.voiceMicro, base)
  }
}

function play(engine, name, base) {
  const fn = VOICES[name] || VOICES.weave
  fn(engine, base)
}
