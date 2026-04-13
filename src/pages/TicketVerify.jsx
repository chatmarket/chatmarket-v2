import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Scan, User, Ticket, AlertTriangle, Clock, Camera, CameraOff } from "lucide-react";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";

export default function TicketVerify() {
  const [user, setUser] = useState(null);
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef(null);
  const inputRef = useRef(null);
  const scannerDivId = "qr-scanner-region";

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    setCameraActive(true);
    // Wait for DOM
    await new Promise((r) => setTimeout(r, 100));
    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        handleVerify(decodedText);
        stopCamera();
      },
      () => {}
    ).catch((err) => {
      setCameraError("カメラの起動に失敗しました。カメラの許可を確認してください。");
      setCameraActive(false);
    });
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const handleVerify = async (payload) => {
    const raw = (payload || qrInput).trim();
    if (!raw || loading) return;
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke("verifyTicket", { qrPayload: raw, staffEmail: user?.email });
    setResult(res.data);
    setQrInput("");
    setLoading(false);
    inputRef.current?.focus();
  };

  if (!user) {
    return (
      <div className="text-center py-24 px-4">
        <Scan className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">スタッフ専用ページです。ログインしてください。</p>
        <Button onClick={() => base44.auth.redirectToLogin()}>ログイン</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div className="text-center">
        <Scan className="w-10 h-10 text-primary mx-auto mb-2" />
        <h1 className="text-xl font-bold">チケット検証</h1>
        <p className="text-xs text-muted-foreground mt-1">スタッフ専用 — カメラまたは手動入力</p>
      </div>

      {/* Camera toggle */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
        {!cameraActive ? (
          <Button onClick={startCamera} className="w-full gap-2">
            <Camera className="w-4 h-4" /> カメラでQRスキャン
          </Button>
        ) : (
          <Button onClick={stopCamera} variant="secondary" className="w-full gap-2">
            <CameraOff className="w-4 h-4" /> カメラを停止
          </Button>
        )}

        {/* Camera viewfinder */}
        <div
          id={scannerDivId}
          className={`rounded-xl overflow-hidden bg-black ${cameraActive ? "block" : "hidden"}`}
          style={{ minHeight: cameraActive ? 280 : 0 }}
        />

        {cameraError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />{cameraError}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />手動入力<div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="QRコードデータを貼り付け..."
            className="bg-secondary border-0 font-mono text-xs flex-1"
          />
          <Button onClick={() => handleVerify()} disabled={!qrInput || loading} className="shrink-0">
            {loading ? "…" : "検証"}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-4 text-muted-foreground text-sm animate-pulse">検証中...</div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className={`rounded-2xl border-2 p-5 space-y-3 ${
          result.valid
            ? "bg-green-500/10 border-green-500/50"
            : result.error === "already_used"
            ? "bg-orange-500/10 border-orange-500/50"
            : "bg-red-500/10 border-red-500/50"
        }`}>
          <div className="flex items-center gap-3">
            {result.valid ? (
              <CheckCircle2 className="w-12 h-12 text-green-400 shrink-0" />
            ) : result.error === "already_used" ? (
              <AlertTriangle className="w-12 h-12 text-orange-400 shrink-0" />
            ) : (
              <XCircle className="w-12 h-12 text-red-400 shrink-0" />
            )}
            <div>
              <p className={`font-black text-2xl ${
                result.valid ? "text-green-400"
                : result.error === "already_used" ? "text-orange-400"
                : "text-red-400"
              }`}>
                {result.valid ? "✅ 入場OK"
                : result.error === "already_used" ? "⚠️ 使用済み"
                : "❌ 無効"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.valid ? "チケットは有効です。入場を許可してください。"
                : result.error === "already_used" ? "このチケットは既に使用されています"
                : result.error === "expired_token" ? "QRの有効期限切れ（再スキャンを依頼）"
                : result.error === "owner_mismatch" ? "所有者不一致（転売チケットの疑い）"
                : result.error === "not_found" ? "チケットが見つかりません"
                : "不明なエラー"}
              </p>
            </div>
          </div>

          {result.ticket && (
            <div className="bg-background/60 rounded-xl p-3 space-y-1 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Ticket className="w-4 h-4 text-primary shrink-0" />
                {result.ticket.event_name}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground text-xs">
                <User className="w-3.5 h-3.5 shrink-0" />
                {result.ticket.owner_name} （{result.ticket.owner_email}）
              </p>
              {result.ticket.seat_info && (
                <p className="text-xs text-foreground/70">座席: {result.ticket.seat_info}</p>
              )}
              {result.ticket.ticket_type && (
                <p className="text-xs text-foreground/70">種別: {
                  { vip: "VIP", fanclub: "ファンクラブ", general: "一般" }[result.ticket.ticket_type]
                }</p>
              )}
              {result.ticket.used_at && (
                <p className="text-xs text-orange-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  入場済み: {format(new Date(result.ticket.used_at), "yyyy/MM/dd HH:mm")}
                </p>
              )}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => { setResult(null); inputRef.current?.focus(); }}
          >
            次のチケットをスキャン
          </Button>
        </div>
      )}
    </div>
  );
}