import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { useNavigate } from "react-router-dom";
import { resolveUserPlan } from "@/lib/userPlan";
import { Button } from "@/components/ui/button";
import { Check, Video, Radio, PhoneCall, Play, Heart, Phone, ExternalLink, ShoppingCart, X, GraduationCap, Building2, ChevronDown, Ticket, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getStripeLinkByPlan } from "@/lib/stripeLinks";
import { toast } from "sonner";
import ProgressiveIncentiveChart from "@/components/plan/ProgressiveIncentiveChart";

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
    badge: "初期費用・月額 0円でお試し開始",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    description: "クレジットカード不要。1対1の有料ビデオ通話で今すぐ収益化をお試しいただけます。",
    features: ["初期費用・月額 0円でお試し開始", "1対1の有料ビデオ通話機能（収益還元率70%）", "視聴者からエールコイン受取", "チャンネルページ作成"],
    exclusive: true,
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
    description: "WebRTC P2P採用。1対1の有料ビデオ通話で収益化。プログレッシブ・インセンティブで最大95%還元。",
    features: ["WebRTC P2P による低遅延1対1ビデオ通話", "1対1 有料ビデオ通話（配信者が料金設定・申込者が支払い）", "通話料金：15分 150円〜（配信最低設定金額、上限なし）", "スケジュール制・事前申し込み方式", "無料通話枠なし・有料通話のみ", "プログレッシブ・インセンティブに自動参加（月間売上で還元率最大95%）", "視聴者からエールコイン受取"],
  },
  {
    id: "call-anser",
    icon: Phone,
    name: "1対1通話プラン",
    price: 3300,
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
      "通話料金設定：15分 150円〜（配信最低設定金額、上限なし）",
      "相手の希望額を支払って発信することも可能",
      "有料インタビュー・推し活・求人面接など"
    ],
  },
  {
    id: "vod",
    icon: Video,
    name: "動画販売プラン",
    price: 3300,
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
      "販売価格：15円〜（15分単位・自由設定）",
      "生配信アーカイブ販売機能",
      "アーカイブ配信画質：720p (HD)",
      "1日の合計視聴時間：最大60分まで",
      "視聴者からエールコイン受取"
    ],
  },
  {
    id: "ppv",
    icon: Radio,
    name: "有料ライブ配信プラン",
    price: 3300,
    period: "/月",
    revenueShare: "85%",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    iconColor: "text-red-400",
    badge: "有料ライブ配信",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "1対多数の有料ライブ配信でファンから直接収益化。BASICプランとの組み合わせでご利用いただけます。",
    features: [
      "1対多数の有料ライブ配信（視聴者数無制限）",
      "【施策①】最低配信料金：SD 480p 15コイン〜 / HD 720p 55コイン〜 / FHD 1080p 150コイン〜（15分あたり）",
      "【施策②】画質制限：55コイン設定は720p / 150コイン以上設定は1080p許可",
      "【施策③】プログレッシブ・インセンティブ：月間売上に応じて還元率が最大95%まで自動アップ",
      "視聴者からエールコイン（投げ銭）受取",
      "ライブ配信アーカイブをVOD販売可（BASICプラン+VODプラン加入で可）",
      "アーカイブ配信画質：720p (HD)",
      "1日の合計視聴時間：最大60分まで（視聴者側）",
      "音楽利用（歌唱・演奏・BGM）は追加でJASRAC包括契約対応",
      "コスト内訳：場所代30円/時間（入力）＋ 送料5円/視聴者/時間（出力）",
    ],
    priceDetail: [
      { quality: "SD 480p", minPrice: "15コイン〜", icon: "📺" },
      { quality: "HD 720p", minPrice: "55コイン〜", icon: "🖥️" },
      { quality: "FHD 1080p", minPrice: "150コイン〜", icon: "✨" },
    ],
  },
  {
    id: "mini-school",
    icon: GraduationCap,
    name: "ミニスクールプラン",
    price: 3300,
    period: "/月",
    revenueShare: "85%",
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    iconColor: "text-violet-400",
    badge: "1対2〜最大9名",
    badgeColor: "bg-violet-500/20 text-violet-300",
    description: "1対2〜最大9名の少人数レッスンを開講できます。チケット制で1回単位の収益化ができ、生徒は無料プランでも参加できます。",

    features: [
      "1対2〜最大9名の少人数授業（生徒氏名がリアルタイム表示）",
      "チケット制（1回単位・自由料金設定）",
      "生徒側は無料プランでもアクセス可能",
      "収益還元率85%",
      "月の授業回数・時間・料金は配信者が自由設定",
      "★ キャンペーン対象者は12か月間月額無料",
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

export default function PlanSelect() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const [myChannel, setMyChannel] = useState(null);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(async (u) => {
          setUser(u);
          const info = await resolveUserPlan(u);
          setPlanInfo(info);
          // admin・キャンペーン対象者は全プランを表示用に選択済みにする
          if (info.isAdmin || info.isCampaign) {
            setSelected(new Set(["basic", "vod", "ppv", "call-anser", "mini-school", "enterprise", "crowdfunding", "digital-ticket"]));
          }
          // チャンネル作成状況を確認
          const channels = await base44.entities.Channel.filter({ owner_email: u.email });
          setMyChannel(channels[0] || null);
        });
      }
    });
  }, []);

  const togglePlan = (id) => {
    if (planInfo?.isAdmin || planInfo?.isCampaign) return;

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
  const totalPrice = (planInfo?.isAdmin || planInfo?.isCampaign)
    ? 0
    : selectedPlans.filter((p) => !p.comingSoon).reduce((sum, p) => sum + p.price, 0);

  const handleApply = async () => {
    const ids = Array.from(selected);
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(`/plan-confirm?plans=${ids.join(",")}`);
      return;
    }
    if (!myChannel && !(planInfo?.isAdmin || planInfo?.isCampaign)) {
      toast.error("先にチャンネルを作成してください");
      navigate("/my-channel");
      return;
    }
    
    // FREEプランの場合はシステム内で即座に権限付与
    if (ids.length === 1 && ids[0] === "free") {
      try {
        await base44.auth.updateMe({ plan_subscribed: "free", free_plan_activated_at: new Date().toISOString() });
        toast.success("FREEプランを有効にしました！");
        navigate("/creator-dashboard");
        return;
      } catch (err) {
        toast.error("無料プラン有効化に失敗しました");
      }
    }
    
    // 有料プラン（複数月を自動判定）
    const months = planInfo?.isCampaign ? 24 : 12;
    const planId = ids[0]; // 複数選択時は先頭のプラン
    const stripeLink = getStripeLinkByPlan(planId, months);
    
    if (!stripeLink) {
      toast.error(`${planId} プランのStripeリンクが見つかりません`);
      return;
    }
    
    // successUrlで戻ってくる時に自動認識させるためのフラグを付与
    const returnUrl = `${window.location.origin}/plan-confirm?plans=${ids.join(",")}&stripe_success=true`;
    const emailParam = user?.email ? encodeURIComponent(user.email) : '';
    window.location.href = `${stripeLink}?locked_prefilled_email=${emailParam}&success_url=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32 space-y-8 bg-background">
      <MetaHelmet page="plan-select" />
      {/* 全ユーザー共通：キャンペーン・課金条件の説明バナー */}
      <div className="bg-secondary/50 border border-border/60 rounded-xl p-4 space-y-2">
        <p className="text-sm font-bold text-foreground flex items-center gap-2">📋 ご利用前にご確認ください</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0">🎁</span><span><span className="font-bold text-emerald-300">キャンペーン対象者は12ヶ月間、対象プランを無料でご利用いただけます。</span></span></li>
          <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">⚠️</span><span>無料期間終了後、<span className="font-bold text-foreground/90">自動課金は行われません。</span></span></li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">📋</span><span>有料プランを継続するには、<span className="font-bold text-foreground/90">ご自身で手動でお申し込みが必要です。</span></span></li>
          <li className="flex items-start gap-2"><span className="text-muted-foreground shrink-0">ℹ️</span><span>申し込みがない場合は、<span className="font-bold text-foreground/90">FREEプラン（収益還元率70%）</span>のみご利用可能となります。</span></li>
        </ul>
      </div>

      {/* 未ログインユーザー向けバナー */}
      {!user && (
        <div className="bg-primary/10 border border-primary/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">プランを閲覧中です</p>
            <p className="text-xs text-primary/80 mt-0.5">申し込むにはログイン / 新規登録が必要です。まずは無料で始めることもできます。</p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0" onClick={() => base44.auth.redirectToLogin("/plan-select")}>
            ログイン / 新規登録
          </Button>
        </div>
      )}

      {/* チャンネル未作成ユーザー向けバナー */}
      {user && myChannel === null && planInfo && !planInfo.isAdmin && !planInfo.isCampaign && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-400">先にクリエイター登録が必要です</p>
            <p className="text-xs text-amber-300/80 mt-0.5">プランへの申し込みには、チャンネル（クリエイターページ）の作成が必要です。</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 shrink-0" onClick={() => navigate("/my-channel")}>
            チャンネルを作成する
          </Button>
        </div>
      )}

      {planInfo?.isAdmin && (
        <div className="bg-primary/10 border border-primary/40 rounded-xl p-4">
          <p className="text-sm font-bold text-primary mb-1">運営管理者アカウント</p>
          <p className="text-xs text-primary/80">全プランが自動的に開放されています。全機能をテストできます。</p>
        </div>
      )}
      {planInfo?.isCampaign && !planInfo?.isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/40 rounded-xl p-4 space-y-2">
          <p className="text-sm font-bold text-blue-400">🎉 キャンペーン適用中 — すべての対象機能が12ヶ月間無料</p>
          <p className="text-sm text-blue-200 leading-relaxed">
            キャンペーン対象者は、BASIC・CALL&ANSER・VOD・PPV・ミニスクールを含む<span className="font-bold">すべての対象機能を12ヶ月間無料</span>でご利用いただけます。追加のお申し込みや課金は一切不要です。
          </p>
          {planInfo.campaignExpiresAt && (
            <p className="text-xs text-blue-300 font-bold">無料期間終了日: {planInfo.campaignExpiresAt.toLocaleDateString('ja-JP')}</p>
          )}
          <div className="bg-blue-900/30 border border-blue-500/20 rounded-lg p-3 space-y-1.5 text-xs text-blue-300/90">
            <p className="flex items-start gap-1.5"><span className="text-blue-400 shrink-0">⚠️</span>無料期間終了後、<span className="font-bold text-blue-200">自動課金は行われません。</span></p>
            <p className="flex items-start gap-1.5"><span className="text-blue-400 shrink-0">📋</span>有料プランの機能を継続するには、<span className="font-bold text-blue-200">無料期間終了後にご自身でお申し込みください。</span></p>
            <p className="flex items-start gap-1.5"><span className="text-blue-400 shrink-0">ℹ️</span>申し込みがない場合は、<span className="font-bold text-white">FREEプラン（収益還元率70%）</span>のみご利用可能となります。</p>
          </div>
        </div>
      )}
      {!planInfo?.isCampaign && !planInfo?.isAdmin && planInfo && (
        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-1">
          <p className="text-xs font-bold text-foreground/80">📋 現在のプラン状況</p>
          <p className="text-xs text-muted-foreground">
            {planInfo.plans.includes('free') || planInfo.plans.length === 0
              ? 'FREEプラン（収益還元率70%）'
              : `有料プラン加入中: ${planInfo.plans.join(' / ')}（収益還元率${Math.round(planInfo.revenueRate * 100)}%）`}
          </p>
        </div>
      )}

      <div className="space-y-3">
         <h1 className="text-2xl font-black">スキルを収益にするためのプラン一覧</h1>
         <p className="text-muted-foreground text-sm">複数のプランを組み合わせてお申し込みいただけます。</p>

         {/* 目立つ説明バナー */}
         <div className="bg-secondary/40 border border-border/60 rounded-xl p-4 space-y-2">
           <p className="text-sm font-bold text-foreground flex items-center gap-2">
             ✨ ChatMarketは複数プランの自由な組み合わせ対応！
           </p>
           <p className="text-sm text-foreground/80 leading-relaxed">
             必要なプランをお選び頂き、組み合わせてお申し込みが出来ます。BASICプランをベースに、VOD・PPV・CALL&ANSERなど、あなたのビジネス展開に必要なプランだけを選択できます。
           </p>
         </div>

         <div className="flex items-center gap-2 bg-secondary/40 border border-border/50 rounded-xl px-4 py-3">
          <span className="text-amber-400 text-lg shrink-0">🎁</span>
          <p className="text-sm text-foreground/80 font-semibold">年払いで申し込むと <span className="text-foreground font-black">10ヶ月分のご請求</span>となり、<span className="text-foreground font-black">2ヶ月分がお得</span>になります。</p>
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
              disabled={planInfo?.isAdmin || planInfo?.isCampaign}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {combo.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== FREE プラン 大カード（試食コーナー） ===== */}
      {(() => {
        const freePlan = PLANS.find(p => p.id === "free");
        const isSelected = selected.has("free");
        return (
          <div
            onClick={() => !planInfo?.isAdmin && !planInfo?.isCampaign && togglePlan("free")}
            className={`relative rounded-2xl border p-6 cursor-pointer transition-all space-y-4 ${
              isSelected
                ? "border-emerald-400/50 bg-emerald-500/5"
                : "border-border/50 hover:border-emerald-400/30 bg-card"
            }`}
          >
            {/* 試食バナー */}
            <div className="absolute -top-4 left-6 bg-emerald-500 text-black px-4 py-1 rounded-full text-xs font-black flex items-center gap-1.5">
              🍽️ まずは無料でお試し — 試食コーナー
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-6 pt-2">
              {/* 左：メッセージ＋価格 */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">初期費用・月額 0円でお試し開始</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">収益還元率 70%</span>
                </div>

                <div>
                  <p className="text-2xl font-black">FREEプラン</p>
                  <p className="text-muted-foreground text-sm mt-1">料理で言えば「まずはお一口、無料でどうぞ。味には自信があります」という試食コーナー。気に入ったら有料プランへ。</p>
                </div>

                {/* 1対1通話 訴求バッジ */}
                <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl px-4 py-2.5">
                  <PhoneCall className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-emerald-300">1対1の有料ビデオ通話 対応</p>
                    <p className="text-xs text-emerald-400/70">収益還元率 <span className="font-black text-emerald-300">70%</span> — 今すぐ収益化体験</p>
                  </div>
                </div>

                <ul className="space-y-1.5 text-sm">
                  {freePlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-foreground/80">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 右：価格＋矢印 */}
              <div className="flex flex-col items-center gap-3 md:min-w-[160px]">
                <div className="text-center">
                  <p className="text-5xl font-black text-emerald-400">¥0</p>
                  <p className="text-xs text-muted-foreground">/月（ずっと無料）</p>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  <p className="text-amber-400 font-bold">気に入ったら↓</p>
                  <p>有料プランで本注文</p>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const isAuth = await base44.auth.isAuthenticated();
                    if (!isAuth) { base44.auth.redirectToLogin("/plan-confirm?plans=free"); return; }
                    navigate("/plan-confirm?plans=free");
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm transition-all"
                >
                  無料で始める
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 試食→本注文 矢印ブリッジ */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border/40" />
        <div className="text-xs font-semibold text-muted-foreground bg-secondary/50 border border-border/40 rounded-full px-4 py-1.5">
          ↓ 味に納得したら「本注文（有料プラン）」へ ↓
        </div>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      {/* プラン一覧（FREEを除く） */}
      <div className="space-y-3">
        <Accordion type="multiple" defaultValue={["basic", "call-anser", "vod", "ppv", "mini-school"]} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {PLANS.filter(p => p.id !== "free").map((plan) => {
            const Icon = plan.icon;
            const isSelected = selected.has(plan.id);
            return (
              <AccordionItem key={plan.id} value={plan.id} className="border border-border/40 rounded-xl px-4 bg-card/50">
                <AccordionTrigger 
                  onClick={() => {
                    if (!plan.comingSoon && !(planInfo?.isAdmin || planInfo?.isCampaign)) {
                      togglePlan(plan.id);
                    }
                  }}
                  className={`hover:no-underline py-4 ${plan.comingSoon ? "cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-4 text-left flex-1">
                    {/* Checkbox */}
                    <div
                      title={planInfo?.isCampaign && isSelected ? "キャンペーン適用中 — 無料でご利用いただけます" : undefined}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        plan.comingSoon
                          ? "border-muted/30 bg-muted/10 opacity-30 cursor-not-allowed"
                          : isSelected
                            ? planInfo?.isCampaign ? "bg-blue-500 border-blue-500" : "bg-primary border-primary"
                            : "border-muted-foreground"
                      }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
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
  
                  {plan.id === 'mini-school' && (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        1対2〜最大9名の少人数レッスンを開講できます。チケット制で1回単位の収益化ができ、生徒は無料プランでも参加できます。
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/classroom-lp'); }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg px-4 py-2 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        詳しく見る（ミニスクールLP）
                      </button>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* PPV 料金テーブル */}
                  {plan.priceDetail && (
                    <div className="rounded-xl border border-red-500/20 overflow-hidden">
                      <div className="bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 uppercase tracking-wider">
                        📡 1対多数ライブ配信 料金（15分あたり・視聴者1人）
                      </div>
                      <div className="divide-y divide-border/30">
                        {plan.priceDetail.map((row) => (
                          <div key={row.quality} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{row.icon}</span>
                              <span className="font-bold text-sm">{row.quality}</span>
                            </div>
                            <span className="text-primary font-black text-sm">{row.minPrice}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-secondary/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
                        <p>📌 収益還元率 <span className="text-primary font-bold">85%</span>（月間売上に応じて最大95%まで自動アップ）</p>
                        <p>📌 55コイン設定 → 最大720p / 150コイン以上 → 最大1080p配信許可</p>
                        <p>📌 コスト：場所代30円/時間 ＋ 送料5円/視聴者/時間</p>
                      </div>
                    </div>
                  )}
                  {(planInfo?.isAdmin || planInfo?.isCampaign) && ['call-anser','basic','vod','ppv','mini-school'].includes(plan.id) ? (
                    <div className="w-full h-9 rounded-lg border border-blue-500/40 bg-blue-500/10 flex items-center justify-center gap-2 text-sm text-blue-300 font-bold">
                      ✅ キャンペーン適用中 — 追加料金なし
                    </div>
                  ) : (
                    <Button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const isAuth = await base44.auth.isAuthenticated();
                        if (!isAuth) {
                          base44.auth.redirectToLogin(`/plan-confirm?plans=${plan.id}`);
                          return;
                        }
                        if (!myChannel && !(planInfo?.isAdmin || planInfo?.isCampaign)) {
                          toast.error("先にチャンネルを作成してください");
                          navigate("/my-channel");
                          return;
                        }

                        // FREE プランは即座に有効化
                        if (plan.id === "free") {
                          try {
                            await base44.auth.updateMe({ plan_subscribed: "free", free_plan_activated_at: new Date().toISOString() });
                            toast.success("FREEプランを有効にしました！");
                            navigate("/creator-dashboard");
                          } catch (err) {
                            toast.error("無料プラン有効化に失敗しました");
                          }
                          return;
                        }

                        // 有料プランはStripe決済へ（通常ユーザーのみ）
                        const months = 12;
                        const stripeLink = getStripeLinkByPlan(plan.id, months);
                        if (!stripeLink) {
                          toast.error(`${plan.name}のStripeリンクが見つかりません`);
                          return;
                        }
                        const returnUrl = `${window.location.origin}/plan-confirm?plans=${plan.id}&stripe_success=true`;
                        const emailParam = user?.email ? encodeURIComponent(user.email) : '';
                        window.location.href = `${stripeLink}?locked_prefilled_email=${emailParam}&success_url=${encodeURIComponent(returnUrl)}`;
                      }}
                      disabled={plan.comingSoon}
                      className="w-full gap-2 bg-primary hover:bg-primary/90"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {plan.comingSoon ? "準備中" : "このプランで申し込む"}
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* プログレッシブ・インセンティブ グラフ解説 */}
      <ProgressiveIncentiveChart />

      {/* 合計・申し込みバー */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <div className="bg-card border border-border/60 rounded-2xl shadow-lg p-5 space-y-3">
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