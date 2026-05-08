import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Download, ExternalLink, Zap, Star, CheckCircle2, AlertTriangle, Lightbulb, Smartphone } from "lucide-react";

const STEPS = [
  {
    id: "beginner",
    level: "STEP 1",
    title: "入門",
    subtitle: "初めてのOBS配信",
    target: "「とりあえずOBSを使ってみたい」という初心者",
    color: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/40",
    badge: "bg-green-500/20 text-green-300 border-green-500/30",
    bitrate: "推奨ビットレート: 2000kbps",
    guide: [
      { step: "1", text: "OBSをダウンロード・インストール（無料）" },
      { step: "2", text: "Chat Market の「ライブ配信を開始」→ ストリームキーをコピー" },
      { step: "3", text: 'OBS → 設定 → 配信 → サービス「カスタム」を選択' },
      { step: "4", text: "サーバーURLとストリームキーを貼り付けて「OK」" },
    ],
    products: [
      {
        name: "オーディオテクニカ AT2020USB-X コンデンサーマイク",
        desc: "ドライバー不要のUSB接続。PC・Mac・PS5に挿すだけでプロの音質。ショックマウント付きで振動ノイズもカット。",
        url: "https://amzn.to/48fAwrs",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&q=80",
        tag: "🎙️ 最初の投資はマイクから",
      },
      {
        name: "ロジクール Webカメラ C920n フルHD 1080P",
        desc: "オートフォーカス＆ステレオマイク搭載。Zoom・Skype・配信に即使える定番モデル。Amazon.co.jp限定壁紙付き。",
        url: "https://amzn.to/4vHSY66",
        image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=300&q=80",
        tag: "📷 挿すだけで1080p",
      },
    ],
  },
  {
    id: "stepup",
    level: "STEP 2",
    title: "ステップアップ",
    subtitle: "ワンランク上の配信",
    target: "「スマホ配信より綺麗に映りたい」人",
    color: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    bitrate: "推奨ビットレート: 4000kbps",
    guide: [
      { step: "1", text: "リングライトを顔の正面・目線の高さに設置" },
      { step: "2", text: "OBS → 仮想背景プラグイン or カメラのボケ機能でBG処理" },
      { step: "3", text: "音声インターフェースをUSB接続、OBSのオーディオ設定で入力を切替" },
    ],
    products: [
      {
        name: "Elgato Key Light Neo（モニターマウント付き）",
        desc: "Wi-Fiまたは本体ボタンで色温度・輝度を調整。USB給電でケーブルすっきり。顔に均一な光を当てる定番プロライト。",
        url: "https://amzn.to/4tY7Zir",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80",
        tag: "💡 照明だけで映りが3倍変わる",
      },
      {
        name: "YAMAHA AG03MK2 オーディオインターフェース",
        desc: "これ一台でマイク・楽器・BGMを高音質ミックス。ループバック機能でPC音声も配信に乗せられる。「プロの音」への最短ルート。",
        url: "https://amzn.to/4tkKBM7",
        image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=300&q=80",
        tag: "🎚️ これがあればプロの音",
      },
    ],
  },
  {
    id: "advanced",
    level: "STEP 3",
    title: "本格派",
    subtitle: "ゲーム実況・一人称配信",
    target: "画面構成にこだわりたい、本格ライバー",
    color: "from-purple-500/20 to-violet-500/10",
    border: "border-purple-500/40",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    bitrate: "推奨ビットレート: 6000kbps",
    guide: [
      { step: "1", text: "OBSでシーンを複数作成（ゲーム画面 / 顔アップ / 休憩画面 など）" },
      { step: "2", text: "キャプチャーボードをPCに接続し、OBSで「映像キャプチャデバイス」として追加" },
      { step: "3", text: "Stream Deckに各シーンを割り当て、ボタン一つで演出切り替え" },
    ],
    products: [
      {
        name: "Elgato Stream Deck MK.2",
        desc: "15個のLCDキーにOBSシーン・BGM・エフェクトを登録。ライブ中に手元だけで全演出が完結。プロライバーの必需品。",
        url: "https://amzn.to/4sQkoEn",
        image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&q=80",
        tag: "🎛️ ボタン一つで演出切替",
      },
      {
        name: "Elgato HD60 X キャプチャーボード",
        desc: "Switch・PS5・Xbox を遅延なしにPC取り込み。4K30fps対応。ゲーム実況・一人称配信に完全対応。",
        url: "https://amzn.to/4cG4Eh6",
        image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&q=80",
        tag: "🎮 Switch/PS5を高画質で",
      },
    ],
  },
  {
    id: "pro",
    level: "STEP 4",
    title: "プロ・法人",
    subtitle: "イベント・コンサート中継",
    target: "失敗が許されない現場、プロの制作会社",
    color: "from-orange-500/20 to-red-500/10",
    border: "border-orange-500/40",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    bitrate: "推奨ビットレート: 6400kbps〜（上り50Mbps以上推奨）",
    guide: [
      { step: "1", text: "ATEM Mini Proに最大4台のカメラをHDMI接続" },
      { step: "2", text: "スイッチャー側でシーン切替→ USB-C経由でPCに映像を入力" },
      { step: "3", text: "OBSのRTMP設定でChat MarketのカスタムサーバーURLを使用" },
      { step: "4", text: "外部ミキサーをATEM Miniの音声入力に接続して高音質収録" },
    ],
    products: [
      {
        name: "Blackmagic Design ATEM Mini Pro",
        desc: "カメラ4台をリアルタイム切替。内蔵スイッチャーで映像・音声・クロマキーをUSB1本でPCに送信。イベント・コンサート配信の業界標準。",
        url: "https://amzn.to/4u1KqW5",
        image: "https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=300&q=80",
        tag: "📡 カメラ4台切り替え対応",
      },
      {
        name: "Sony ZV-E10 ミラーレス一眼",
        desc: "配信特化設計のAPS-Cセンサー搭載ミラーレス。クリーンHDMI出力でキャプチャーボード経由で使用可。ボケ・暗所に強い映像が武器。",
        url: "https://amzn.to/4tiWulK",
        image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&q=80",
        tag: "📸 配信特化のミラーレス一眼",
      },
    ],
  },
];

const QA = [
  {
    q: "PCのスペックは足りていますか？",
    a: "入門〜ステップアップなら CPU: Core i5 第10世代以上、RAM: 16GB以上が目安です。本格派・プロはCore i7/i9・32GB推奨。GPU（グラフィックボード）があるとエンコードが安定します。",
  },
  {
    q: "回線速度が心配です。どれくらい必要？",
    a: "上り（アップロード）速度が最重要です。入門（2000kbps）= 上り5Mbps以上、ステップアップ（4000kbps）= 10Mbps以上、本格・プロ（6400kbps）= 20Mbps以上を推奨します。speedtest.netで事前確認を！",
  },
  {
    q: "OBSはどこからダウンロードできますか？",
    a: "公式サイト obsproject.com から無料でダウンロードできます。Windows・Mac・Linux対応。インストール後すぐに使えます。",
  },
  {
    q: "Chat Marketのストリームキーはどこにありますか？",
    a: "Chat Market にログイン → 「ライブ配信を開始」→ OBSガイドのステップ3に表示されるIngest EndpointとStream Keyをコピーして使用してください。",
  },
  {
    q: "配信が途切れてしまいます。どうすればいいですか？",
    a: "①回線を有線LANに変更、②OBSの設定→出力→ビットレートを下げる、③エンコーダーをx264からNVENC（NVIDIA製GPU）に変更、の順で試してください。",
  },
];

function StepSection({ step }) {
  return (
    <section className={`rounded-2xl border ${step.border} bg-gradient-to-br ${step.color} p-6 md:p-8 space-y-6`}>
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <span className={`text-xs font-black px-3 py-1 rounded-full border ${step.badge}`}>{step.level}</span>
          <h2 className="text-2xl font-black text-white mt-2">{step.title} <span className="text-muted-foreground font-medium text-lg">— {step.subtitle}</span></h2>
          <p className="text-sm text-muted-foreground mt-1">👤 対象: {step.target}</p>
          <p className="text-xs font-bold text-primary mt-1">📊 {step.bitrate}</p>
        </div>
      </div>

      {/* Guide steps */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">設定ガイド</p>
        <div className="space-y-2">
          {step.guide.map((g) => (
            <div key={g.step} className="flex items-start gap-3 bg-black/30 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-black text-primary shrink-0">{g.step}</span>
              <p className="text-sm text-foreground/90">{g.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">おすすめ機材</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {step.products.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-primary/40 rounded-xl p-4 transition-all group"
            >
              <img src={p.image} alt={p.name} className="w-20 h-20 rounded-lg object-cover shrink-0 bg-secondary" />
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">{p.tag}</span>
                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-2">{p.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                <div className="flex items-center gap-1 text-primary text-xs font-bold">
                  <ExternalLink className="w-3 h-3" /> Amazonで見る
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function QAItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
      >
        <span className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />{item.q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function ObsGuide() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <span className="text-xs font-black bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full">OBS配信ガイド</span>
        <h1 className="text-3xl md:text-4xl font-black text-white">Chat Market で配信プロになろう</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">初心者から法人レベルまで、4ステップで機材・設定をすべて解説。あなたのレベルに合ったセクションを選んでください。</p>

        {/* OBS Download CTA */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-card border border-primary/30 rounded-2xl px-6 py-4">
          <div className="text-left">
            <p className="font-bold text-sm text-white">まずはOBSをダウンロード（完全無料）</p>
            <p className="text-xs text-muted-foreground">Windows / Mac / Linux 対応</p>
          </div>
          <a
            href="https://obsproject.com/ja/download"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm px-5 py-2.5 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" /> OBS公式サイトへ
          </a>
        </div>
      </div>

      {/* Stream Key Setup */}
      <section className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-black flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Chat Market ストリームキーの設定方法</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { n: "①", t: "Chat Market にログイン", d: '「ライブ配信を開始」ボタンをタップ' },
            { n: "②", t: "OBS情報を取得", d: "ページ内の「OBS配信情報」セクションからIngest Endpoint と Stream Key をコピー" },
            { n: "③", t: "OBSに貼り付け", d: '設定 → 配信 → サービス「カスタム」→ サーバーURLとストリームキーを貼り付け → OK' },
          ].map((item) => (
            <div key={item.n} className="bg-secondary/50 rounded-xl p-4 space-y-1.5">
              <span className="text-2xl font-black text-primary">{item.n}</span>
              <p className="font-bold text-sm">{item.t}</p>
              <p className="text-xs text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-primary">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ストリームキーは他人に見せないでください。チャンネルへの不正配信を防ぐためのパスワードです。
        </div>
      </section>

      {/* Steps */}
      <div className="space-y-8">
        {STEPS.map((step) => (
          <StepSection key={step.id} step={step} />
        ))}
      </div>

      {/* Tip from team */}
      <section className="bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/30 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-black text-white mb-1">💬 運営からのワンポイントアドバイス</p>
          <p className="text-sm text-foreground/80">「まずはマイクから投資するのがおすすめです。音がいいだけでプロっぽさが出ますよ！カメラの画質より、声の品質が視聴継続率に直結します。AT2020USB-X 一本で、配信の印象が劇的に変わります。」</p>
          <p className="text-xs text-muted-foreground mt-1">— Chat Market 運営チーム</p>
        </div>
      </section>

      {/* Q&A */}
      <section className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> よくある質問（配信前の不安を解消）</h2>
        <div className="space-y-2">
          {QA.map((item) => (
            <QAItem key={item.q} item={item} />
          ))}
        </div>
      </section>

      {/* ── スマホ配信（Prism Live Studio）セクション ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-black text-white">スマホで配信する — Prism Live Studio</h2>
        </div>
        <p className="text-sm text-muted-foreground">iPhone / Android どちらでも使える無料の配信アプリ。フィルター・テキスト・バーチャル背景など豊富なエフェクトが使えます。</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* iOS */}
          <a href="https://apps.apple.com/jp/app/prism-live-studio/id1319056339" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black/40 border border-white/10 hover:border-primary/40 rounded-xl p-4 transition-all">
            <span className="text-3xl">🍎</span>
            <div>
              <p className="font-bold text-sm text-white">App Store でダウンロード</p>
              <p className="text-xs text-muted-foreground">iPhone / iPad 対応</p>
            </div>
          </a>
          {/* Android */}
          <a href="https://play.google.com/store/apps/details?id=com.NCSSoft.PrismLive" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black/40 border border-white/10 hover:border-primary/40 rounded-xl p-4 transition-all">
            <span className="text-3xl">🤖</span>
            <div>
              <p className="font-bold text-sm text-white">Google Play でダウンロード</p>
              <p className="text-xs text-muted-foreground">Android 対応</p>
            </div>
          </a>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prism Live Studio 設定手順</p>
          {[
            { n: "①", t: "Chat Market でキーを取得", d: "「ライブ配信を開始」→「配信スタート」を押してサーバーURL・ストリームキーをコピー" },
            { n: "②", t: "Prism を開き「Live」を選択", d: "アプリ起動 → 「Live」→「Custom RTMPS」を選択" },
            { n: "③", t: "URL を貼り付けて配信開始", d: "コピーした完全RTMPS URL を貼り付け → 「Start Live」をタップ" },
          ].map(item => (
            <div key={item.n} className="flex items-start gap-3 bg-secondary/40 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xs font-black text-purple-300 shrink-0">{item.n}</span>
              <div>
                <p className="text-sm font-bold text-white">{item.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-xs text-orange-300">
          ⚠️ 有料生配信はOBS / Prism などの配信専用アプリ経由が必須です。ブラウザ直接配信（WebRTC）は無料視聴のみ対応です。
        </div>
      </section>

      {/* Footer CTA */}
      <div className="text-center space-y-3 pb-8">
        <p className="text-muted-foreground text-sm">準備ができたら、Chat Market でライブ配信を始めよう！</p>
        <Link
          to="/go-live"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 py-3 rounded-xl transition-all"
        >
          <Zap className="w-5 h-5" /> 今すぐライブ配信を開始
        </Link>
        <p className="text-[10px] text-muted-foreground">※商品リンクはAmazonアソシエイト（chatmarket-22）を使用しています</p>
      </div>
    </div>
  );
}