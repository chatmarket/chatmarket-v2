import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  PhoneCall, ArrowLeft, Info, AlertCircle, Lock, Calendar, Clock, Coins, CheckCircle2, Phone
} from "lucide-react";
import { toast } from "sonner";

function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

// プランチェック
function getUserPlan(user) {
  if (!user) return null;
  if (user.plan === "call-anser") return "call-anser";
  if (user.plan === "basic") return "basic";
  if (user.role === "admin") return "basic"; // adminは開発確認用
  return null;
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

  // 料金: BASICは配信者設定価格、CALL&ANSERも配信者設定価格（双方向なので同じフィールドを使用）
  const callPrice = durationMinutes === 30
    ? (channel?.call_price_30min || 0)
    : (channel?.call_price_60min || 0);

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

    await base44.entities.VideoCall.create({
      caller_email: user.email,
      caller_name: user.full_name || user.email,
      callee_email: channel.owner_email,
      callee_name: channel.name,
      callee_channel_id: channelId,
      status: "pending",
      is_free_call: false,
      is_paid: true,
      price: callPrice,
      duration_minutes: durationMinutes,
      message: `【希望日時】${preferredDate}${message ? `\n${message}` : ""}`,
      thread_id: threadId,
    });

    if (threadId) {
      const planLabel = userPlan === "call-anser" ? "CALL＆ANSERプラン" : "BASICプラン";
      await base44.entities.DirectChat.create({
        from_email: user.email,
        from_name: user.full_name || user.email,
        to_channel_owner_email: channel.owner_email,
        to_channel_id: channel.id,
        to_channel_name: channel.name,
        content: `【1対1ビデオ通話リクエスト（${planLabel}）】\n⏱ ${durationMinutes}分 / 💴 ¥${callPrice.toLocaleString()}\n📅 希望日時: ${preferredDate}${message ? `\n💬 ${message}` : ""}`,
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

  // プラン未加入ガード
  if (!userPlan) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">プラン加入が必要です</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          1対1ビデオ通話は<span className="text-primary font-semibold">BASICプラン</span>または<span className="text-cyan-400 font-semibold">CALL＆ANSERプラン</span>の加入者のみご利用いただけます。
        </p>
        {/* プラン別条件の違い */}
        <div className="text-left space-y-3 max-w-sm mx-auto mt-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-1.5">
            <p className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4" /> BASICプラン（¥3,300/月）
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>配信者が通話料金を設定（30分・60分）</li>
              <li>申込者（視聴者側）が料金を支払う</li>
              <li>スケジュール制で事前に日時を決めて申し込み</li>
              <li>無料通話枠なし・有料のみ</li>
            </ul>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-1.5">
            <p className="font-bold text-sm text-cyan-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4" /> CALL＆ANSERプラン（¥6,600/月）
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>双方向有料通話（発信・受信どちらも課金設定可）</li>
              <li>有料インタビュー・推し活・求人面接などに活用</li>
              <li>配信者設定価格で申し込み、申込者が課金</li>
              <li>無料通話枠なし・有料のみ</li>
            </ul>
          </div>
        </div>
        <Link to="/plan-select">
          <Button className="bg-primary hover:bg-primary/90 gap-2 mt-2">
            プランを選ぶ
          </Button>
        </Link>
        <button onClick={() => navigate(-1)} className="block mx-auto text-xs text-muted-foreground hover:text-foreground">
          戻る
        </button>
      </div>
    );
  }

  // 通話受付オフガード
  if (!channel.call_enabled) {
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
    : { label: "BASICプラン", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: PhoneCall };
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
        <Link to={`/chat/${channelId}`}>
          <Button size="sm" variant="outline" className="text-xs">チャットへ</Button>
        </Link>
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
      <div className={`border rounded-xl p-3 mb-5 flex items-center gap-2 text-xs ${planBadge.color}`}>
        <PlanIcon className="w-4 h-4 shrink-0" />
        <span className="font-semibold">{planBadge.label}加入済み</span>
        <span className="text-muted-foreground">— 1対1ビデオ通話（有料のみ）</span>
      </div>

      {/* プラン別注意書き */}
      <div className={`rounded-xl p-3 mb-5 border text-xs space-y-1 ${userPlan === "call-anser" ? "bg-cyan-500/5 border-cyan-500/20" : "bg-blue-500/5 border-blue-500/20"}`}>
        {userPlan === "basic" && (
          <>
            <p className="font-semibold text-blue-400">BASICプランの通話ルール</p>
            <p className="text-muted-foreground">配信者が設定した料金を申込者（あなた）が支払います。承諾後に通話ボタンを押した時点で課金されます。</p>
          </>
        )}
        {userPlan === "call-anser" && (
          <>
            <p className="font-semibold text-cyan-400">CALL＆ANSERプランの通話ルール</p>
            <p className="text-muted-foreground">双方向有料通話プランです。配信者設定価格で申し込み、申込者（あなた）が料金を支払います。有料インタビュー・推し活・ビジネス活用に最適です。</p>
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
        {/* 通話時間 & 料金 */}
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
          <Label className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" /> 通話時間を選択
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { minutes: 30, price: channel.call_price_30min || 0 },
              { minutes: 60, price: channel.call_price_60min || 0 },
            ].map(({ minutes, price }) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setDurationMinutes(minutes)}
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${
                  durationMinutes === minutes
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/40"
                }`}
              >
                <span className={`font-bold ${durationMinutes === minutes ? "text-primary" : "text-foreground"}`}>{minutes}分</span>
                <span className={`text-sm font-black ${durationMinutes === minutes ? "text-primary" : "text-muted-foreground"}`}>
                  ¥{price.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">配信者設定価格</span>
              </button>
            ))}
          </div>

          {/* 料金内訳 */}
          <div className="bg-secondary rounded-lg p-3 text-xs space-y-1.5">
            <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> 料金内訳
            </p>
            <div className="flex justify-between text-muted-foreground">
              <span>通話料金 ({durationMinutes}分)</span><span>¥{callPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>プラットフォーム手数料 (10%)</span><span>-¥{Math.floor(callPrice * 0.10).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5 text-sm">
              <span>配信者受取額</span>
              <span className="text-primary">¥{Math.floor(callPrice * 0.90).toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              ※ あなた（申込者）が¥{callPrice.toLocaleString()}を支払います。通話開始時に課金されます。
            </p>
          </div>
        </div>

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
          disabled={submitting || existingRequests.length > 0 || callPrice === 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 gap-2 text-base font-bold"
        >
          {submitting ? "送信中..." : (
            <>
              <PhoneCall className="w-5 h-5" />
              ¥{callPrice.toLocaleString()} で通話リクエストを送る
            </>
          )}
        </Button>

        {callPrice === 0 && (
          <p className="text-xs text-center text-muted-foreground">配信者がまだ通話料金を設定していません</p>
        )}
      </form>
    </div>
  );
}