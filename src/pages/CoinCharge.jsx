import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Coins, CreditCard, Gift, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Zap, ExternalLink, ShieldCheck } from "lucide-react";

const CHARGE_PLANS = [
  { coins: 100, yen: 110, bonus: 0, popular: false },
  { coins: 500, yen: 550, bonus: 0, popular: false },
  { coins: 1000, yen: 1100, bonus: 0, popular: true },
  { coins: 3000, yen: 3300, bonus: 0, popular: false },
  { coins: 5000, yen: 5500, bonus: 0, popular: false },
  { coins: 10000, yen: 11000, bonus: 0, popular: false },
];

const STEPS_CREDIT = [
  { n: "1", t: "Chat Market にログイン", d: "アカウントをお持ちでない方は無料登録から。" },
  { n: "2", t: "設定 → エールコイン → チャージ", d: '設定ページ内の「エールコインをチャージ」ボタンをタップ。' },
  { n: "3", t: "チャージ金額を選択", d: "100コイン〜10,000コインまで複数のプランからお選びください。" },
  { n: "4", t: "カード情報を入力して完了", d: "Stripe の安全な決済画面でカード情報を入力。即時反映されます。" },
];

const STEPS_GIFT = [
  { n: "1", t: "Visa ギフトカードをAmazonで購入", d: "下のリンクからAmazonにてVisaギフトカードを購入します（クレカ不要・コンビニ払い可）。" },
  { n: "2", t: "ギフトカードを受け取り・有効化", d: "メールまたは封筒でカード番号・CVVを受け取ります。裏面の案内に従って有効化してください。" },
  { n: "3", t: "Chat Market のチャージ画面へ", d: '設定 → エールコイン → チャージ → 「クレジット/デビットカード」を選択。' },
  { n: "4", t: "Visaギフトカードの番号を入力", d: "通常のクレジットカードと同じ入力欄にカード番号・有効期限・CVVを入力して完了。即時反映されます。" },
];

const QA = [
  { q: "チャージしたコインの有効期限は？", a: "エールコインのチャージ日から180日間有効です。期限が近づくとお知らせします。" },
  { q: "返金・払い戻しはできますか？", a: "デジタルコンテンツの性質上、チャージ済みのエールコインの返金はできません。特定商取引法の規定に基づき、ご購入前にご確認ください。" },
  { q: "Visaギフトカードの残高が足りない場合は？", a: "Stripeではカード分割払い（複数カード）には対応していません。残高が充分なギフトカードをご使用いただくか、残高を確認してからチャージ金額を選んでください。" },
  { q: "チャージが反映されません", a: "通常は即時反映されます。5分以上経過しても反映されない場合は、設定ページを再読み込みするか、サポートまでお問い合わせください。" },
  { q: "コインはどんなことに使えますか？", a: "ライブ配信へのスーパーチャット（投げ銭）、1対1ビデオ通話の料金支払い、クリエイターへのギフト送信などにご利用いただけます。" },
];

function QAItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
      >
        <span className="font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />{item.q}
        </span>
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

export default function CoinCharge() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 px-4 py-1.5 rounded-full">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-black text-yellow-300">エールコイン チャージ方法</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">コインをチャージして<br />クリエイターを応援しよう</h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          エールコインはライブ配信への投げ銭・1対1ビデオ通話・ギフト送信に使えます。<br />
          クレジットカードがなくても<span className="text-yellow-400 font-bold">Visaギフトカード</span>でチャージできます。
        </p>
      </div>

      {/* Charge plans */}
      <section className="space-y-4">
        <h2 className="text-lg font-black flex items-center gap-2"><Coins className="w-5 h-5 text-yellow-400" /> チャージプラン一覧</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHARGE_PLANS.map((plan) => (
            <div
              key={plan.coins}
              className={`relative rounded-xl border p-4 text-center space-y-1 ${plan.popular ? "border-yellow-500/60 bg-yellow-500/10" : "border-border/50 bg-card"}`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black bg-yellow-500 text-black px-2.5 py-0.5 rounded-full whitespace-nowrap">人気No.1</span>
              )}
              <p className="text-2xl font-black text-yellow-400">{plan.coins.toLocaleString()}<span className="text-sm font-bold ml-1">コイン</span></p>
              <p className="text-sm font-bold text-white">¥{plan.yen.toLocaleString()}</p>
              {plan.bonus > 0 && (
                <p className="text-xs text-green-400 font-bold">+{plan.bonus}コイン ボーナス</p>
              )}
              <p className="text-[10px] text-muted-foreground">1コイン = 1円（+ 3.6% 手数料）</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">※実際のチャージは設定ページ内の「エールコインをチャージ」から行えます。</p>
      </section>

      {/* Method 1: Credit Card */}
      <section className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-black">方法①　クレジット / デビットカード</h2>
            <p className="text-xs text-muted-foreground">Visa・Mastercard・JCB・American Express 対応</p>
          </div>
        </div>

        <div className="space-y-2">
          {STEPS_CREDIT.map((s) => (
            <div key={s.n} className="flex items-start gap-3 bg-secondary/50 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-black text-blue-400 shrink-0">{s.n}</span>
              <div>
                <p className="text-sm font-bold">{s.t}</p>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          決済はStripe（世界最大級の決済インフラ）で処理されます。カード情報はChat Marketのサーバーには保存されません。
        </div>

        <Link
          to="/settings"
          className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black text-sm px-6 py-3 rounded-xl transition-all w-full"
        >
          <Zap className="w-4 h-4" /> 今すぐチャージする（設定ページへ）
        </Link>
      </section>

      {/* Method 2: Visa Gift Card */}
      <section className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/40 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-black">方法②　Visaギフトカード <span className="text-yellow-400">← クレカ不要！</span></h2>
            <p className="text-xs text-muted-foreground">コンビニ払い・Amazonで購入可能。クレジットカードなしでOK。</p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-200 space-y-1">
          <p className="font-bold">💡 こんな方におすすめ</p>
          <ul className="text-xs text-yellow-100/80 space-y-0.5 list-disc list-inside">
            <li>クレジットカードを持っていない・使いたくない</li>
            <li>使い過ぎを防ぎたい（プリペイド式なので残高以上は使えない）</li>
            <li>家族や友人へギフトとして贈りたい</li>
          </ul>
        </div>

        <div className="space-y-2">
          {STEPS_GIFT.map((s) => (
            <div key={s.n} className="flex items-start gap-3 bg-black/30 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-xs font-black text-yellow-400 shrink-0">{s.n}</span>
              <div>
                <p className="text-sm font-bold">{s.t}</p>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Amazon Gift Card CTA */}
        <a
          href="https://amzn.to/3QnY6Mz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-sm px-5 py-4 rounded-xl transition-all group"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <p className="font-black">AmazonでVisaギフトカードを購入する</p>
              <p className="text-xs font-normal opacity-80">クレジットカード不要・コンビニ払い対応</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>

        <div className="flex items-start gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          Visaギフトカードは通常のクレジットカードと同じ入力欄から使用できます。Stripe経由で安全に処理されます。
        </div>

        <p className="text-[10px] text-muted-foreground text-center">※商品リンクはAmazonアソシエイト（chatmarket-22）を使用しています</p>
      </section>

      {/* Q&A */}
      <section className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" /> よくある質問
        </h2>
        <div className="space-y-2">
          {QA.map((item) => (
            <QAItem key={item.q} item={item} />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="text-center space-y-3 pb-8">
        <p className="text-muted-foreground text-sm">コインをチャージしてお気に入りのクリエイターを応援しよう！</p>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black px-8 py-3 rounded-xl transition-all"
        >
          <Coins className="w-5 h-5" /> エールコインをチャージする
        </Link>
      </div>
    </div>
  );
}