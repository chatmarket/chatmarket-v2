import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, PhoneOff, Coins, Shield, Flag, Mic, MicOff, Camera, CameraOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const YELL_AMOUNTS = [
  { value: 200, color: "green", label: "¥200" },
  { value: 500, color: "green", label: "¥500" },
  { value: 1000, color: "yellow", label: "¥1,000" },
  { value: 3000, color: "orange", label: "¥3,000" },
  { value: 5000, color: "orange", label: "¥5,000" },
  { value: 10000, color: "red", label: "¥10,000" },
];

const colorStyles = {
  green: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  yellow: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
  orange: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  red: "bg-red-500/20 border-red-500/50 text-red-400",
};

export default function VideoCallPage() {
  const { callId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const localVideoRef = useRef(null);
  const [user, setUser] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showYellModal, setShowYellModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedYell, setSelectedYell] = useState(null);
  const [yellSending, setYellSending] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: call } = useQuery({
    queryKey: ["videocall", callId],
    queryFn: async () => {
      const calls = await base44.entities.VideoCall.filter({ id: callId });
      return calls[0];
    },
    refetchInterval: 3000,
  });

  // Start local camera
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }).catch(() => {});
    return () => localStream?.getTracks().forEach((t) => t.stop());
  }, []);

  // Toggle camera/mic
  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn, localStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, localStream]);

  const handleEndCall = async () => {
    if (call) await base44.entities.VideoCall.update(call.id, { status: "ended" });
    localStream?.getTracks().forEach((t) => t.stop());
    navigate(-1);
  };

  const handleSendYell = async () => {
    if (!selectedYell || !call) return;
    setYellSending(true);
    await base44.entities.VideoCall.update(call.id, {
      yell_coin_amount: (call.yell_coin_amount || 0) + selectedYell,
    });
    await base44.entities.SuperChat.create({
      amount: selectedYell,
      message: "📹 ビデオ通話中のエールコイン",
      livestream_id: call.id,
      user_name: user?.full_name || "匿名",
      user_email: user?.email,
      color: YELL_AMOUNTS.find((a) => a.value === selectedYell)?.color || "green",
    });
    setYellSending(false);
    setShowYellModal(false);
    setSelectedYell(null);
    toast.success(`¥${selectedYell.toLocaleString()} のエールコインを送りました！`);
  };

  const handleBlock = async () => {
    if (!user || !call) return;
    const targetEmail = call.caller_email === user.email ? call.callee_email : call.caller_email;
    await base44.entities.BlockReport.create({
      type: "block",
      from_email: user.email,
      target_email: targetEmail,
    });
    setShowBlockModal(false);
    toast.success("ブロックしました");
    handleEndCall();
  };

  const handleReport = async () => {
    if (!user || !call || !reportReason) return;
    const targetEmail = call.caller_email === user.email ? call.callee_email : call.caller_email;
    await base44.entities.BlockReport.create({
      type: "report",
      from_email: user.email,
      target_email: targetEmail,
      reason: reportReason,
    });
    setShowReportModal(false);
    setReportReason("");
    toast.success("通報しました。確認いたします。");
  };

  const otherName = call
    ? user?.email === call.caller_email ? call.callee_name : call.caller_name
    : "相手";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{otherName} との通話</h2>
            {call?.status === "active" && (
              <p className="text-xs text-primary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                通話中
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowReportModal(true)} className="text-muted-foreground hover:text-red-400 gap-1 text-xs">
              <Flag className="w-3.5 h-3.5" /> 通報
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowBlockModal(true)} className="text-muted-foreground hover:text-orange-400 gap-1 text-xs">
              <Shield className="w-3.5 h-3.5" /> ブロック
            </Button>
          </div>
        </div>

        {/* Video area */}
        <div className="relative aspect-video bg-card rounded-2xl overflow-hidden border border-border/50 mb-4">
          {/* Remote video placeholder */}
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-background">
            <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mb-3">
              <span className="text-3xl font-bold text-primary">{otherName?.[0] || "?"}</span>
            </div>
            <p className="text-muted-foreground text-sm">{otherName}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">P2P接続中...</p>
          </div>

          {/* Local video (PiP) */}
          <div className="absolute bottom-4 right-4 w-36 h-24 rounded-xl overflow-hidden border-2 border-border bg-black">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                <CameraOff className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Yell coin notification area */}
          {call?.yell_coin_amount > 0 && (
            <div className="absolute top-4 left-4 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-3 py-1 flex items-center gap-1.5 text-yellow-400 text-xs font-bold">
              <Coins className="w-3.5 h-3.5" />
              ¥{call.yell_coin_amount?.toLocaleString()} エールコイン
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            size="icon"
            variant={micOn ? "secondary" : "destructive"}
            onClick={() => setMicOn(!micOn)}
            className="w-12 h-12 rounded-full"
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            size="icon"
            variant={camOn ? "secondary" : "destructive"}
            onClick={() => setCamOn(!camOn)}
            className="w-12 h-12 rounded-full"
          >
            {camOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          <Button
            onClick={() => setShowYellModal(true)}
            className="gap-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 h-12 px-5 rounded-full"
            variant="ghost"
          >
            <Coins className="w-5 h-5" />
            エールコイン
          </Button>

          <Button
            size="icon"
            onClick={handleEndCall}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Yell Coin Modal */}
      <Dialog open={showYellModal} onOpenChange={setShowYellModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              エールコインを送る
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {YELL_AMOUNTS.map((amt) => (
                <button
                  key={amt.value}
                  onClick={() => setSelectedYell(amt.value)}
                  className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${
                    selectedYell === amt.value ? colorStyles[amt.color] : "border-border bg-secondary hover:border-primary/30"
                  }`}
                >
                  {amt.label}
                </button>
              ))}
            </div>
            <Button
              onClick={handleSendYell}
              disabled={!selectedYell || yellSending}
              className="w-full bg-yellow-500/80 hover:bg-yellow-500 text-black font-bold"
            >
              {yellSending ? "送信中..." : `¥${selectedYell?.toLocaleString() || 0} を送る`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <Shield className="w-5 h-5" />
              ブロックしますか？
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            このユーザーをブロックすると、相手からのコンタクトを受け取れなくなります。通話も終了します。
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowBlockModal(false)}>キャンセル</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleBlock}>ブロック</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              通報する
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">通報理由を選択してください</p>
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger className="bg-secondary border-0">
                <SelectValue placeholder="理由を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="スパム・迷惑行為">スパム・迷惑行為</SelectItem>
                <SelectItem value="不適切なコンテンツ">不適切なコンテンツ</SelectItem>
                <SelectItem value="ハラスメント">ハラスメント</SelectItem>
                <SelectItem value="詐欺・偽り">詐欺・偽り</SelectItem>
                <SelectItem value="その他">その他</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>キャンセル</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleReport} disabled={!reportReason}>通報する</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}