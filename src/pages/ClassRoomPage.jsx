/**
 * ClassRoomPage — Amazon Chime SDK クラス配信（1対9）
 * ルート: /classroom/:roomId
 *
 * ■ 講師（ホスト）: Meeting作成 → HostMainView
 * ■ 生徒（ゲスト）: チケット購入済み確認 → Meeting参加 → GuestMainView
 *
 * 【認可ガード】
 *   生徒は SchoolTicket エンティティに session_id === roomId かつ
 *   status === "active" のレコードが存在しなければ入室不可。
 *   未購入の場合は /school-tickets へリダイレクト。
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // 生徒チケット未購入フラグ
  const [ticketRequired, setTicketRequired] = useState(false);
  const [micOn, setMicOnState] = useState(true);
  const [camOn, setCamOnState] = useState(true);

  const setMicOn = (v) => {
    setMicOnState(v);
    localStream?.getAudioTracks().forEach((t) => { t.enabled = v; });
    // Chime SDK にも反映（sessionRef は useClassRoom 内部で管理）
  };
  const setCamOn = (v) => {
    setCamOnState(v);
    localStream?.getVideoTracks().forEach((t) => { t.enabled = v; });
  };

  // ---- 初期化 + 認可チェック ----
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

      // ---- 生徒: チケット購入済みチェック ----
      if (!hostFlag) {
        // 招待コード検証
        if (rm.invite_code && inviteCode !== rm.invite_code) {
          toast.error("招待コードが正しくありません");
          navigate(-1);
          return;
        }

        // SchoolTicket: session_id === roomId && student_email === user.email && status === "active"
        const tickets = await base44.entities.SchoolTicket.filter({
          session_id: roomId,
          student_email: u.email,
          status: "active",
        });

        if (!tickets || tickets.length === 0) {
          // 未購入 → ガード表示（リダイレクトではなくページ内で案内）
          setTicketRequired(true);
          setLoading(false);
          return;
        }
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

  // ---- Chime フック ----
  const {
    room: liveRoom,
    remoteStreams,
    attendeeNames,
    connectionStates,
    chimeJoinError,
    muteAll,
    unmuteAll,
    muteParticipant,
    unmuteParticipant,
  } = useClassRoom({
    roomId: loading || ticketRequired ? null : roomId,
    user,
    isHost,
    localStream,
  });

  useEffect(() => {
    if (liveRoom) setRoom(liveRoom);
  }, [liveRoom]);

  // Chimeエラートースト
  useEffect(() => {
    if (chimeJoinError) toast.error(`Chime接続エラー: ${chimeJoinError}`);
  }, [chimeJoinError]);

  // ---- クラス終了 / 退出 ----
  const handleEndClass = useCallback(async () => {
    if (!window.confirm(isHost ? "クラスを終了しますか？" : "クラスから退出しますか？")) return;

    const participants = room?.participants || [];
    const updated = participants.filter((p) => p.email !== user?.email);
    const updateData = { participants: updated, current_participants_count: updated.length };

    if (isHost) {
      // Chime Meeting を削除
      await base44.functions.invoke("createChimeMeeting", { action: "delete", roomId }).catch(() => {});
    } else {
      await base44.entities.ClassRoom.update(roomId, updateData).catch(() => {});
    }

    localStream?.getTracks().forEach((t) => t.stop());
    toast.success(isHost ? "クラスを終了しました" : "クラスから退出しました");
    navigate(-1);
  }, [isHost, room, user, localStream, roomId, navigate]);

  useEffect(() => {
    return () => { localStream?.getTracks().forEach((t) => t.stop()); };
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

  // ---- 生徒: チケット未購入ガード ----
  if (ticketRequired) {
    return (
      <div className="bg-black flex items-center justify-center p-6" style={{ height: "100dvh" }}>
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-white font-bold text-xl">チケットが必要です</p>
          <p className="text-white/60 text-sm leading-relaxed">
            このクラスに参加するには、事前にレッスンチケットを購入する必要があります。
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate("/school-tickets")}
              className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              <ShoppingCart className="w-4 h-4" />
              チケットを購入する
            </Button>
            <button
              onClick={() => navigate(-1)}
              className="text-white/40 text-sm hover:text-white/60 underline"
            >
              戻る
            </button>
          </div>
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