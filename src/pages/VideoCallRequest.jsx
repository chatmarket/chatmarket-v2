import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PhoneCall, ArrowLeft, Coins, Info, AlertCircle, Clock, CheckCircle, Gift
} from "lucide-react";
import { toast } from "sonner";

// CALL&ANSWERプラン: 1日30分×4回無料
const FREE_CALL_DAILY_LIMIT = 4;
const FREE_CALL_MINUTES = 30;

function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

export default function VideoCallRequest() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [message, setMessage] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(1000);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  useEffect(() => {
    if (!channelId) return;
    base44.entities.Channel.filter({ id: channelId }).then((res) => setChannel(res[0]));
  }, [channelId]);

  // 今日の無料通話回数を取得
  const { data: todayFreeCalls = [] } = useQuery({
    queryKey: ["today-free-calls", user?.email],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const calls = await base44.entities.VideoCall.filter({
        caller_email: user.email,
        is_free_call: true,
      });
      return calls.filter((c) => new Date(c.created_date) >= todayStart);
    },
    enabled: !!user,
  });

  // 既存の申し込み（pending/accepted）を確認
  const { data: existingRequests = [] } = useQuery({
    queryKey: ["call-requests", user?.email, channel?.owner_email],
    queryFn: () => base44.entities.VideoCall.filter({
      caller_email: user.email,
      callee_email: channel.owner_email,
      status: "pending",
    }),
    enabled: !!user && !!channel,
  });

  const freeCallsUsed = todayFreeCalls.length;
  const freeCallsRemaining = Math.max(0, FREE_CALL_DAILY_LIMIT - freeCallsUsed);
  const canUseFreeCall = freeCallsRemaining > 0 && !isPaid;

  const threadId = user && channel ? makeThreadId(user.email, channel.owner_email) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !channel) return;

    if (existingRequests.length > 0) {
      toast.error("すでに通話申し込みが送信済みです。相手の返答をお待ちください。");
      return;
    }

    setSubmitting(true);

    const callData = {
      caller_email: user.email,
      caller_name: user.full_name || user.email,
      callee_email: channel.owner_email,
      callee_name: channel.name,
      callee_channel_id: channelId,
      status: "pending",
      is_free_call: !isPaid && canUseFreeCall,
      is_paid: isPaid,
      price: isPaid ? price : 0,
      duration_minutes: durationMinutes,
      message: message.trim(),
      thread_id: threadId,
    };

    const newCall = await base44.entities.VideoCall.create(callData);

    // チャットに通知メッセージを送る
    if (threadId) {
      const callType = isPaid
        ? `💰 有料通話申し込み（¥${price.toLocaleString()} / ${durationMinutes}分）`
        : `📞 無料通話申し込み（${durationMinutes}分）`;
      await base44.entities.DirectChat.create({
        from_email: user.email,
        from_name: user.full_name || user.email,
        to_channel_owner_email: channel.owner_email,
        to_channel_id: channel.id,
        to_channel_name: channel.name,
        content: `【通話リクエスト】${callType}${message ? `\nメッセージ: ${message}` : ""}`,
        yell_coin: 0,
        thread_id: threadId,
      });
    }

    setSubmitting(false);
    toast.success("通話リクエストを送りました！相手の承諾をお待ちください。");
    navigate(`/chat/${channelId}`);
  };

  if (!channel) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-primary" /> 1対1ビデオ通話を申し込む
        </h1>
      </div>

      {/* 相手情報 */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          {channel.avatar_url
            ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg font-bold text-muted-foreground">{channel.name?.[0]}</span>}
        </div>
        <div>
          <p className="font-bold">{channel.name}</p>
          <p className="text-xs text-muted-foreground">通話相手</p>
        </div>
        <Link to={`/chat/${channelId}`} className="ml-auto">
          <Button size="sm" variant="outline" className="text-xs gap-1">
            チャットへ戻る
          </Button>
        </Link>
      </div>

      {/* CALL&ANSWERプラン 無料枠表示 */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 space-y-2">
        <p className="font-semibold text-sm flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-primary" /> CALL&ANSWERプラン 無料通話枠
        </p>
        <div className="flex items-center gap-3">
          {Array.from({ length: FREE_CALL_DAILY_LIMIT }).map((_, i) => (
            <div key={i} className={`flex flex-col items-center gap-1`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                i < freeCallsUsed
                  ? "bg-muted border-muted text-muted-foreground"
                  : "bg-primary/10 border-primary text-primary"
              }`}>
                {i < freeCallsUsed
                  ? <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  : <PhoneCall className="w-4 h-4" />}
              </div>
              <span className="text-[10px] text-muted-foreground">{FREE_CALL_MINUTES}分</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          本日の無料通話: <span className="text-primary font-bold">{freeCallsUsed}/{FREE_CALL_DAILY_LIMIT}回</span> 使用済み
          （残り <span className="text-primary font-bold">{freeCallsRemaining}回</span>）
        </p>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
          <span>CALL&ANSWERプラン加入者は1日{FREE_CALL_MINUTES}分×{FREE_CALL_DAILY_LIMIT}回まで無料で通話できます。</span>
        </div>
      </div>

      {/* 既存リクエストがある場合 */}
      {existingRequests.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">通話リクエスト送信済み</p>
            <p className="text-xs text-muted-foreground mt-0.5">相手の承諾をお待ちください。承諾後、通話が開始されます。</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 有料/無料切替 */}
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-yellow-400" /> 有料通話にする
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPaid ? "あなたが相手に料金を支払います" : freeCallsRemaining > 0 ? "無料枠を使用します" : "無料枠を使い切りました"}
              </p>
            </div>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>

          {!isPaid && freeCallsRemaining === 0 && (
            <div className="flex items-start gap-1.5 text-xs bg-destructive/10 border border-destructive/30 rounded-lg p-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-destructive" />
              <span>本日の無料通話枠を使い切りました。有料通話に切り替えるか、明日また試してください。</span>
            </div>
          )}

          {isPaid && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label>通話時間</Label>
                <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map((min) => (
                      <SelectItem key={min} value={String(min)}>
                        {min >= 60 ? `${Math.floor(min / 60)}時間${min % 60 > 0 ? `${min % 60}分` : ""}` : `${min}分`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>支払い金額（円）</Label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={price}
                  onChange={(e) => setPrice(Math.max(100, parseInt(e.target.value) || 100))}
                  className="bg-secondary border-0"
                />
                <p className="text-xs text-muted-foreground">
                  あなた（発信者）から相手（受信者）へ支払われます。最低¥100から設定可能です。
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>通話料金</span>
                  <span>¥{price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>プラットフォーム手数料（10%）</span>
                  <span>-¥{Math.floor(price * 0.10).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1">
                  <span>相手への受取額</span>
                  <span className="text-primary">¥{Math.floor(price * 0.90).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {!isPaid && (
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" /> 通話時間
              </Label>
              <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                <SelectTrigger className="bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30].map((min) => (
                    <SelectItem key={min} value={String(min)}>{min}分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">無料通話は最大{FREE_CALL_MINUTES}分です</p>
            </div>
          )}
        </div>

        {/* メッセージ */}
        <div className="space-y-1.5">
          <Label>申し込みメッセージ（任意）</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="通話の目的や希望日時などをご記入ください（200文字以内）"
            className="bg-secondary border-0 resize-none"
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/200</p>
        </div>

        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary rounded-lg p-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
          <span>通話リクエストはチャットで相手に通知されます。相手が承諾すると通話が開始されます。事前にチャットで日時をすり合わせることをお勧めします。</span>
        </div>

        <Button
          type="submit"
          disabled={submitting || existingRequests.length > 0 || (!isPaid && freeCallsRemaining === 0)}
          className="w-full h-12 bg-primary hover:bg-primary/90 gap-2 text-base"
        >
          {submitting ? (
            "送信中..."
          ) : (
            <>
              <PhoneCall className="w-5 h-5" />
              {isPaid ? `¥${price.toLocaleString()} で通話リクエストを送る` : "無料通話リクエストを送る"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}