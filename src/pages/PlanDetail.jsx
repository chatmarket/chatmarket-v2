import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Video, Radio, PhoneCall, Play, Heart, Phone, ExternalLink } from "lucide-react";

const PAYMENT_LINKS = {
  basic: "https://buy.stripe.com/placeholder_basic",
  "call-anser": "https://buy.stripe.com/placeholder_call_anser",
  vod: "https://buy.stripe.com/placeholder_vod",
  ppv: "https://buy.stripe.com/placeholder_ppv",
  crowdfunding: null, // 審査フローのため決済リンクなし
};

const plans = {
  free: {
    icon: Play,
    name: "FREEプラン",
    price: "¥0",
    period: "/月",
    revenueShare: "70%",
    color: "from-gray-500/20 to-gray-600/10 border-gray-500/30",
    iconColor: "text-gray-300",
    badge: "無料スタート",
    badgeColor: "bg-gray-500/20 text-gray-300",
    description: "まずは無料でChatMarketを始めましょう。基本機能をすべて無料でご利用いただけます。",
    features: [
      { title: "無料で今すぐ始められる", desc: "クレジットカード不要。登録後すぐに使えます。" },
      { title: "1対1の有料ビデオ通話機能", desc: "視聴者と1対1のビデオ通話が可能。料金は自由設定。" },
      { title: "視聴者からエールコイン受取", desc: "応援コインを視聴者から受け取れます。" },
      { title: "チャンネルページ作成", desc: "あなた専用のチャンネルページを作成できます。" },
    ],
    cta: "無料で始める",
    ctaAction: "free",
    bankNote: true,
  },
  basic: {
    icon: PhoneCall,
    name: "BASICプラン",
    price: "¥3,300",
    period: "/月",
    revenueShare: "85%",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-400",
    badge: "1対1ビデオ通話",
    badgeColor: "bg-blue-500/20 text-blue-300",
    description: "1対1の有料ビデオ通話 or 1対多ライブ配信で収益化。プログレッシブ・インセンティブで売上が伸びるほど還元率もアップ！",
    features: [
      { title: "1対1 有料ビデオ通話（配信者が料金設定）", desc: "配信者が30分・60分それぞれの通話料金を設定。申込者（視聴者）がスケジュールを見て申し込み、料金を支払います。無料通話枠はありません。" },
      { title: "スケジュール制・事前申し込み", desc: "配信者が設定した通話可能スケジュールを参考に、申込者が希望日時を選んでリクエストを送ります。" },
      { title: "通話料金は配信者が自由設定（30分・60分）", desc: "設定した料金がそのまま申込価格になります。プラットフォーム手数料10%が差し引かれた額が収益となります。" },
      { title: "1対多 ライブ配信との併用可", desc: "配信開始時に「ライブ配信」か「ビデオ通話」かを選択できます。用途に合わせて使い分け可能。" },
      { title: "アーカイブ保存・有料公開（¥1〜）", desc: "配信・通話終了後に録画を保存し、非公開記録または¥1〜の有料動画として販売できます。" },
      { title: "プログレッシブ・インセンティブに自動参加", desc: "月間売上に応じて還元率が85%〜95%まで自動で上昇します。" },
      { title: "視聴者からエールコイン受取", desc: "応援コインを視聴者から受け取れます。" },
    ],
    cta: "配信・通話を開始する",
    ctaAction: "basic",
    bankNote: true,
  },
  "call-anser": {
    icon: Phone,
    name: "CALL＆ANSERプラン",
    price: "¥6,600",
    period: "/月",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    iconColor: "text-cyan-400",
    badge: "双方向有料通話",
    badgeColor: "bg-cyan-500/20 text-cyan-300",
    description: "双方向の有料通話プラットフォーム。有料インタビュー・推し活・求人面接など、使い方はあなた次第！",
    features: [
      { title: "1対1 双方向有料通話", desc: "発信・受信どちらからも課金設定が可能な双方向通話。" },
      { title: "30分×4回/日 無料通話枠（架電時）", desc: "自分から発信する場合、毎日30分×4回分の無料通話枠が付きます。無料枠を超えると有料になります。" },
      { title: "相手の希望額を支払って発信することも可能", desc: "相手が設定した通話希望額を支払い、こちらから発信することもできます。双方向の有料通話に対応。" },
      { title: "有料インタビュー・コンテンツ制作", desc: "「有料でインタビューさせてください」など、コンテンツ制作に活用できます。" },
      { title: "推し活・ファンとの有料交流", desc: "推しとの特別な時間を有料で提供・体験。双方向課金に対応。" },
      { title: "求人面接・ビジネス活用", desc: "オンライン面接や商談など、ビジネス用途にも最適。" },
      { title: "エールコイン受け取り機能", desc: "通話中に相手からエールコインを受け取れます。" },
    ],
    cta: "このプランで登録する",
    ctaAction: "call-anser",
    bankNote: true,
  },
  vod: {
    icon: Video,
    name: "VODプラン",
    price: "¥9,900",
    period: "/月",
    revenueShare: "85%",
    color: "from-primary/20 to-primary/10 border-primary/40",
    iconColor: "text-primary",
    badge: "動画販売",
    badgeColor: "bg-primary/20 text-primary",
    popular: true,
    description: "制作した動画を販売して収益化。アーカイブ販売も可能なVODプラン。BASICプランとの組み合わせでご利用いただけます。",
    features: [
      { title: "制作動画の販売機能", desc: "作成した動画を1本単位で販売できます。" },
      { title: "動画1本 ¥1〜（自由設定）", desc: "価格は¥1から自由に設定可能。" },
      { title: "生配信アーカイブ販売機能", desc: "ライブ配信のアーカイブを後から販売できます。" },
      { title: "動画アップロード時間制限", desc: "1日あたり合計120分までアップロード可能です。" },
      { title: "視聴者からエールコイン受取", desc: "応援コインを視聴者から受け取れます。" },
      { title: "チャンネルページ作成", desc: "あなた専用のチャンネルページを作成できます。" },
    ],
    cta: "このプランで登録する",
    ctaAction: "vod",
    bankNote: true,
  },
  ppv: {
    icon: Radio,
    name: "PPVプラン",
    price: "¥9,900",
    period: "/月",
    revenueShare: "85%",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    iconColor: "text-red-400",
    badge: "有料ライブ配信",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "1対多数の有料ライブ配信でファンから直接収益化。PPV（ペイパービュー）形式で配信できます。BASICプランとの組み合わせでご利用いただけます。",
    features: [
      { title: "1対多数の有料ライブ配信", desc: "大勢のファンに向けたPPVライブ配信が可能。" },
      { title: "配信料金：1配信 ¥1から（自由設定）", desc: "チケット料金は¥1から自由に設定できます。" },
      { title: "配信時間設定", desc: "1配信あたり最大120分までの時間設定が可能。" },
      { title: "視聴者からエールコイン受取", desc: "配信中にエールコインを受け取れます。" },
      { title: "チャンネルページ作成", desc: "あなた専用のチャンネルページを作成できます。" },
      { title: "ライブ配信アーカイブ", desc: "配信終了後もアーカイブとして保存・再生できます。" },
    ],
    cta: "このプランで登録する",
    ctaAction: "ppv",
    bankNote: true,
  },
  crowdfunding: {
    icon: Heart,
    name: "BASIC＋クラウドファンディングプラン",
    price: "¥12,000",
    period: "/月",
    revenueShare: "90%",
    specialBadge: true,
    comingSoon: true,
    color: "from-red-500/20 to-pink-600/10 border-red-400/40",
    iconColor: "text-red-400",
    badge: "クラウドファンディング",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "NPO・政治政党向けのクラウドファンディングプラン。厳正な審査・電話確認のうえ開設できます。",
    features: [
      { title: "BASICプランの全機能込み", desc: "BASICプランのすべての機能が含まれます。" },
      { title: "NPO・政治政党向けクラウドファンディング", desc: "法人格のあるNPOおよび政治政党が対象です。" },
      { title: "プロジェクトページ作成・公開", desc: "専用のプロジェクトページを作成し一般公開できます。" },
      { title: "自由金額での寄付受付", desc: "支援者が自由な金額で寄付できます。" },
      { title: "収益還元率90%（プログレッシブ対応）", desc: "月間売上に応じて最大95%まで還元率が上昇します。" },
      { title: "独自審査・電話確認あり", desc: "不正防止のため、審査と電話確認を実施しています。" },
    ],
    cta: "申請・登録する",
    ctaAction: "crowdfunding",
    bankNote: true,
  },
};

export default function PlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = plans[planId];

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center text-muted-foreground">
        <p>プランが見つかりませんでした。</p>
        <Button onClick={() => navigate("/")} className="mt-4">ホームへ戻る</Button>
      </div>
    );
  }

  const Icon = plan.icon;
  const paymentUrl = PAYMENT_LINKS[planId];

  const handleRegister = () => {
    if (planId === "free") { navigate("/go-live"); return; }
    if (planId === "basic") { navigate("/go-live"); return; }
    if (planId === "crowdfunding") { navigate("/crowdfunding/new"); return; }
    if (paymentUrl) { window.open(paymentUrl, "_blank"); return; }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> 戻る
      </button>

      {/* Header */}
      <div className={`rounded-2xl bg-gradient-to-br border p-6 space-y-3 ${plan.color}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
            <Icon className={`w-6 h-6 ${plan.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>{plan.badge}</span>
              {plan.popular && <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">人気</span>}
              {plan.comingSoon && <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">🚧 現在準備中</span>}
            </div>
            <h1 className="text-xl font-black">{plan.name}</h1>
          </div>
        </div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black">{plan.price}</span>
          <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
        </div>
        {plan.revenueShare && (
          <p className="text-sm text-primary font-semibold flex items-center gap-2 flex-wrap">
            収益還元率 {plan.revenueShare}
            {plan.specialBadge && <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">特別還元枠（変更有）</span>}
          </p>
        )}
        <p className="text-sm text-foreground/70">{plan.description}</p>
      </div>

      {/* Features */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">機能一覧</h2>
        <ul className="space-y-4">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bank note */}
      <div className="bg-secondary/60 border border-border/50 rounded-xl px-4 py-3 text-xs text-muted-foreground">
        ※ 収益の銀行振込手数料は実費でご負担いただきます。
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Button
          onClick={handleRegister}
          disabled={plan.comingSoon && planId !== "crowdfunding"}
          className={`w-full h-12 text-base font-bold gap-2 ${plan.popular ? "bg-primary hover:bg-primary/90" : ""}`}
        >
          {paymentUrl && planId !== "free" && planId !== "crowdfunding" && <ExternalLink className="w-4 h-4" />}
          {plan.cta}
        </Button>
        {plan.comingSoon && planId !== "crowdfunding" && (
          <p className="text-center text-xs text-orange-400">このプランは現在準備中です。近日公開予定です。</p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          ご不明な点はお気軽にお問い合わせください。
        </p>
      </div>
    </div>
  );
}