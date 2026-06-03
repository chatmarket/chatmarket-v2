/**
 * GuestMainView — 生徒用メイン画面
 * ・講師映像を大画面表示（720p高画質）
 * ・他の生徒映像は下部カルーセル or 非表示切り替え
 */
import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, CameraOff, Users, PhoneOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ParticipantTile from "./ParticipantTile";

export default function GuestMainView({
  localStream,
  remoteStreams,       // { email: MediaStream }
  room,
  hostEmail,
  participants,        // [{ email, name }] — 自分以外の生徒
  connectionStates,
  myEmail,
  micOn, setMicOn,
  camOn, setCamOn,
  onLeave,
}) {
  const hostVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [showOthers, setShowOthers] = useState(true);
  const [carouselOffset, setCarouselOffset] = useState(0);

  // 講師映像セット
  useEffect(() => {
    const hostStream = remoteStreams[hostEmail];
    if (hostVideoRef.current && hostStream) {
      hostVideoRef.current.srcObject = hostStream;
      hostVideoRef.current.play().catch(() => {});
    }
  }, [remoteStreams, hostEmail]);

  // 自分の映像
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  const isMutedAll = room?.is_muted_all;
  const mutedList = room?.muted_participant_emails || [];
  const myIsMuted = isMutedAll || mutedList.includes(myEmail);

  // 生徒（自分以外）リスト
  const guestParticipants = participants.filter((p) => p.email !== myEmail && p.email !== hostEmail);
  const visibleGuests = guestParticipants.slice(carouselOffset, carouselOffset + 4);

  const hostConnected = !!remoteStreams[hostEmail];

  return (
    <div className="flex flex-col h-full bg-black" style={{ minHeight: 0 }}>
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hostConnected ? "bg-primary animate-pulse" : "bg-yellow-400"}`} />
          <span className="text-white font-bold text-sm">{room?.room_name || "クラス配信"}</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">生徒</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/50" />
          <span className="text-white/60 text-sm">{room?.current_participants_count || 0} 人</span>
        </div>
      </div>

      {/* ── メインエリア（講師映像）── */}
      <div className="flex-1 relative bg-gray-900 min-h-0 mx-2 mt-2 rounded-xl overflow-hidden">
        {hostConnected ? (
          <video
            ref={hostVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl">👨‍🏫</span>
            </div>
            <p className="text-white/50 text-sm">講師の接続を待っています...</p>
            <div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
          </div>
        )}

        {/* 講師ラベル */}
        <div className="absolute bottom-3 left-3 bg-black/70 rounded-lg px-2.5 py-1">
          <span className="text-white text-xs font-bold">👨‍🏫 講師</span>
        </div>

        {/* 720p バッジ */}
        {hostConnected && (
          <div className="absolute top-3 right-3 bg-black/60 rounded-full px-2 py-0.5">
            <span className="text-primary text-[10px] font-bold">HD 720p</span>
          </div>
        )}

        {/* 自分の映像（ワイプ）*/}
        <div className="absolute bottom-3 right-3 w-20 h-14 rounded-lg overflow-hidden border border-white/30 bg-gray-800">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <CameraOff className="w-4 h-4 text-white/30" />
            </div>
          )}
          <span className="absolute bottom-0.5 inset-x-0 text-center text-[9px] text-white/70 bg-black/50">あなた</span>
          {myIsMuted && (
            <div className="absolute top-0.5 right-0.5 bg-red-600 rounded-full p-0.5">
              <MicOff className="w-2 h-2 text-white" />
            </div>
          )}
        </div>

        {/* 全員ミュート通知 */}
        {myIsMuted && (
          <div className="absolute top-3 left-3 bg-red-900/90 border border-red-500/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <MicOff className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-300 text-xs font-bold">
              {isMutedAll ? "講師が全員ミュートしました" : "講師があなたをミュートしました"}
            </span>
          </div>
        )}
      </div>

      {/* ── 他の生徒カルーセル ── */}
      {showOthers && guestParticipants.length > 0 && (
        <div className="px-2 py-2 shrink-0">
          <div className="flex items-center gap-2">
            {carouselOffset > 0 && (
              <button onClick={() => setCarouselOffset(Math.max(0, carouselOffset - 4))}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
            )}
            <div className="flex gap-1.5 flex-1 overflow-hidden">
              {visibleGuests.map((p) => (
                <div key={p.email} className="w-20 shrink-0">
                  <ParticipantTile
                    participant={p}
                    stream={remoteStreams[p.email]}
                    isMuted={mutedList.includes(p.email) || isMutedAll}
                    isHost={false}
                    connectionState={connectionStates[p.email]}
                    compact
                  />
                </div>
              ))}
            </div>
            {carouselOffset + 4 < guestParticipants.length && (
              <button onClick={() => setCarouselOffset(carouselOffset + 4)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── コントロールバー ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/80 shrink-0">
        <div className="flex items-center gap-2">
          {/* マイク */}
          <button
            onClick={() => !myIsMuted && setMicOn(!micOn)}
            disabled={myIsMuted}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              myIsMuted
                ? "bg-gray-700 cursor-not-allowed"
                : micOn
                ? "bg-white/10 hover:bg-white/20"
                : "bg-red-600"
            }`}
          >
            {(myIsMuted || !micOn) ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>

          {/* カメラ */}
          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600"
            }`}
          >
            {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
          </button>

          {/* 他の生徒表示切替 */}
          <button
            onClick={() => setShowOthers(!showOthers)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              showOthers ? "bg-primary/20 ring-2 ring-primary/40" : "bg-white/10 hover:bg-white/20"
            }`}
            title="他の参加者を表示/非表示"
          >
            <Users className={`w-5 h-5 ${showOthers ? "text-primary" : "text-white/60"}`} />
          </button>
        </div>

        {/* 退出 */}
        <button
          onClick={onLeave}
          className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition-all"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}