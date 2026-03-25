import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, Info, Coins, Phone, Banknote, AlertCircle } from "lucide-react";
import YellCoinWalletPanel from "../components/yell/YellCoinWalletPanel";

export default function RevenueManagement() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channels = [] } = useQuery({
    queryKey: ["my-channels", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }),
    enabled: !!user,
  });
  const channel = channels[0];

  const { data: videos = [] } = useQuery({
    queryKey: ["my-videos", channel?.id],
    queryFn: () => base44.entities.Video.filter({ channel_id: channel.id }),
    enabled: !!channel,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ["my-streams", channel?.id],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channel.id }),
    enabled: !!channel,
  });

  const { data: superChats = [] } = useQuery({
    queryKey: ["my-superchats-rev"],
    queryFn: async () => {
      const all = [];
      for (const sid of streams.map((s) => s.id)) {
        const scs = await base44.entities.SuperChat.filter({ livestream_id: sid });
        all.push(...scs);
      }
      return all;
    },
    enabled: streams.length > 0,
  });

  const { data: videoCalls = [] } = useQuery({
    queryKey: ["my-video-calls", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ callee_email: user.email, status: "ended" }),
    enabled: !!user,
  });

  // 収益計算
  const getProgressiveRate = (rev) => {
    if (rev > 20000000) return 0.95;
    if (rev > 19500000) return 0.94;
    if (rev > 18000000) return 0.93;
    if (rev > 16500000) return 0.92;
    if (rev > 15000000) return 0.91;
    if (rev > 12000000) return 0.90;
    if (rev > 9000000) return 0.89;
    if (rev > 6000000) return 0.88;
    if (rev > 3000000) return 0.87;
    if (rev > 2000000) return 0.86;
    return 0.85;
  };

  const totalSuperChatRevenue = superChats.reduce((sum, sc) => sum + (sc.amount || 0), 0);
  const yellCoinFee = Math.floor(totalSuperChatRevenue * 0.10);
  const yellCoinNet = totalSuperChatRevenue - yellCoinFee;

  const videoPurchaseGross = videos.reduce((sum, v) => sum + (v.price || 0) * (v.view_count || 0), 0);
  const videoFee = Math.floor(videoPurchaseGross * 0.15);
  const videoPurchaseNet = videoPurchaseGross - videoFee;

  // 生配信 = liveまたはscheduled（終了前のチケット収益）
  const liveStreamGross = streams.filter(s => s.status !== "ended").reduce((sum, s) => sum + (s.price || 0) * (s.viewer_count || 0), 0);
  const liveStreamFee = Math.floor(liveStreamGross * 0.15);
  const liveStreamNet = liveStreamGross - liveStreamFee;

  // アーカイブ販売 = 終了済み配信（ended）の有料販売分
  const archiveGross = streams.filter(s => s.status === "ended" && (s.price || 0) > 0).reduce((sum, s) => sum + (s.price || 0) * (s.viewer_count || 0), 0);
  const archiveFee = Math.floor(archiveGross * 0.15);
  const archiveNet = archiveGross - archiveFee;

  // ビデオ通話 = 通話料金 (price) + エールコイン (yell_coin_amount) を分離
  const videoCallPriceGross = videoCalls.reduce((sum, c) => sum + (c.price || 0), 0);
  const videoCallPriceFee = Math.floor(videoCallPriceGross * 0.10);
  const videoCallPriceNet = videoCallPriceGross - videoCallPriceFee;

  const videoCallYellGross = videoCalls.reduce((sum, c) => sum + (c.yell_coin_amount || 0), 0);
  const videoCallYellFee = Math.floor(videoCallYellGross * 0.10);
  const videoCallYellNet = videoCallYellGross - videoCallYellFee;

  const monthlyGrossRevenue = videoPurchaseNet + liveStreamNet + archiveNet + yellCoinNet + videoCallPriceNet + videoCallYellNet;
  const currentRate = getProgressiveRate(monthlyGrossRevenue);
  const totalRevenue = Math.floor(monthlyGrossRevenue * currentRate);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-yellow-400" /> 収益管理
      </h1>

      {/* 出金可能収益サマリ */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6 space-y-4">
        <p className="font-semibold flex items-center gap-1.5 text-sm">
          <Info className="w-4 h-4 text-primary" /> 出金可能収益（プログレッシブインセンティブ適用）
        </p>

        <div className="space-y-1.5 text-sm border-b border-border pb-3">
          <div className="flex justify-between text-muted-foreground">
            <span>投稿動画</span>
            <span>¥{videoPurchaseNet.toLocaleString()} <span className="text-xs">(手数料 ¥{videoFee.toLocaleString()})</span></span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>１対多数生配信</span>
            <span>¥{liveStreamNet.toLocaleString()} <span className="text-xs">(手数料 ¥{liveStreamFee.toLocaleString()})</span></span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>アーカイブ販売</span>
            <span>¥{archiveNet.toLocaleString()} <span className="text-xs">(手数料 ¥{archiveFee.toLocaleString()})</span></span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>エールコイン</span>
            <span>¥{yellCoinNet.toLocaleString()} <span className="text-xs">(手数料 ¥{yellCoinFee.toLocaleString()})</span></span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>ビデオ通話</span>
            <span>¥{videoCallPriceNet.toLocaleString()} <span className="text-xs">(手数料 ¥{videoCallPriceFee.toLocaleString()})</span></span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>ビデオ通話エールコイン</span>
            <span>¥{videoCallYellNet.toLocaleString()} <span className="text-xs">(手数料 ¥{videoCallYellFee.toLocaleString()})</span></span>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>小計（手数料控除後）</span>
            <span className="text-foreground font-semibold">¥{monthlyGrossRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>適用還元率</span>
            <span className="text-primary font-semibold">{(currentRate * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
            <span>振込予定額</span>
            <span className="text-primary">¥{totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
            <Banknote className="w-4 h-4" /> 出金申請する（月2回まで）
          </Button>
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary rounded-lg p-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
            <p>出金申請後、口座への振り込みには数日かかる場合があります。</p>
          </div>
        </div>
      </div>

      {/* チャージコイン注意 */}
      <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20 mb-6 text-xs space-y-2">
        <p className="font-semibold text-sm flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-yellow-400" /> チャージしたエールコイン（出金不可）
        </p>
        <div className="flex items-start gap-1.5 text-muted-foreground bg-secondary/50 rounded-lg p-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
          <p>ご自身でチャージしたエールコインは出金できません。アプリ内での送付にのみ使用できます。</p>
        </div>
      </div>

      {/* 詳細タブ */}
      <Tabs defaultValue="calls">
        <TabsList className="bg-secondary mb-4">
          <TabsTrigger value="calls" className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> 通話収益
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-yellow-400" /> エールコイン
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-yellow-400">{videoCalls.length}</p>
                <p className="text-xs text-muted-foreground mt-1">通話回数</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-primary">¥{(videoCallPriceNet + videoCallYellNet).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">手数料控除後（合計）</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-xl font-black text-blue-400">¥{videoCallPriceNet.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">通話料金（手数料控除後）</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-xl font-black text-yellow-400">¥{videoCallYellNet.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">エールコイン（手数料控除後）</p>
              </div>
            </div>

            {videoCalls.length > 0 ? (
              <div className="space-y-2">
                {videoCalls.map((call) => (
                  <div key={call.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{call.caller_name || call.caller_email}</p>
                      <p className="text-xs text-muted-foreground">{new Date(call.created_date).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {(call.price || 0) > 0 && (
                        <p className="text-blue-400 font-bold text-sm">通話 ¥{(call.price || 0).toLocaleString()}</p>
                      )}
                      {(call.yell_coin_amount || 0) > 0 && (
                        <p className="text-yellow-400 font-bold text-sm">エール ¥{(call.yell_coin_amount || 0).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">まだビデオ通話の収益はありません</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="wallet">
          <YellCoinWalletPanel user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}