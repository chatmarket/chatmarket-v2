import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Scan, User, Ticket, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function TicketVerify() {
  const [user, setUser] = useState(null);
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const handleVerify = async (payload) => {
    const raw = payload.trim();
    if (!raw) return;
    setLoading(true);
    setResult(null);

    const res = await base44.functions.invoke("verifyTicket", { qrPayload: raw, staffEmail: user?.email });
    setResult(res.data);
    setQrInput("");
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleVerify(qrInput);
  };

  if (!user) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">スタッフ専用ページです。ログインしてください。</p>
        <Button className="mt-4" onClick={() => base44.auth.redirectToLogin()}>ログイン</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <Scan className="w-10 h-10 text-primary mx-auto mb-2" />
        <h1 className="text-xl font-bold">チケット検証</h1>
        <p className="text-xs text-muted-foreground mt-1">スタッフ専用 — QRスキャン後に自動入力されます</p>
      </div>

      {/* Input */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-muted-foreground">QRコードをスキャンするか、コードを直接貼り付けてください</p>
        <Input
          ref={inputRef}
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="QRコードデータを入力..."
          className="bg-secondary border-0 font-mono text-sm"
          autoFocus
        />
        <Button
          onClick={() => handleVerify(qrInput)}
          disabled={!qrInput || loading}
          className="w-full"
        >
          {loading ? "検証中..." : "チケットを検証"}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border-2 p-5 space-y-3 ${
          result.valid
            ? "bg-green-500/10 border-green-500/50"
            : result.error === "already_used"
            ? "bg-orange-500/10 border-orange-500/50"
            : "bg-red-500/10 border-red-500/50"
        }`}>
          <div className="flex items-center gap-3">
            {result.valid ? (
              <CheckCircle2 className="w-10 h-10 text-green-400 shrink-0" />
            ) : result.error === "already_used" ? (
              <AlertTriangle className="w-10 h-10 text-orange-400 shrink-0" />
            ) : (
              <XCircle className="w-10 h-10 text-red-400 shrink-0" />
            )}
            <div>
              <p className={`font-black text-lg ${
                result.valid ? "text-green-400" : result.error === "already_used" ? "text-orange-400" : "text-red-400"
              }`}>
                {result.valid ? "✅ 入場OK" : result.error === "already_used" ? "⚠️ 使用済み" : "❌ 無効"}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.valid ? "チケットは有効です" :
                 result.error === "already_used" ? "このチケットは既に使用されています" :
                 result.error === "expired_token" ? "QRコードの有効期限切れ（30秒以内に再スキャン）" :
                 result.error === "owner_mismatch" ? "所有者不一致（転売チケットの可能性）" :
                 result.error === "not_found" ? "チケットが見つかりません" : "不明なエラー"}
              </p>
            </div>
          </div>

          {result.ticket && (
            <div className="bg-background/50 rounded-xl p-3 space-y-1.5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Ticket className="w-4 h-4 text-primary" />{result.ticket.event_name}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground text-xs">
                <User className="w-3.5 h-3.5" />{result.ticket.owner_name} ({result.ticket.owner_email})
              </p>
              {result.ticket.seat_info && (
                <p className="text-xs text-foreground/70">座席: {result.ticket.seat_info}</p>
              )}
              {result.ticket.used_at && (
                <p className="text-xs text-orange-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  入場済み: {format(new Date(result.ticket.used_at), "yyyy/MM/dd HH:mm")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}