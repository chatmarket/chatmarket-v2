import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  PhoneCall, MessageCircle, Clock, Coins, Star, ArrowLeft, Shield
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CallProfilePage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [calling, setCalling] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel-call-profile", channelId],
    queryFn: () => base44.entities.Channel.filter({ id: channelId }).then(r => r[0]),
    enabled: !!channelId,
  });

  const handleStartCall = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (calling || !channel) return;
    setCalling(true);
    try {
      const newCall = await base44.entities.VideoCall.create({
        caller_email: user.email,
        caller_name: user.full_name || user.email,
        callee_email: channel.owner_email,
        callee_name: channel.name,
        callee_channel_id: channel.id,
        status: "pending",
        is_paid: false,
        price: 0,
        coin_price_per_15min: 150,
        duration_minutes: 15,
        message: "プロフィールページから通話リクエスト",
      });
      navigate(`/video-call/${newCall.id}`);
    } catch (err) {
      toast.error("通話リクエストの作成に失敗しました");
      setCalling(false);
    }
  };

  const handleChat = () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/chat/${channelId}`);
  };

  // 価格表示用ヘルパー
  const getPriceOptions = () => {
    if (!channel) return [];
    const options = [];
    [15, 30, 45, 60, 90, 120].forEach(min => {
      const price = channel[`call_price_${min}min`];
      if (price > 0) options.push({ min, price });
    });
    return options;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary/40 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">チャンネルが見つかりません</p>
        <Button variant="outline" onClick={() => navigate(-1)}>戻る</Button>
      </div>
    );
  }

  const priceOptions = getPriceOptions();
  const isOwnChannel = user?.email === channel.owner_email;

  return (
    <div className="min-h-screen bg-background">
      {/* ヒーローエリア */}
      <div className="relative h-52 bg-gradient-to-br from-primary/20 to-secondary overflow-hidden">
        {channel.banner_url ? (
          <img src={channel.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-black" />
        )}
        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-white text-sm font-semibold hover:bg-black/80 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
        {/* ライブバッジ */}
        {channel.call_enabled && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-green-500/90 backdrop-blur rounded-full px-3 py-1.5 text-white text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            今すぐ通話可能
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-12 pb-20">
        {/* アバター + チャンネル名 */}
        <div className="flex items-end gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-background shadow-xl shrink-0 bg-secondary">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl font-black text-primary">{channel.name?.[0]}</span>
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl font-black text-foreground">{channel.name}</h1>
            <p className="text-xs text-muted-foreground">{channel.description?.slice(0, 40)}</p>
          </div>
        </div>

        {/* ★ 待機メッセージ（最も目立つ中央表示） */}
        {channel.call_theme && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 mb-5 text-center"
            style={{
              background: 'linear-gradient(135deg, hsl(160 84% 39% / 0.15), hsl(160 84% 39% / 0.05))',
              border: '1.5px solid hsl(160 84% 39% / 0.4)',
              boxShadow: '0 0 24px hsl(160 84% 39% / 0.15)',
            }}
          >
            <p className="text-[10px] text-primary/70 font-bold tracking-widest uppercase mb-2">📣 ライバーからのメッセージ</p>
            <p className="text-lg font-black text-foreground leading-snug">{channel.call_theme}</p>
          </motion.div>
        )}

        {/* 詳細説明文 */}
        {channel.call_available_dates && (
          <div className="rounded-xl bg-card border border-border p-4 mb-4 space-y-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">📅 対応内容・スケジュール</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{channel.call_available_dates}</p>
          </div>
        )}

        {/* チャンネル説明 */}
        {channel.description && (
          <div className="rounded-xl bg-card border border-border p-4 mb-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">👤 プロフィール</p>
            <p className="text-sm text-foreground leading-relaxed">{channel.description}</p>
          </div>
        )}

        {/* 料金表 */}
        {priceOptions.length > 0 ? (
          <div className="rounded-xl bg-card border border-border p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-bold">通話料金</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {priceOptions.map(({ min, price }) => (
                <div key={min} className="bg-secondary rounded-lg p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">{min}分</p>
                  <p className="text-sm font-black text-primary">¥{price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 料金設定なし→デフォルト150コイン/15分を表示
          <div className="rounded-xl bg-card border border-border p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-bold">通話料金</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-secondary rounded-lg p-2.5 text-center flex-1">
                <p className="text-xs text-muted-foreground">15分あたり</p>
                <p className="text-base font-black text-primary">150コイン</p>
              </div>
              <div className="text-xs text-muted-foreground flex-1">
                <p>ライバー還元: <span className="text-green-400 font-bold">85%</span></p>
                <p>15分単位で課金</p>
              </div>
            </div>
          </div>
        )}

        {/* 安心・安全バッジ */}
        <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-green-400" />
          <span>安心・安全な通話。運営が監視。問題は通報できます。</span>
        </div>

        {/* アクションボタン */}
        {!isOwnChannel ? (
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartCall}
              disabled={calling || !channel.call_enabled}
              className="w-full rounded-2xl font-black text-base text-black flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{
                height: 60,
                background: channel.call_enabled
                  ? 'linear-gradient(135deg, #00ff9d, #00d4aa)'
                  : 'rgba(255,255,255,0.1)',
                boxShadow: channel.call_enabled ? '0 0 30px rgba(0,255,157,0.4)' : 'none',
              }}
            >
              <PhoneCall className="w-5 h-5" />
              {calling ? "接続中..." : channel.call_enabled ? "今すぐ通話を開始する" : "現在受付停止中"}
            </motion.button>
            <Button
              variant="outline"
              className="w-full h-12 gap-2 text-sm font-bold"
              onClick={handleChat}
            >
              <MessageCircle className="w-4 h-4" /> まずチャットで声をかける
            </Button>
          </div>
        ) : (
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-500 gap-2 font-bold"
            onClick={() => navigate('/call-waiting?autostart=1')}
          >
            <PhoneCall className="w-4 h-4" /> 通話待機画面へ
          </Button>
        )}
      </div>
    </div>
  );
}