import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Video, Radio, PhoneCall, Play, Heart, Phone, ExternalLink, ShoppingCart, X, GraduationCap, Building2, ChevronDown, Ticket, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// 単体プランの定義
const PLANS = [
  {
    id: "free",
    icon: Play,
    name: "FREEプラン",
    price: 0,
    period: "/月",
    revenueShare: "70%",
    color: "from-gray-500/20 to-gray-600/10 border-gray-500/30",
    iconColor: "text-gray-300",
    badge: "無料スタート",
    badgeColor: "bg-gray-500/20 text-gray-300",
    description: "クレジットカード不要。基本機能をすべて無料でご利用いただけます。",
    features: ["無料で今すぐ始められる", "1対1の有料ビデオ通話機能", "視聴者からエールコイン受取", "チャンネルページ作成"],
    exclusive: true, // 他と組み合わせ不可（選ぶと他が外れる）
  },
  {
    id: "basic",
    icon: PhoneCall,
    name: "BASICプラン",
    price: 3300,
    period: "/月",
    revenueShare: "85%",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-400",
    badge: "1対1ビデオ通話",
    badgeColor: "bg-blue-500/20 text-blue-300",
    description: "Amazon Chime SDK採用。1対1の有料ビデオ通話で収益化。プログレッシブ・インセンティブで最大95%還元。",
    features: ["Amazon Chime SDK による超低遅延ビデオ通話", "1対1 有料ビデオ通話（配信者が料金設定・申込者が支払い）", "スケジュール制・事前申し込み方式", "無料通話枠なし・有料通話のみ", "プログレッシブ・インセンティブに自動参加（月間売上で還元率最大95%）", "視聴者からエールコイン受取"],
  },
  {
    id: "call-anser",
    icon: Phone,
    name: "CALL＆ANSERプラン",
    price: 6600,
    period: "/月",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    iconColor: "text-cyan-400",
    badge: "双方向有料通話",
    badgeColor: "bg-cyan-500/20 text-cyan-300",
    description: "相手にお支払いしてお話が出来る。BASICプランとの組み合わせでご利用いただけます。",
    features: [
      "相手にお支払いしてお話が出来る機能",
      "毎日午前0時にリセット：1日累計60分の無料通話枠（10分単位チケット）",
      "60分を超えた後は自動的にエールコイン従量課金へ移行",
      "通話料金設定：15分150円〜上限なし（配信者が自由に設定）",
      "相手の希望額を支払って発信することも可能",
      "有料インタビュー・推し活・求人面接など"
    ],
  },
  {
    id: "vod",
    icon: Video,
    name: "VODプラン",
    price: 9900,
    period: "/月",
    revenueShare: "85%",
    color: "from-primary/20 to-primary/10 border-primary/40",
    iconColor: "text-primary",
    badge: "動画販売",
    badgeColor: "bg-primary/20 text-primary",
    popular: true,
    description: "制作した動画を販売して収益化。アーカイブは720p（HD）で配信。BASICプランとの組み合わせでご利用いただけます。",
    features: [
      "制作動画の販売機能",
      "動画１時間以内、1動画150円〜（最低15分15円から設定可能）",
      "生配信アーカイブ販売機能",
      "アーカイブ配信画質：720p (HD)",
      "1日の合計視聴時間：最大60分まで",
      "視聴者からエールコイン受取"
    ],
  },
  {
    id: "ppv",
    icon: Radio,
    name: "PPVプラン",
    price: 9900,
    period: "/月",
    revenueShare: "85%",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    iconColor: "text-red-400",
    badge: "有料ライブ配信",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "1対多数の有料ライブ配信でファンから直接収益化。最低15分15円から。BASICプランとの組み合わせでご利用いただけます。",
    features: [
      "1対多数の有料ライブ配信",
      "配信料金：最低15分15円〜（自由設定、将来的に最低設定金額を低く設定できるようにしていきます）",
      "視聴者からエールコイン受取",
      "ライブ配信アーカイブ配信画質：720p (HD)",
      "1日の合計視聴時間：最大60分まで"
    ],
  },
  {
    id: "mini-school",
    icon: GraduationCap,
    name: "ミニスクールプラン",
    price: 0,
    priceDisplay: "¥？",
    period: "/月",
    revenueShare: "？%",
    comingSoon: true,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    iconColor: "text-violet-400",
    badge: "1対最大9人スクール",
    badgeColor: "bg-violet-500/20 text-violet-300",
    description: "最大9名の少人数ミニスクールを開設。チケット制で1回単位の収益化。生徒は無料プランでもアクセス可能。",
    features: [
      "1対最大9人の少人数授業（生徒氏名がリアルタイム表示）",
      "チケット制（1回単位・自由料金設定）",
      "生徒側は無料プランでもアクセス可能",
      "収益還元率90%",
      "月の授業回数・時間・料金は配信者が自由設定",
    ],
    exclusive: true,
  },
  {
    id: "enterprise",
    icon: Building2,
    name: "エンタープライズプラン",
    price: 0,
    priceDisplay: "¥？",
    period: "/月",
    revenueShare: "？%",
    comingSoon: true,
    color: "from-violet-600/20 to-indigo-600/10 border-violet-500/40",
    iconColor: "text-violet-400",
    badge: "法人・大規模運用",
    badgeColor: "bg-violet-500/20 text-violet-300",
    description: "親チャンネル1つ＋最大100サブチャンネル。各アカウントに個別ID/パスを発行。法人・スクール・代理店向け。",
    features: [
      "親チャンネル1つ＋サブチャンネル最大100個",
      "各サブチャンネルに個別ログインID・パスワードを発行",
      "サブチャンネルの有効化・無効化を親が一括管理",
      "BASICプランの全機能込み（1対1通話・エールコイン等）",
      "収益還元率90%",
      "法人・スクール・フランチャイズ・代理店向け",
    ],
    exclusive: true,
  },
  {
    id: "digital-ticket",
    icon: Ticket,
    name: "デジタルチケットプラン",
    comingSoon: true,
    price: 0,
    priceDisplay: "¥？",
    period: "/月",
    revenueShare: "？%",
    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    iconColor: "text-orange-400",
    badge: "リアルイベント入場管理",
    badgeColor: "bg-orange-500/20 text-orange-300",
    description: "コンサート・講演会・料理教室など最大500名のリアルイベント向け。転売防止QRコードで入場管理。iPadで読み込むだけ。",
    features: [
      "最大500名規模のリアルイベント対応（当面の間）",
      "転売防止動的QRコード（30秒ごとに自動更新）",
      "iPadなどのカメラでQRをスキャンするだけで入場処理",
      "チケット種別ごとの販売枚数・残り枠をリアルタイム管理",
      "コンサート・講演会・料理教室・展示会など",
      "収益還元率85%（将来的に規模拡大予定）",
    ],
  },
  {
    id: "crowdfunding",
    icon: Heart,
    name: "BASIC＋クラウドファンディングプラン",
    price: 0,
    priceDisplay: "¥？",
    period: "/月",
    revenueShare: "？%",
    specialBadge: true,
    comingSoon: true,
    color: "from-red-500/20 to-pink-600/10 border-red-400/40",
    iconColor: "text-red-400",
    badge: "クラウドファンディング",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "NPO・政治政党向けのクラウドファンディングプラン。独自審査・電話確認あり。",
    features: ["BASICプランの全機能込み", "NPO・政治政党向けクラウドファンディング", "プロジェクトページ作成・公開", "収益還元率90%（プログレッシブ対応）"],
    exclusive: true,
  },
  {
    id: "fan-community",
    icon: Users,
    name: "ファンコミュニティ機能",
    price: 0,
    priceDisplay: "¥0",
    period: "/月",
    revenueShare: "—",
    comingSoon: true,
    color: "from-cyan-500/20 to-blue-600/10 border-cyan-500/30",
    iconColor: "text-cyan-400",
    badge: "フォロワー限定コンテンツ",
    badgeColor: "bg-cyan-500/20 text-cyan-300",
    description: "チャネルオーナーがフォロワー限定のニュース・オフショットを共有できる機能。",
    features: [
      "テキスト・画像投稿機能",
      "フォロワー限定の公開設定",
      "いいね・コメント機能",
      "BASICプランに無料で付属",
    ],
  },
  {
    id: "fanclub",
    icon: Heart,
    name: "ファンクラブプラン",
    price: 0,
    priceDisplay: "¥0",
    period: "/月",
    revenueShare: "70%",
    color: "from-pink-500/20 to-rose-600/10 border-pink-500/30",
    iconColor: "text-pink-400",
    badge: "メンバーシップ",
    badgeColor: "bg-pink-500/20 text-pink-300",
    description: "月額課金型のファンクラブを運営。月額を自由に設定できます。専用コンテンツやチャット特典でファンとの結びつきを強化。",
    features: [
      "月額課金型メンバーシップ運営",
      "月額料金は配信者が自由に設定",
      "会員専用のコンテンツ・特典提供",
      "会員限定チャットルーム",
      "会員管理ダッシュボード",
      "収益還元率70%（プログレッシブ対応）",
    ],
  },
];

// 推奨コンボ
const COMBOS = [
  { ids: ["basic", "vod"], label: "BASIC＋VOD", discount: 0 },
  { ids: ["basic", "ppv"], label: "BASIC＋PPV", discount: 0 },
  { ids: ["basic", "call-anser"], label: "BASIC＋CALL＆ANSER", discount: 0 },
  { ids: ["basic", "vod", "ppv"], label: "BASIC＋VOD＋PPV", discount: 0 },
  { ids: ["basic", "vod", "ppv", "call-anser"], label: "全部入り", discount: 0 },
  { ids: ["basic", "digital-ticket"], label: "BASIC＋チケット", discount: 0 },
];

const ADMIN_EMAILS = ["unei@chatmarket.info", "ono@onestep-corp.com"];
const FREE_TRIAL_EMAILS = ["haru.24@icloud.com"];

export default function PlanSelect() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // 管理者メールの場合は全プラン加入
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          if (ADMIN_EMAILS.includes(u.email)) {
            setSelected(new Set(["basic", "vod", "ppv", "call-anser", "mini-school", "enterprise", "crowdfunding", "digital-ticket"]));
          } else if (FREE_TRIAL_EMAILS.includes(u.email)) {
            setSelected(new Set(["basic", "vod", "ppv", "call-anser"]));
          }
        });
      }
    });
  }, []);

  const togglePlan = (id) => {
    // 管理者メール・フリートライアルメールは選択不可
    if (ADMIN_EMAILS.includes(user?.email) || FREE_TRIAL_EMAILS.includes(user?.email)) {
      return;
    }

    const plan = PLANS.find((p) => p.id === id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // FREEまたはcrowdfundingは排他
      if (plan.exclusive) {
        return new Set([id]);
      }
      // FREEが選ばれていたら外す
      next.delete("free");
      next.delete("crowdfunding");
      next.add(id);
      return next;
    });
  };

  const applyCombo = (ids) => {
    setSelected(new Set(ids));
  };

  const selectedPlans = PLANS.filter((p) => selected.has(p.id));
  const totalPrice = FREE_TRIAL_EMAILS.includes(user?.email) 
    ? 0 
    : selectedPlans.filter((p) => !p.comingSoon).reduce((sum, p) => sum + p.price, 0);

  const handleApply = async () => {
    const ids = [...selected].join(",");
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      // ログイン後にプラン確認ページへ戻る
      base44.auth.redirectToLogin(`/plan-confirm?plans=${ids}`);
      return;
    }
    navigate(`/plan-confirm?plans=${ids}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {ADMIN_EMAILS.includes(user?.email) && (
        <div className="bg-primary/10 border border-primary/40 rounded-xl p-4">
          <p className="text-sm font-bold text-primary mb-1">運営管理者アカウント</p>
          <p className="text-xs text-primary/80">全プラン（BASIC・VOD・PPV・CALL&ANSER・ミニスクール・エンタープライズ・クラウドファンディング）が自動的に加入状態になり、全プランの詳細を確認できます。</p>
        </div>
      )}
      {FREE_TRIAL_EMAILS.includes(user?.email) && (
        <div className="bg-blue-500/10 border border-blue-500/40 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-400 mb-1">フリートライアル</p>
          <p className="text-xs text-blue-300">BASIC・VOD・PPV・CALL&ANSERプランが無料で利用できます。</p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black">プランを選択する</h1>
        <p className="text-muted-foreground text-sm mt-1">複数のプランを組み合わせてお申し込みいただけます。</p>
        <p className="text-sm text-foreground/80 mt-2">ChatMarketのプランは必要なプランをお選び頂き組み合わせてお申し込みが出来ます。</p>
        <div className="mt-3 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <span className="text-yellow-400 text-lg shrink-0">🎁</span>
          <p className="text-sm text-yellow-300 font-semibold">年払いで申し込むと <span className="text-white font-black">10ヶ月分のご請求</span>となり、<span className="text-white font-black">2ヶ月分がお得</span>になります。</p>
        </div>
      </div>

      {/* おすすめコンボ */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">おすすめの組み合わせ</p>
        <div className="flex flex-wrap gap-2">
          {COMBOS.map((combo) => (
            <button
              key={combo.label}
              onClick={() => applyCombo(combo.ids)}
              disabled={ADMIN_EMAILS.includes(user?.email)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {combo.label}
            </button>
          ))}
        </div>
      </div>

      {/* プラン一覧 */}
      <div className="space-y-3">
        <Accordion type="multiple" defaultValue={["free", "basic", "call-anser", "vod", "ppv"]} className="space-y-2">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selected.has(plan.id);
            return (
              <AccordionItem key={plan.id} value={plan.id} className="border border-border/50 rounded-lg px-4">
                <AccordionTrigger 
                  onClick={() => {
                    if (!plan.comingSoon) {
                      togglePlan(plan.id);
                    }
                  }}
                  className={`hover:no-underline py-4 ${plan.comingSoon || ADMIN_EMAILS.includes(user?.email) ? "cursor-not-allowed" : ""}`}
                  disabled={ADMIN_EMAILS.includes(user?.email)}
                >
                  <div className="flex items-center gap-4 text-left flex-1">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      plan.comingSoon
                        ? "border-muted/30 bg-muted/10 opacity-30 cursor-not-allowed"
                        : isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>{plan.badge}</span>
                        {plan.popular && <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">人気</span>}
                        {plan.comingSoon && <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">🚧 準備中</span>}
                      </div>
                      <p className="font-bold text-sm">{plan.name}</p>
                      {plan.revenueShare && (
                        <p className="text-xs text-primary font-semibold">収益還元率 {plan.revenueShare}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg font-black">{plan.priceDisplay || `¥${plan.price.toLocaleString()}`}</span>
                      {!plan.priceDisplay && <span className="text-muted-foreground text-xs ml-1">{plan.period}</span>}
                    </div>
                  </div>
                </AccordionTrigger>

                {/* アコーディオンコンテンツ：機能リストと申し込みボタン */}
                <AccordionContent className="pt-4 pb-4 space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ids = plan.id;
                      const isAuth = await base44.auth.isAuthenticated();
                      if (!isAuth) {
                        base44.auth.redirectToLogin(`/plan-confirm?plans=${ids}`);
                        return;
                      }
                      navigate(`/plan-confirm?plans=${ids}`);
                    }}
                    disabled={plan.comingSoon}
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {plan.comingSoon ? "準備中" : "このプランで申し込む"}
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* 合計・申し込みバー */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <div className="bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="font-bold">選択中のプラン</span>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {selectedPlans.map((p) => (
                  <span key={p.id} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <div>
                <p className="text-xs text-muted-foreground">月額合計</p>
                <p className="text-2xl font-black text-primary">¥{totalPrice.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/月</span></p>
              </div>
              <Button onClick={handleApply} className="bg-primary hover:bg-primary/90 px-8 h-12 text-base font-bold gap-2">
                <ExternalLink className="w-4 h-4" />
                申し込む
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}