// Web MIDI 出力 — 笊目踏襲。breath を CC1/CC11 に、和音野を複数noteonで送る。
export function createMidi(st) {
  let output = null
  let access = null

  async function init() {
    if (!navigator.requestMIDIAccess) return []
    access = await navigator.requestMIDIAccess()
    return [...access.outputs.values()]
  }
  function selectOutput(id) {
    if (!access) return
    output = [...access.outputs.values()].find(o => o.id === id) || null
  }
  function freqToNote(f) {
    return Math.round(69 + 12 * Math.log2(f / 440))
  }
  function noteOn(freq, vel = 80, durMs = 1000) {
    if (!st.midiEnabled || !output) return
    const note = Math.max(0, Math.min(127, freqToNote(freq)))
    const ch = (st.midiChannel - 1) & 0x0f
    output.send([0x90 | ch, note, vel])
    output.send([0x80 | ch, note, 0], performance.now() + durMs)
  }
  function breathCC(value01) {
    if (!st.midiEnabled || !output) return
    const ch = (st.midiChannel - 1) & 0x0f
    const v = Math.max(0, Math.min(127, Math.round(value01 * 127)))
    output.send([0xb0 | ch, 1, v])  // CC1 mod
    output.send([0xb0 | ch, 11, v]) // CC11 expression
  }
  return { init, selectOutput, noteOn, breathCC, hasOutput: () => !!output }
}
