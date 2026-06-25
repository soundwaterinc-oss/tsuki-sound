# 月 — TSUKI / 植物細胞・月楽器 Sound Engine

EL-SYSTEMA 系・第3号機。笊目（撥弦）・SAYA（撥音）に対する **TSUKI（持続・呼吸・潮汐）**。
幾何＝**植物細胞のフィロタキシ組織**、音色＝**正弦合唱・グラニュラー・グラス（持続）**。
満ち引きで鳴る、響庭（Resonant Garden）の中核実装に向けた一歩。

## 設計の核

| 軸 | TSUKI |
|---|---|
| 幾何 | Voronoi細胞（parenchyma / phyllotaxis / epidermis）＋ Lloyd緩和 |
| 単位 | 面（細胞）と隣接グラフ |
| 音色 | 正弦合唱・グラニュラー・グラスハーモニカ（持続） |
| 時間 | 呼吸 breath LFO・潮汐 tide envelope・螺旋 spiral scan |
| 和 | 純正律・倍音列・隣接和音（chord field） |

「満ち引きで鳴る」— 全声部を貫く超低域 **breath LFO（0.05–0.2Hz）** が振幅・カットオフを揺らし、
**黄金角フィロタキシス（137.5°）** が螺旋順序＝月・成長・潮汐の主題を一貫させる。

## 起動

```bash
npm install
npm run dev      # http://localhost:5173 を自動で開く
npm run build    # dist/ を生成（Cloudflare Pages: tsuki-sound.pages.dev 想定）
```

画面（月）をタップ → 右パネルの **▶ BREATHE** で発音開始。

## 信号の流れ

```
geometry(tissue) → features(0..1) → mapping(weights) → scheduler(spiral/tide)
  → voices(MACRO/MID/MICRO) → FX(大Reverb/Delay/soft sat) → limiter → out
breath LFO ─→ masterGain & LPF（全層を満ち引き）
```

## パネル

- **SOURCE** — tissue mode / N / relax k / anisotropy / seed（↻で組織再生成）
- **MAPPING WEIGHTS** — area / centroidX / centroidY / sides / neighbors
- **LUNAR** — breath rate・depth / tide rate / lunar phase / spiral rate・dir
- **SYNTH** — MACRO/MID/MICRO 各層の音色を任意選択・ADSR
- **TIMBRE もつれ** — detune（散らし）/ shimmer（ゆらぎ）/ brightness（倍音）/ texture（粒子・息：ノイズ⇄サイン）
- **白玉カット** — 大セル（白玉）を鳴らさない面積しきい値（MAPPINGセクション）
- **EVOLVE** — 反復を避け複雑に変わり続ける度合い（ピッチドリフト/隣接ウォーク/潮汐進行）
- **PRESET 設定保存** — 名前付きで保存／読込／削除。最後の設定は自動復元（localStorage）
- **SCALE / TEMPO** — 純正律・倍音列・ペンタ・ペロッグ・都節・微分音 / root / 56–66BPM
- **FX** — reverb・delay・master
- **MIDI OUT** — 出力選択・channel（breath→CC1/CC11、和音→複数noteon）

## 構成

```
src/
  main.js              起動・配線
  state.js             共有状態 + subscribe
  audio/
    engine.js          AudioContext / FX / 合成IR reverb / pingpong delay
    scheduler.js       ルックアヘッド（25ms/0.12s）・潮汐ゲート
    breath.js          呼吸LFO（全層変調）
    tide.js            潮汐密度・lunarPhase
    spiral.js          螺旋/距離帯スキャン順
    scales.js          純正律・倍音列・量子化・和音
    midi.js            Web MIDI 出力
    voices/
      sines.js         weave(もつれサイン) / choir / pad / glass / drone / bowed / dew / bloom
      organic.js       particle(粒子) / airtone(ノイズ⇄サイン中間) / organ / reed
      granular.js      サイングレイン雲
      _env.js          raised-cosine なめらかエンベロープ
  geometry/
    tissue.js          Voronoi組織（3モード）
    lloyd.js           重心ロイド緩和 + seed PRNG
    phyllotaxis.js     黄金角配置
    features.js        細胞特徴ベクトル化
    mapping.js         重み → ノート/和音野
  ui/
    canvas.js          細胞描画・発火減衰
    controls.js        パネル
    theme.js           藍×銀×淡緑
```

## 拡張余地

生体センサ（植物の表面電位）で breath/tide を実植物に同調、空間音響（細胞↔スピーカ）、
黄金角の身体音響、3機統合（笊目・SAYA・TSUKI）を `el-systema-core` で。
