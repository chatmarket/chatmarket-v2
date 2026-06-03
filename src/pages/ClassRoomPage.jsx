/**
 * ClassRoomPage — クラス配信（1対9 グループビデオ通話）
 * ルート: /classroom/:roomId
 *
 * ■ 講師（ホスト）: 720p, HostMainView
 * ■ 生徒（ゲスト）: 360p, GuestMainView
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useClassRoom, getClassRoomStream } from "@/hooks/useClassRoom";
import HostMainView from "@/components/classroom/HostMainView";
import GuestMainView from "@/components/classroom/GuestMainView";

export default function ClassRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");

  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState(null);
  const [micOn, setMicOnState] = useState(true);
  const [camOn, setCamOnState] = useState(true);

  // マイク/カメラ切り替えをトラックに反映
  const setMicOn = (v) => {
    setMicOnState(v);
    localStream?.getAudioTracks().forEach((t) => { t.enabled = v; });
  };
  const setCamOn = (v) => {
    setCamOnState(v);
    localStream?.getVideoTracks().forEach((t) => { t.enabled = v; });
  };

  // ---- 初期化 ----
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      // 認証確認
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const u = await base44.auth.me();
      if (!mounted) return;
      setUser(u);

      // ルーム取得
      const rooms = await base44.entities.ClassRoom.filter({ id: roomId });
      const rm = rooms[0];
      if (!rm) { toast.error("ルームが見つかりません"); navigate(-1); return; }
      if (!mounted) return;

      setRoom(rm);
      const hostFlag = rm.host_email === u.email;
      setIsHost(hostFlag);

      // 招待コード検証（生徒のみ）
      if (!hostFlag && rm.invite_code && inviteCode !== rm.invite_code) {
        toast.error("招待コードが正しくありません");
        navigate(-1);
        return;
      }

      // メディアストリーム取得
      try {
        const stream = await getClassRoomStream(hostFlag);
        if (!mounted) return;
        setLocalStream(stream);
      } catch (e) {
        setMediaError("カメラ・マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
        setLoading(false);
        return;
      }

      // 参加者として登録
      const currentParticipants = rm.participants || [];
      const alreadyIn = currentParticipants.some((p) => p.email === u.email);
      if (!alreadyIn) {
        const newParticipant = {
          email: u.email,
          name: u.full_name || u.email,
          joined_at: new Date().toISOString(),
          role: hostFlag ? "host" : "guest",
        };
        const updated = [...currentParticipants, newParticipant];
        await base44.entities.ClassRoom.update(roomId, {
          participants: updated,
          current_participants_count: updated.length,
          status: "active",
        });
      }

      setLoading(false);
    };

    init().catch((e) => {
      console.error("[ClassRoom] Init error:", e);
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [roomId, inviteCode]);

  // ---- WebRTC フック ----
  const {
    room: liveRoom,
    remoteStreams,
    connectionStates,
    muteAll,
    unmuteAll,
    muteParticipant,
    unmuteParticipant,
  } = useClassRoom({
    roomId: loading ? null : roomId,
    user,
    isHost,
    localStream,
  });

  // liveRoom が更新されたら state に反映
  useEffect(() => {
    if (liveRoom) setRoom(liveRoom);
  }, [liveRoom]);

  // ---- クラス終了 ----
  const handleEndClass = useCallback(async () => {
    if (!window.confirm(isHost ? "クラスを終了しますか？全員が退出します。" : "クラスから退出しますか？")) return;

    // 参加者リストから自分を削除
    const participants = room?.participants || [];
    const updated = participants.filter((p) => p.email !== user?.email);
    const updateData = {
      participants: updated,
      current_participants_count: updated.length,
    };
    if (isHost) {
      updateData.status = "ended";
      updateData.ended_at = new Date().toISOString();
    }
    await base44.entities.ClassRoom.update(roomId, updateData).catch(() => {});

    // ストリーム停止
    localStream?.getTracks().forEach((t) => t.stop());
    toast.success(isHost ? "クラスを終了しました" : "クラスから退出しました");
    navigate(-1);
  }, [isHost, room, user, localStream, roomId, navigate]);

  // ---- ページ離脱時クリーンアップ ----
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  // ---- ロード中 ----
  if (loading) {
    return (
      <div className="bg-black flex items-center justify-center" style={{ height: "100dvh" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-white font-bold">クラスルームに接続中...</p>
        </div>
      </div>
    );
  }

  // ---- メディアエラー ----
  if (mediaError) {
    return (
      <div className="bg-black flex items-center justify-center p-6" style={{ height: "100dvh" }}>
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-red-400 font-bold text-lg">⚠️ カメラ・マイクエラー</p>
          <p className="text-white/60 text-sm">{mediaError}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const participants = room?.participants || [];
  const hostEmail = room?.host_email;

  return (
    <div className="bg-black" style={{ height: "100dvh", overflow: "hidden" }}>
      {isHost ? (
        <HostMainView
          localStream={localStream}
          remoteStreams={remoteStreams}
          room={room}
          participants={participants.filter((p) => p.email !== hostEmail)}
          connectionStates={connectionStates}
          micOn={micOn}
          setMicOn={setMicOn}
          camOn={camOn}
          setCamOn={setCamOn}
          onMuteAll={muteAll}
          onUnmuteAll={unmuteAll}
          onMuteParticipant={muteParticipant}
          onUnmuteParticipant={unmuteParticipant}
          onEndClass={handleEndClass}
        />
      ) : (
        <GuestMainView
          localStream={localStream}
          remoteStreams={remoteStreams}
          room={room}
          hostEmail={hostEmail}
          participants={participants}
          connectionStates={connectionStates}
          myEmail={user?.email}
          micOn={micOn}
          setMicOn={setMicOn}
          camOn={camOn}
          setCamOn={setCamOn}
          onLeave={handleEndClass}
        />
      )}
    </div>
  );
}