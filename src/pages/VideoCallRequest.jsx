import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  PhoneCall, ArrowLeft, Info, AlertCircle, Lock, Calendar, Clock, Coins, CheckCircle2, Phone, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import MessageModal from "../components/chat/MessageModal";

function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

// プランチェック（FREEも通話可能）
function getUserPlan(user) {
  if (!user) return null;
  if (user.plan === "call-anser") return "call-anser";
  if (user.plan === "basic") return "basic";
  if (user.role === "admin") return "basic"; // adminは開発確認用
  return "free"; // FREEプランも通話可能
}

// 収益率
function getRevenueShare(plan) {
  if (plan === "basic" || plan === "call-anser") return 0.85;
  return 0.70;
}

// ステップアップ課金定数
const FIRST_UNIT_COINS  = 150;  // 第1ユニット（0〜15分）特別価格
const NORMAL_COINS      = 500;  // 第2ユニット以降（16分〜）通常価格
const MIN_COINS_PER_15MIN = FIRST_UNIT_COINS; // 通話開始の最低残高

// CALL&ANSERプラン: 1日の無料通話上限（分）
const FREE_CALL_DAILY_LIMIT_MIN = 60;
const FREE_CALL_SLOT_MIN = 10; // 10分単位
const FREE_CALL_MAX_SLOTS = 6; // 最大6スロット（10分×6=60分）

// コイン単価計算（15分換算）
function calcCoinPer15(minutes, coinPrice) {
  return Math.round((coinPrice / minutes) * 15);
}

// 10分刻み選択肢を取得（price設定済みのもの）
function getAvailableDurations(channel) {
  const options = [];
  [10, 20, 30, 40, 50, 60].forEach((min) => {
    const price = channel[`call_price_${min}min`] || 0;
    if (price > 0) options.push({ minutes: min, price });
  });
  // 旧形式（15/45/75/90/105/120min）の後方互換
  [15, 45, 75, 90, 105, 120].forEach((min) => {
    const price = channel[`call_price_${min}min`] || 0;
    if (price > 0) options.push({ minutes: min, price });
  });
  options.sort((a, b) => a.minutes - b.minutes);
  return options;
}

// フリートライアル判定
function isTrialChannel(channel) {
  const FREE_TRIAL_EMAILS = ["haru.24@icloud.com"];
  return FREE_TRIAL_EMAILS.includes(channel?.owner_email);
}

export default function VideoCallRequest() {
  const { channelId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [channel, setChannel] = useState(null);
  const [message, setMessage] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => { setUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  useEffect(() => {
    if (!channelId) return;
    base44.entities.Channel.filter({ id: channelId }).then((res) => setChannel(res[0]));
  }, [channelId]);

  const [useFreeSlot, setUseFreeSlot] = useState(false);
  const [freeSlotDuration, setFreeSlotDuration] = useState(10);

  const { data: existingRequests = [] } = useQuery({
    queryKey: ["call-requests", user?.email, channel?.owner_email],
    queryFn: () => base44.entities.VideoCall.filter({
      caller_email: user.email,
      callee_email: channel.owner_email,
      status: "pending",
    }),
    enabled: !!user && !!channel,
  });

  const threadId = user && channel ? makeThreadId(user.email, channel.owner_email) : null;
  const userPlan = getUserPlan(user);
  const revenueShare = getRevenueShare(userPlan);
  const availableDurations = channel ? getAvailableDurations(channel) : [];

  // 選択中の料金
  const selectedDuration = availableDurations.find((d) => d.minutes === durationMinutes) || availableDurations[0];
  const callPrice = selectedDuration?.price || 0;

  // CALL&ANSERプラン: 今日の無料通話利用分を取得
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayFreeCalls = [] } = useQuery({
    queryKey: ["free-calls-today", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ caller_email: user.email, is_free_call: true }),
    enabled: !!user && userPlan === "call-anser",
  });
  const todayFreeMinutesUsed = todayFreeCalls
    .filter((c) => new Date(c.created_date) >= todayStart)
    .reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
  const freeMinutesRemaining = Math.max(0, FREE_CALL_DAILY_LIMIT_MIN - todayFreeMinutesUsed);
  const freeSlotsRemaining = Math.floor(freeMinutesRemaining / FREE_CALL_SLOT_MIN);
  const freeSlotOptions = Array.from({ length: Math.min(freeSlotsRemaining, FREE_CALL_MAX_SLOTS) }, (_, i) => (i + 1) * FREE_CALL_SLOT_MIN);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !channel) return;

    if (existingRequests.length > 0) {
      toast.error("すでに通話申し込みが送信済みです。相手の返答をお待ちください。");
      return;
    }

    if (!preferredDate) {
      toast.error("希望日時を入力してください。");
      return;
    }

    setSubmitting(true);

    const isFree = userPlan === "call-anser" && useFreeSlot;
    const actualDuration = isFree ? freeSlotDuration : durationMinutes;
    const actualPrice = isFree ? 0 : callPrice;
    const coinPer15 = isFree ? 0 : calcCoinPer15(actualDuration, actualPrice);

    await base44.entities.VideoCall.create({
      caller_email: user.email,
      caller_name: user.full_name || user.email,
      callee_email: channel.owner_email,
      callee_name: channel.name,
      callee_channel_id: channelId,
      status: "pending",
      is_free_call: isFree,
      is_paid: !isFree,
      price: actualPrice,
      coin_price_per_15min: coinPer15,
      duration_minutes: actualDuration,
      message: `【希望日時】${preferredDate}${message ? `\n${message}` : ""}`,
      thread_id: threadId,
    });

    if (threadId) {
      const planLabel = "CALL＆ANSERプラン";
      const callLabel = isFree
        ? `【無料通話リクエスト（${planLabel}）】\n⏱ ${actualDuration}分 / 🆓 無料枠使用\n📅 希望日時: ${preferredDate}${message ? `\n💬 ${message}` : ""}`
        : `【1対1ビデオ通話リクエスト（${planLabel}）】\n⏱ ${actualDuration}分 / 💴 ¥${actualPrice.toLocaleString()}\n📅 希望日時: ${preferredDate}${message ? `\n💬 ${message}` : ""}`;
      await base44.entities.DirectChat.create({
        from_email: user.email,
        from_name: user.full_name || user.email,
        to_channel_owner_email: channel.owner_email,
        to_channel_id: channel.id,
        to_channel_name: channel.name,
        content: callLabel,
        yell_coin: 0,
        thread_id: threadId,
      });
    }

    setSubmitting(false);
    toast.success("通話リクエストを送りました！承諾後、通話ボタンが有効になります。");
    navigate(`/chat/${channelId}`);
  };

  if (!channel || !userLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 未ログインガード（FREEプランは全員アクセス可のため削除、認証チェックのみ）


  // 通話受付オフガード（フリートライアルは受付中扱い）
  if (!channel.call_enabled && !isTrialChannel(channel)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
          <PhoneCall className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">現在通話受付停止中</h2>
        <p className="text-sm text-muted-foreground">{channel.name} は現在1対1ビデオ通話を受け付けていません。</p>
        <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground">戻る</button>
      </div>
    );
  }

  // プランバッジ表示用
  const planBadge = userPlan === "call-anser"
    ? { label: "CALL＆ANSERプラン", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", icon: Phone }
    : userPlan === "basic"
    ? { label: "BASICプラン", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: PhoneCall }
    : { label: "FREEプラン", color: "text-gray-300 bg-gray-500/10 border-gray-500/30", icon: PhoneCall };
  const PlanIcon = planBadge.icon;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-primary" /> 1対1ビデオ通話を申し込む
        </h1>
      </div>

      {/* 相手情報 */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          {channel.avatar_url
            ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg font-bold text-muted-foreground">{channel.name?.[0]}</span>}
        </div>
        <div className="flex-1">
          <p className="font-bold">{channel.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-primary" /> 通話受付中
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowMessageModal(true)}>
            <MessageCircle className="w-3 h-3 mr-1" /> メッセージ
          </Button>
          <Link to={`/chat/${channelId}`}>
            <Button size="sm" variant="outline" className="text-xs">チャットへ</Button>
          </Link>
        </div>
      </div>

      {/* 配信者スケジュール */}
      {channel.call_available_dates && (
        <div className="bg-secondary rounded-xl p-3 mb-4 flex items-start gap-2 text-sm">
          <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-xs text-primary mb-0.5">通話可能スケジュール（配信者設定）</p>
            <p className="text-xs text-foreground whitespace-pre-wrap">{channel.call_available_dates}</p>
          </div>
        </div>
      )}

      {/* プランバッジ */}
      <div className={`border rounded-xl p-3 mb-4 flex items-center gap-2 text-xs ${planBadge.color}`}>
        <PlanIcon className="w-4 h-4 shrink-0" />
        <span className="font-semibold">{planBadge.label}</span>
        <span className="text-muted-foreground">— 収益率 {userPlan === "free" ? "70%" : "85%"}</span>
      </div>

      {/* FREEプランならBASIC推奨バナー */}
      {userPlan === "free" && (
        <div className="bg-blue-500/10 border border-blue-500/40 rounded-xl p-4 mb-4 flex items-start gap-2">
          <PhoneCall className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-400">BASICプラン（¥3,300/月）へのアップグレードで収益率 70%→85%</p>
            <p className="text-xs text-muted-foreground mt-0.5">FREEプランでも通話は可能ですが、配信者への収益還元が30%差引されます。</p>
            <Link to="/plan-select" className="text-xs text-blue-400 underline mt-1 inline-block">プランを比較する →</Link>
          </div>
        </div>
      )}

      {/* プラン別注意書き */}
      <div className={`rounded-xl p-3 mb-5 border text-xs space-y-1 ${userPlan === "call-anser" ? "bg-cyan-500/5 border-cyan-500/20" : userPlan === "basic" ? "bg-blue-500/5 border-blue-500/20" : "bg-gray-500/5 border-gray-500/20"}`}>
        {userPlan === "free" && (
          <>
            <p className="font-semibold text-gray-400">FREEプランの通話ルール</p>
            <p className="text-muted-foreground">10分刻み（最大1時間）で申し込めます。配信者設定料金を支払います。承諾後に通話ボタンを押した時点で課金されます。</p>
          </>
        )}
        {userPlan === "basic" && (
          <>
            <p className="font-semibold text-blue-400">BASICプランの通話ルール</p>
            <p className="text-muted-foreground">10分刻み（最大1時間）で申し込めます。配信者が設定した料金を申込者（あなた）が支払います。承諾後に通話ボタンを押した時点で課金されます。</p>
          </>
        )}
        {userPlan === "call-anser" && (
        <>
          <p className="font-semibold text-cyan-400">CALL＆ANSERプランの通話ルール</p>
          <p className="text-muted-foreground">双方向通話プランです。<span className="text-cyan-400 font-semibold">1日60分（10分×6回）の無料通話枠</span>があります。無料枠を使わない場合は配信者設定料金で有料通話できます。</p>
          <p className="text-cyan-400 font-semibold mt-1">本日の無料残枠: {freeMinutesRemaining}分 / {FREE_CALL_DAILY_LIMIT_MIN}分</p>
        </>
        )}
      </div>

      {existingRequests.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">通話リクエスト送信済み</p>
            <p className="text-xs text-muted-foreground mt-0.5">相手の承諾後、チャットに通話ボタンが表示されます。</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CALL&ANSERプラン: 無料/有料切り替え */}
        {userPlan === "call-anser" && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4" /> 通話タイプを選択
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseFreeSlot(true)}
                disabled={freeSlotsRemaining === 0}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  useFreeSlot ? "border-cyan-400 bg-cyan-500/20" : "border-border bg-secondary hover:border-cyan-400/40"
                }`}
              >
                <span className="text-lg">🆓</span>
                <span className={`font-bold text-sm ${useFreeSlot ? "text-cyan-400" : "text-foreground"}`}>無料通話</span>
                <span className="text-[10px] text-muted-foreground">残 {freeMinutesRemaining}分</span>
              </button>
              <button
                type="button"
                onClick={() => setUseFreeSlot(false)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  !useFreeSlot ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"
                }`}
              >
                <span className="text-lg">💰</span>
                <span className={`font-bold text-sm ${!useFreeSlot ? "text-primary" : "text-foreground"}`}>有料通話</span>
                <span className="text-[10px] text-muted-foreground">配信者設定料金</span>
              </button>
            </div>

            {/* 無料枠: スロット数選択 */}
            {useFreeSlot && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">使用スロット数を選択（1スロット = 10分）</p>
                  <p className="text-xs text-cyan-400 font-semibold">残 {freeSlotsRemaining}スロット（{freeMinutesRemaining}分）</p>
                </div>
                {freeSlotsRemaining === 0 ? (
                  <p className="text-xs text-red-400 font-semibold text-center py-2">本日の無料通話枠を使い切りました（60分/日）。明日リセットされます。</p>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: freeSlotsRemaining }, (_, i) => i + 1).map((slots) => {
                      const min = slots * FREE_CALL_SLOT_MIN;
                      const selected = freeSlotDuration === min;
                      return (
                        <button
                          key={slots}
                          type="button"
                          onClick={() => setFreeSlotDuration(min)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                            selected
                              ? "border-cyan-400 bg-cyan-500/20"
                              : "border-border bg-secondary hover:border-cyan-400/40"
                          }`}
                        >
                          <span className={`font-black text-base leading-none ${selected ? "text-cyan-400" : "text-foreground"}`}>{slots}</span>
                          <span className={`text-[10px] font-semibold ${selected ? "text-cyan-300" : "text-muted-foreground"}`}>{min}分</span>
                          <span className="text-[9px] text-cyan-400/70">無料</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {freeSlotDuration > 0 && freeSlotsRemaining > 0 && (
                  <div className="bg-cyan-500/10 rounded-lg px-3 py-2 text-xs text-cyan-300 flex items-center justify-between">
                    <span>選択中: <span className="font-bold text-cyan-400">{freeSlotDuration / FREE_CALL_SLOT_MIN}スロット / {freeSlotDuration}分</span></span>
                    <span>使用後の残枠: {freeMinutesRemaining - freeSlotDuration}分</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 通話時間 & 料金（有料の場合） */}
        {(!useFreeSlot || userPlan !== "call-anser") && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
          <Label className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" /> 通話時間を選択（10分刻み・最大1時間）
          </Label>
          {availableDurations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">配信者がまだ通話料金を設定していません</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableDurations.map(({ minutes, price }) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDurationMinutes(minutes)}
                  className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all ${
                    durationMinutes === minutes
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary hover:border-primary/40"
                  }`}
                >
                  <span className={`font-bold text-sm ${durationMinutes === minutes ? "text-primary" : "text-foreground"}`}>{minutes}分</span>
                  <span className={`text-xs font-black ${durationMinutes === minutes ? "text-primary" : "text-muted-foreground"}`}>
                    ¥{price.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ステップアップ課金の料金表 */}
          <div className="bg-secondary rounded-lg p-3 text-xs space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1 mb-2">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> 課金ルール（ステップアップ制）
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">最初の15分</p>
                <p className="font-black text-lg text-primary">{FIRST_UNIT_COINS}コイン</p>
                <p className="text-[9px] text-primary/70">お試し特別価格</p>
              </div>
              <div className="bg-secondary border border-border rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">16分以降 / 15分毎</p>
                <p className="font-black text-lg text-yellow-400">{NORMAL_COINS}コイン</p>
                <p className="text-[9px] text-muted-foreground">通常価格</p>
              </div>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 border-t border-border">
              <span>ライバー報酬（85%）</span>
              <span>第1U: {Math.floor(FIRST_UNIT_COINS * 0.85)}コイン / 第2U以降: {Math.floor(NORMAL_COINS * 0.85)}コイン</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ※ 通話開始時に150コインが即時引落。12分経過時点で次の500コインの残高確認を行います。残高不足の場合は15分で強制終了されます。
            </p>
          </div>
        </div>
        )}

        {/* 希望日時 */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" /> 希望日時
            <span className="text-destructive text-xs">*必須</span>
          </Label>
          <Input
            type="datetime-local"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="bg-secondary border-0"
            required
          />
          {channel.call_available_dates && (
            <p className="text-xs text-muted-foreground">上記の配信者スケジュールを参考に選択してください</p>
          )}
        </div>

        {/* メッセージ */}
        <div className="space-y-1.5">
          <Label>申し込みメッセージ（任意）</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="通話の目的・質問内容などをご記入ください（200文字以内）"
            className="bg-secondary border-0 resize-none"
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/200</p>
        </div>

        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary rounded-lg p-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
          <span>リクエストはチャットで通知されます。配信者が承諾すると通話ボタンが有効になり、あなたが通話ボタンを押した時点で課金されます。</span>
        </div>

        <Button
          type="submit"
          disabled={
            submitting ||
            existingRequests.length > 0 ||
            (userPlan === "call-anser" && useFreeSlot ? freeSlotsRemaining === 0 : !callPrice)
          }
          className={`w-full h-12 gap-2 text-base font-bold ${userPlan === "call-anser" && useFreeSlot ? "bg-cyan-600 hover:bg-cyan-700" : "bg-primary hover:bg-primary/90"}`}
        >
          {submitting ? "送信中..." : (
            <>
              <PhoneCall className="w-5 h-5" />
              {userPlan === "call-anser" && useFreeSlot
                ? `🆓 無料通話 ${freeSlotDuration}分 リクエストを送る`
                : callPrice > 0 ? `¥${callPrice.toLocaleString()} で通話リクエストを送る` : "通話リクエストを送る"
              }
            </>
          )}
        </Button>

        {availableDurations.length === 0 && (
          <p className="text-xs text-center text-muted-foreground">配信者がまだ通話料金を設定していません</p>
        )}
      </form>

      {/* Message Modal */}
      {showMessageModal && user && channel && (
        <MessageModal
          channel={{ id: channel.id, name: channel.name, owner_email: channel.owner_email }}
          video={null}
          user={user}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  );
}