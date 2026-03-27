import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Phone, ArrowLeft, Clock, Coins, PhoneCall, PhoneOff, PhoneMissed } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const STATUS_MAP = {
  ended: { label: "終了", icon: Phone, color: "text-green-400 bg-green-500/10" },
  active: { label: "通話中", icon: PhoneCall, color: "text-blue-400 bg-blue-500/10" },
  pending: { label: "申請中", icon: Clock, color: "text-yellow-400 bg-yellow-500/10" },
  accepted: { label: "承諾済み", icon: PhoneCall, color: "text-cyan-400 bg-cyan-500/10" },
  declined: { label: "拒否", icon: PhoneOff, color: "text-red-400 bg-red-500/10" },
  cancelled: { label: "キャンセル", icon: PhoneMissed, color: "text-muted-foreground bg-secondary" },
  calling: { label: "発信中", icon: PhoneCall, color: "text-primary bg-primary/10" },
};

function getRevenueForCall(call, userEmail) {
  const isCallee = call.callee_email === userEmail;
  const price = call.price || 0;
  const yellCoin = call.yell_coin_amount || 0;
  if (!isCallee) return { gross: 0, net: 0, fee: 0, yellGross: 0, yellNet: 0 };
  const fee = Math.floor(price * 0.30);
  const yellFee = Math.floor(yellCoin * 0.30);
  return {
    gross: price,
    net: price - fee,
    fee,
    yellGross: yellCoin,
    yellNet: yellCoin - yellFee,
  };
}

export default function CallHistory() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  // 発信・着信両方取得
  const { data: callerCalls = [] } = useQuery({
    queryKey: ["call-history-caller", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ caller_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: calleeCalls = [] } = useQuery({
    queryKey: ["call-history-callee", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ callee_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  // マージして重複排除 & 日付降順
  const allCalls = useMemo(() => {
    const map = new Map();
    [...callerCalls, ...calleeCalls].forEach((c) => map.set(c.id, c));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date)
    );
  }, [callerCalls, calleeCalls]);

  // 集計
  const totalMinutes = allCalls
    .filter((c) => c.status === "ended")
    .reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

  const totalEarnings = allCalls
    .filter((c) => c.status === "ended" && c.callee_email === user?.email)
    .reduce((sum, c) => {
      const r = getRevenueForCall(c, user?.email);
      return sum + r.net + r.yellNet;
    }, 0);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/revenue" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" /> 通話履歴
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-foreground">{allCalls.length}</p>
          <p className="text-xs text-muted-foreground mt-1">通話数</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-blue-400">{totalMinutes}<span className="text-sm">分</span></p>
          <p className="text-xs text-muted-foreground mt-1">合計通話時間</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-primary">¥{totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">合計報酬</p>
        </div>
      </div>

      {/* Call List */}
      {allCalls.length === 0 ? (
        <div className="text-center py-20">
          <Phone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">通話履歴はまだありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCalls.map((call) => (
            <CallHistoryItem key={call.id} call={call} userEmail={user.email} />
          ))}
        </div>
      )}
    </div>
  );
}

function CallHistoryItem({ call, userEmail }) {
  const isCaller = call.caller_email === userEmail;
  const partnerName = isCaller
    ? call.callee_name || call.callee_email
    : call.caller_name || call.caller_email;

  const statusInfo = STATUS_MAP[call.status] || STATUS_MAP.ended;
  const StatusIcon = statusInfo.icon;

  const revenue = getRevenueForCall(call, userEmail);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
      {/* Status icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusInfo.color}`}>
        <StatusIcon className="w-4.5 h-4.5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{partnerName}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isCaller ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
            {isCaller ? "発信" : "着信"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{format(new Date(call.created_date), "yyyy/MM/dd HH:mm")}</span>
          {call.duration_minutes > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {call.duration_minutes}分
            </span>
          )}
          <span className={`text-[10px] font-semibold ${statusInfo.color.split(" ")[0]}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Revenue / Cost */}
      <div className="text-right shrink-0 space-y-0.5">
        {call.status === "ended" && (
          <>
            {revenue.gross > 0 && (
              <p className="text-sm font-bold text-primary">
                +¥{revenue.net.toLocaleString()}
                <span className="text-[10px] text-muted-foreground font-normal ml-1">(税前¥{revenue.gross.toLocaleString()})</span>
              </p>
            )}
            {revenue.yellGross > 0 && (
              <p className="text-xs font-bold text-yellow-400 flex items-center gap-0.5 justify-end">
                <Coins className="w-3 h-3" /> +¥{revenue.yellNet.toLocaleString()}
              </p>
            )}
            {isCaller && (call.price || 0) > 0 && (
              <p className="text-sm font-bold text-red-400">-¥{(call.price || 0).toLocaleString()}</p>
            )}
          </>
        )}
        {call.status === "pending" && (call.price || 0) > 0 && (
          <p className="text-xs text-muted-foreground">¥{(call.price || 0).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}