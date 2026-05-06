import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import QuickChargeModal from "./QuickChargeModal";

const KANTEI_COST = 15;

export default function InstantKanteiButton({ streamId, user, channelId, channelOwnerEmail }) {
  const [coinBalance, setCoinBalance] = useState(null);
  const [sending, setSending] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email })
      .then((w) => setCoinBalance(w[0]?.balance ?? 0))
      .catch(() => setCoinBalance(0));
  }, [user]);

  // チャージ完了後（?charged=1）残高を再取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("charged") === "1" && user) {
      base44.entities.YellCoinWallet.filter({ user_email: user.email })
        .then((w) => setCoinBalance(w[0]?.balance ?? 0))
        .catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  const handlePress = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (sending) return;

    // 残高不足 → 即座にクイックチャージ窓を開く
    if (coinBalance !== null && coinBalance < KANTEI_COST) {
      setShowCharge(true);
      return;
    }

    setSending(true);
    setBurst(true);
    setTimeout(() => setBurst(false), 600);

    try {
      // コインをライバーへ送付（SuperChatとして記録）
      await base44.entities.SuperChat.create({
        livestream_id: streamId,
        channel_id: channelId,
        user_email: user.email,
        user_name: user.full_name || user.email,
        amount: KANTEI_COST,
        message: "🔮 鑑定リクエスト",
        type: "kantei",
      });

      // ウォレット残高更新（楽観的）
      setCoinBalance((prev) => (prev !== null ? Math.max(0, prev - KANTEI_COST) : null));
      toast.success("🔮 鑑定リクエストを送りました！", { duration: 2500 });
    } catch (e) {
      toast.error("送信に失敗しました: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const needCharge = coinBalance !== null && coinBalance < KANTEI_COST;

  return (
    <>
      <button
        onClick={handlePress}
        disabled={sending}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "10px 18px",
          borderRadius: 20,
          border: "none",
          cursor: sending ? "not-allowed" : "pointer",
          opacity: sending ? 0.7 : 1,
          transition: "all 0.15s cubic-bezier(0.34,1.56,0.64,1)",
          transform: burst ? "scale(0.92)" : "scale(1)",
          // 残高不足ならアンバー、通常は紫グラデーション
          background: needCharge
            ? "linear-gradient(135deg, #d97706, #b45309)"
            : "linear-gradient(135deg, #7c3aed, #6d28d9)",
          boxShadow: needCharge
            ? "0 0 20px rgba(217,119,6,0.5), 0 4px 16px rgba(0,0,0,0.4)"
            : "0 0 20px rgba(124,58,237,0.6), 0 4px 16px rgba(0,0,0,0.4)",
          // パルスアニメーションはCSS keyframesで代替（インラインで animation を直書き）
          animation: "kanteiPulse 2s ease-in-out infinite",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))" }}>
          🔮
        </span>
        <span style={{ color: "white", fontWeight: 900, fontSize: 11, whiteSpace: "nowrap", lineHeight: 1 }}>
          {needCharge ? "チャージ▸鑑定" : "15コイン鑑定"}
        </span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 9, lineHeight: 1 }}>
          {needCharge ? `残高不足 (${coinBalance ?? "?"}枚)` : `残高 ${coinBalance ?? "?"}枚`}
        </span>

        {/* コイン不足バッジ */}
        {needCharge && (
          <span style={{
            position: "absolute", top: -6, right: -6,
            background: "#ef4444", color: "white",
            fontSize: 9, fontWeight: 900,
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #0a0a0f",
          }}>!</span>
        )}
      </button>

      {showCharge && (
        <QuickChargeModal
          neededCoins={KANTEI_COST - (coinBalance ?? 0)}
          onClose={() => setShowCharge(false)}
          onSuccess={() => {
            setShowCharge(false);
          }}
        />
      )}

      {/* kanteiPulse keyframes を style タグで注入 */}
      <style>{`
        @keyframes kanteiPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.6), 0 4px 16px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 35px rgba(124,58,237,0.9), 0 0 60px rgba(124,58,237,0.3), 0 4px 16px rgba(0,0,0,0.4); }
        }
      `}</style>
    </>
  );
}