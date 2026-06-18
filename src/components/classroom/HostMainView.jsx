/**
 * HostMainView — 講師用メイン画面
 * ・自分 or 画面共有を大画面表示
 * ・生徒9人を3×3グリッドで右サイドに表示
 * ・コントロールバー（全員ミュート、画面共有、終了）
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic, MicOff, Camera, CameraOff, Monitor, Users,
  PhoneOff, Volume2, VolumeX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ParticipantTile from "./ParticipantTile";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function HostMainView({
  localStream,
  remoteStreams,       // { email: MediaStream }
  room,
  participants,        // [{ email, name }]
  connectionStates,
  micOn, setMicOn,
  camOn, setCamOn,
  onMuteAll,
  onUnmuteAll,
  onMuteParticipant,
  onUnmuteParticipant,
  onEndClass,
}) {
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [showParticipants, setShowParticipants] = useState(true);

  // ── ドラッグ＆ドロップ用並び順管理 ──
  const storageKey = room?.id ? `classroom_tile_order_${room.id}` : null;

  const getOrderedParticipants = useCallback(() => {
    if (!storageKey) return participants;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      // 保存済み順序に合わせて並べ、新規参加者は末尾に追加
      const emailSet = new Set(participants.map(p => p.email));
      const ordered = saved
        .filter(email => emailSet.has(email))
        .map(email => participants.find(p => p.email === email));
      const newOnes = participants.filter(p => !saved.includes(p.email));
      return [...ordered, ...newOnes];
    } catch {
      return participants;
    }
  }, [participants, storageKey]);

  const [orderedParticipants, setOrderedParticipants] = useState(() => getOrderedParticipants());

  useEffect(() => {
    setOrderedParticipants(getOrderedParticipants());
  }, [getOrderedParticipants]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(orderedParticipants);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderedParticipants(items);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(items.map(p => p.email)));
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = isScreenSharing && screenStream ? screenStream : localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isScreenSharing, screenStream]);

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setScreenStream(stream);
      setIsScreenSharing(true);
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
      };
      toast.success("画面共有を開始しました");
    } catch (e) {
      toast.error("画面共有を開始できませんでした");
    }
  };

  const isMutedAll = room?.is_muted_all;
  const mutedList = room?.muted_participant_emails || [];

  return (
    <div className="flex flex-col h-full bg-black" style={{ minHeight: 0 }}>
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-white font-bold text-sm">{room?.room_name || "クラス配信"}</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
            クラス
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/50" />
          <span className="text-white/60 text-sm">{room?.current_participants_count || 0} / 10</span>
        </div>
      </div>

      {/* ── メインコンテンツ ── */}
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        {/* 左: メインビデオ（自分 / 画面共有）*/}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-gray-900 rounded-xl overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            {!camOn && !isScreenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <CameraOff className="w-16 h-16 text-white/20" />
              </div>
            )}
            {/* 共有中バッジ */}
            {isScreenSharing && (
              <div className="absolute top-3 left-3 bg-blue-600/90 rounded-full px-3 py-1 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-bold">画面共有中</span>
              </div>
            )}
            {/* 講師ラベル */}
            <div className="absolute bottom-3 left-3 bg-black/70 rounded-lg px-2.5 py-1">
              <span className="text-white text-xs font-bold">👨‍🏫 あなた（講師）</span>
            </div>
            {/* ミュートインジケーター */}
            {!micOn && (
              <div className="absolute top-3 right-3 bg-red-600/90 rounded-full p-1.5">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* 右: 生徒グリッド（3×3）— 講師はドラッグで並び替え可 */}
        {showParticipants && (
          <div className="w-64 flex flex-col gap-1.5 shrink-0 overflow-y-auto">
            <p className="text-white/50 text-xs font-bold px-1">
              生徒 ({participants.length})
              <span className="ml-1 text-white/30 font-normal text-[10px]">ドラッグで並替</span>
            </p>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="participant-grid" direction="horizontal">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-3 gap-1 flex-1"
                  >
                    {Array.from({ length: 9 }).map((_, i) => {
                      const p = orderedParticipants[i];
                      if (!p) {
                        return (
                          <div key={`empty-${i}`} className="aspect-video bg-gray-800/50 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                            <span className="text-white/20 text-xs">空き</span>
                          </div>
                        );
                      }
                      const isMuted = isMutedAll || mutedList.includes(p.email);
                      return (
                        <Draggable key={p.email} draggableId={p.email} index={i}>
                          {(drag, snapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              style={{
                                ...drag.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.85 : 1,
                              }}
                            >
                              <ParticipantTile
                                participant={p}
                                stream={remoteStreams[p.email]}
                                isMuted={isMuted}
                                isHost={true}
                                connectionState={connectionStates[p.email]}
                                onMute={onMuteParticipant}
                                onUnmute={onUnmuteParticipant}
                                compact
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>

      {/* ── コントロールバー ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/80 shrink-0">
        <div className="flex items-center gap-2">
          {/* マイク */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600"
            }`}
            title={micOn ? "マイクOFF" : "マイクON"}
          >
            {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
          </button>

          {/* カメラ */}
          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600"
            }`}
            title={camOn ? "カメラOFF" : "カメラON"}
          >
            {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
          </button>

          {/* 画面共有 */}
          <button
            onClick={handleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing ? "bg-blue-600 ring-2 ring-blue-400" : "bg-white/10 hover:bg-white/20"
            }`}
            title={isScreenSharing ? "共有を停止" : "画面共有"}
          >
            <Monitor className="w-5 h-5 text-white" />
          </button>

          {/* 生徒パネル切り替え */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              showParticipants ? "bg-primary/20 ring-2 ring-primary/40" : "bg-white/10 hover:bg-white/20"
            }`}
            title="参加者パネル"
          >
            <Users className={`w-5 h-5 ${showParticipants ? "text-primary" : "text-white"}`} />
          </button>
        </div>

        {/* 中央: 全員ミュートボタン */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isMutedAll ? "default" : "outline"}
            onClick={isMutedAll ? onUnmuteAll : onMuteAll}
            className={`gap-1.5 ${isMutedAll ? "bg-red-600 hover:bg-red-500 text-white border-red-500" : "border-white/20 text-white hover:bg-white/10"}`}
          >
            {isMutedAll ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isMutedAll ? "全員ミュート解除" : "全員ミュート"}
          </Button>
        </div>

        {/* 通話終了 */}
        <button
          onClick={onEndClass}
          className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition-all"
          title="クラスを終了"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}