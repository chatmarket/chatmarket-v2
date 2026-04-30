import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  PhoneCall, MessageCircle, ArrowLeft, Shield, Coins,
  ChevronDown, ChevronUp, Star, Clock, Edit3, Save, X, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CallScheduleCalendar from "@/components/call/CallScheduleCalendar";
import CallScheduleEditor from "@/components/call/CallScheduleEditor";
import AppointmentRequestModal from "@/components/appointment/AppointmentRequestModal";
import AppointmentDashboard from "@/components/appointment/AppointmentDashboard";

export default function CallProfilePage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [calling, setCalling] = useState(false);
  const [user, setUser] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // 編集用ローカルステート
  const [editDesc, setEditDesc] = useState("");
  const [editSchedule, setEditSchedule] = useState([]);
  const [editTheme, setEditTheme] = useState("");
  const [editAvailableDates, setEditAvailableDates] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel-call-profile", channelId],
    queryFn: () => base44.entities.Channel.filter({ id: channelId }).then(r => r[0]),
    enabled: !!channelId,
  });

  // 編集開始時に現在値をセット
  useEffect(() => {
    if (channel && isEditing) {
      setEditDesc(channel.description || "");
      setEditSchedule(channel.call_schedule || []);
      setEditTheme(channel.call_theme || "");
      setEditAvailableDates(channel.call_available_dates || "");
    }
  }, [channel, isEditing]);

  const handleSave = async () => {
    if (!channel) return;
    setSaving(true);
    try {
      await base44.entities.Channel.update(channel.id, {
        description: editDesc,
        call_schedule: editSchedule,
        call_theme: editTheme,
        call_available_dates: editAvailableDates,
      });
      queryClient.invalidateQueries({ queryKey: ["channel-call-profile", channelId] });
      setIsEditing(false);
      toast.success("プロフィールを保存しました");
    } catch (err) {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

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
  const desc = isEditing ? editDesc : (channel.description || "");
  const DESC_LIMIT = 200;
  const isLongDesc = desc.length > DESC_LIMIT;

  // 今日・明日のキー
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const tomorrowKey = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ══════════════════════════════════
          1. カバー画像エリア（最上部）
      ══════════════════════════════════ */}
      <div className="relative w-full" style={{ height: 240 }}>
        {channel.banner_url ? (
          <img src={channel.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full"
            style={{ background: "linear-gradient(135deg, hsl(120 5% 8%), hsl(160 40% 12%), hsl(120 5% 6%))" }}
          >
            {/* デコレーション */}
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(160 84% 39% / 0.4) 0%, transparent 60%), radial-gradient(circle at 80% 30%, hsl(160 60% 30% / 0.3) 0%, transparent 50%)" }}
            />
          </div>
        )}
        {/* グラデーションオーバーレイ（下へのフェード） */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, hsl(120 5% 4%) 100%)" }} />

        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-3 py-2 text-white text-sm font-semibold hover:bg-black/80 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>

        {/* 通話可能バッジ */}
        {channel.call_enabled && (
          <motion.div
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full px-3 py-2 text-white text-xs font-black backdrop-blur-md"
            style={{ background: "rgba(0,200,100,0.85)", boxShadow: "0 0 16px rgba(0,255,157,0.5)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            今すぐ通話可能
          </motion.div>
        )}

        {/* 編集ボタン（自分のチャンネルのみ） */}
        {isOwnChannel && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 text-white text-xs font-bold hover:bg-black/90 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" /> プロフィール編集
          </button>
        )}
      </div>

      {/* ══════════════════════════════════
          2. アイコン + 名前エリア
      ══════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-end gap-4 -mt-14 mb-5 relative z-10">
          {/* アバター（待機中はキラキラONLINEエフェクト） */}
          <div className="relative shrink-0">
            {/* 外側パルスリング（待機中のみ） */}
            {channel.call_enabled && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ border: "3px solid hsl(160 84% 39%)", zIndex: 0 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ scale: [1, 1.32, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                  style={{ border: "2px solid hsl(160 84% 39%)", zIndex: 0 }}
                />
              </>
            )}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-2xl overflow-hidden bg-secondary relative z-10"
              style={{
                border: "3px solid hsl(160 84% 39%)",
                boxShadow: channel.call_enabled
                  ? "0 0 32px hsl(160 84% 39% / 0.7), 0 8px 32px rgba(0,0,0,0.6)"
                  : "0 0 24px hsl(160 84% 39% / 0.4), 0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {channel.avatar_url ? (
                <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(160 84% 39% / 0.3), hsl(160 84% 39% / 0.1))" }}>
                  <span className="text-4xl font-black text-primary">{channel.name?.[0]}</span>
                </div>
              )}
            </motion.div>
            {/* ONLINE / OFFLINE バッジ */}
            {channel.call_enabled ? (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #00ff9d, #00c97a)", color: "#000", boxShadow: "0 0 10px rgba(0,255,157,0.8)" }}
              >
                ✦ ONLINE
              </motion.div>
            ) : (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap bg-muted text-muted-foreground">
                OFFLINE
              </div>
            )}
          </div>

          <div className="pb-1 flex-1">
            <h1 className="text-2xl font-black text-foreground leading-tight">{channel.name}</h1>
            {channel.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {channel.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════
            3. 待機メッセージ（キャッチコピー）
        ══════════════════════════════════ */}
        {isEditing ? (
          <div className="mb-5 space-y-2">
            <p className="text-xs text-primary font-bold">📣 待機メッセージ（キャッチコピー）</p>
            <input
              type="text"
              value={editTheme}
              onChange={e => setEditTheme(e.target.value)}
              maxLength={100}
              placeholder="例: あなたのビジネスの悩みを解決します！"
              className="w-full bg-secondary border border-primary/40 rounded-xl px-4 py-3 text-base font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground text-right">{editTheme.length}/100</p>
          </div>
        ) : channel.call_theme ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl px-5 py-4 text-center"
            style={{
              background: "linear-gradient(135deg, hsl(160 84% 39% / 0.12), hsl(160 84% 39% / 0.04))",
              border: "1.5px solid hsl(160 84% 39% / 0.4)",
              boxShadow: "0 0 32px hsl(160 84% 39% / 0.12)",
            }}
          >
            <p className="text-[10px] text-primary/60 font-bold tracking-widest uppercase mb-2">📣 ライバーからのメッセージ</p>
            <p className="text-xl font-black text-foreground leading-snug">{channel.call_theme}</p>
          </motion.div>
        ) : null}

        {/* ══════════════════════════════════
            4. プロフィール説明文（最大1000文字）
        ══════════════════════════════════ */}
        <div className="mb-5 rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">👤 プロフィール</p>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={10}
                  placeholder="あなたの経歴・得意分野・通話でできること・実績などを詳しく書いてください（最大1000文字）"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 leading-relaxed resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right">{editDesc.length}/1000</p>
              </div>
            ) : desc ? (
              <>
                <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap ${!descExpanded && isLongDesc ? "line-clamp-6" : ""}`}>
                  {desc}
                </p>
                {isLongDesc && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-2 flex items-center gap-1 text-xs text-primary font-bold hover:opacity-80 transition-opacity"
                  >
                    {descExpanded ? <><ChevronUp className="w-3.5 h-3.5" />閉じる</> : <><ChevronDown className="w-3.5 h-3.5" />続きを読む</>}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">プロフィールを設定してください</p>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════
            5. 対応内容・スケジュールメモ
        ══════════════════════════════════ */}
        {(isEditing || channel.call_available_dates) && (
          <div className="mb-5 rounded-2xl bg-card border border-border p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">📋 対応内容・備考</p>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editAvailableDates}
                  onChange={e => setEditAvailableDates(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={5}
                  placeholder="対応可能な内容・時間帯・注意事項などを自由に記入（最大1000文字）"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 leading-relaxed resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right">{editAvailableDates.length}/1000</p>
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{channel.call_available_dates}</p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════
            6. スケジュールカレンダー
        ══════════════════════════════════ */}
        <div className="mb-5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">📅 待機スケジュール</p>
          {isEditing ? (
            <CallScheduleEditor
              schedule={editSchedule}
              onChange={setEditSchedule}
            />
          ) : (
            <CallScheduleCalendar schedule={channel.call_schedule || []} />
          )}
        </div>

        {/* ══════════════════════════════════
            編集中の保存/キャンセルボタン
        ══════════════════════════════════ */}
        {isEditing && (
          <div className="flex gap-3 mb-5">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              <X className="w-4 h-4" /> キャンセル
            </Button>
            <Button
              className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存する"}
            </Button>
          </div>
        )}

        {/* ══════════════════════════════════
            7. 料金表
        ══════════════════════════════════ */}
        <div className="mb-5 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-bold">通話料金</p>
          </div>
          {priceOptions.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {priceOptions.map(({ min, price }) => (
                <div key={min} className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{min}分</p>
                  <p className="text-base font-black text-primary">¥{price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="bg-secondary rounded-xl p-3 text-center flex-1">
                <p className="text-xs text-muted-foreground">15分あたり</p>
                <p className="text-lg font-black text-primary">150コイン</p>
              </div>
              <div className="text-xs text-muted-foreground flex-1 space-y-1">
                <p>ライバー還元: <span className="text-green-400 font-bold">85%</span></p>
                <p>15分単位で課金</p>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════
            8. 予約ダッシュボード（自分 or 相手の予約一覧）
        ══════════════════════════════════ */}
        {user && <AppointmentDashboard channel={channel} user={user} />}

        {/* ══════════════════════════════════
            9. 安心・安全バッジ
        ══════════════════════════════════ */}
        <div className="flex items-center gap-2 mb-8 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>安心・安全な通話。運営が監視。問題は通報できます。</span>
        </div>

      </div>

      {/* ══════════════════════════════════
          固定フッターCTA（常時追従）
      ══════════════════════════════════ */}
      {!isEditing && !isOwnChannel && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 backdrop-blur-xl"
          style={{ background: "linear-gradient(to top, hsl(120 5% 4%) 60%, hsl(120 5% 4% / 0.85) 100%)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="max-w-2xl mx-auto space-y-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              animate={channel.call_enabled ? {
                boxShadow: [
                  "0 0 16px rgba(0,255,157,0.4)",
                  "0 0 36px rgba(0,255,157,0.8)",
                  "0 0 16px rgba(0,255,157,0.4)",
                ],
              } : {}}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              onClick={handleStartCall}
              disabled={calling || !channel.call_enabled}
              className="w-full rounded-2xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-40 transition-all"
              style={{
                height: 64,
                background: channel.call_enabled
                  ? "linear-gradient(135deg, #00ff9d, #00c97a)"
                  : "rgba(255,255,255,0.08)",
                color: channel.call_enabled ? "#000" : "#666",
              }}
            >
              <PhoneCall className="w-6 h-6" />
              {calling ? "接続中..." : channel.call_enabled ? "今すぐ通話を開始する" : "現在受付停止中"}
            </motion.button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-9 gap-1.5 text-xs font-bold"
                onClick={() => {
                  if (!user) { base44.auth.redirectToLogin(); return; }
                  setShowRequestModal(true);
                }}
              >
                <CalendarDays className="w-3.5 h-3.5 text-primary" /> 予約リクエスト
              </Button>
              <Button
                variant="ghost"
                className="h-9 gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                onClick={handleChat}
              >
                <MessageCircle className="w-3.5 h-3.5" /> チャット
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 予約リクエストモーダル */}
      {showRequestModal && user && (
        <AppointmentRequestModal
          channel={channel}
          user={user}
          onClose={() => setShowRequestModal(false)}
          onSent={() => queryClient.invalidateQueries({ queryKey: ["appointments"] })}
        />
      )}

      {/* 自分のチャンネル固定フッター */}
      {!isEditing && isOwnChannel && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 backdrop-blur-xl"
          style={{ background: "linear-gradient(to top, hsl(120 5% 4%) 60%, hsl(120 5% 4% / 0.85) 100%)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full h-14 bg-green-600 hover:bg-green-500 gap-2 font-bold text-base"
              onClick={() => navigate("/call-waiting?autostart=1")}
            >
              <PhoneCall className="w-5 h-5" /> 通話待機画面へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}