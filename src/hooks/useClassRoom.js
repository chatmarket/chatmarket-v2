/**
 * useClassRoom — Amazon Chime SDK を用いた 1対9 グループビデオ通話
 *
 * WebRTC Mesh は廃止。Chime SDK がメディアサーバー（SFU相当）として動作するため
 * 10人規模でも端末負荷が大幅に低減する。
 *
 * ■ 講師（ホスト）: 720p HD / Chime Meeting 作成
 * ■ 生徒（ゲスト）: 360p / Chime Meeting 参加（Attendee追加）
 *
 * フロー:
 *  1. createChimeMeeting バックエンド関数を呼び出し Meeting/Attendee 情報を取得
 *  2. Chime JS SDK (amazon-chime-sdk-js) で MeetingSession を初期化
 *  3. ローカルストリームをバインド → リモート参加者の映像を受信
 *  4. DB ポーリングでミュート状態を同期
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Amazon Chime SDK JS はグローバル(CDN)またはnpmでロード済みを想定
// index.html に <script src="https://...amazon-chime-sdk-js.min.js"> を追記するか
// npm パッケージを利用する。ここではグローバル window.ChimeSDK を使用する形にする。
// ※ npm install amazon-chime-sdk-js が必要な場合は別途追加してください。

// ---- 画質制約（getUserMedia 用） ----
const HOST_VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
};
const GUEST_VIDEO_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 15, max: 20 },
};

/** ローカルカメラ＋マイクストリームを取得する */
export async function getClassRoomStream(isHost) {
  const videoConstraints = isHost ? HOST_VIDEO_CONSTRAINTS : GUEST_VIDEO_CONSTRAINTS;
  return navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48000,
    },
  });
}

/**
 * useClassRoom フック
 * @param {object} params
 * @param {string|null}  params.roomId     - ClassRoom エンティティ ID
 * @param {object|null}  params.user       - 認証済みユーザー
 * @param {boolean}      params.isHost     - 講師フラグ
 * @param {MediaStream|null} params.localStream - getUserMedia で取得したストリーム
 */
export function useClassRoom({ roomId, user, isHost, localStream }) {
  const [remoteStreams, setRemoteStreams] = useState({}); // { attendeeId: MediaStream }
  const [attendeeNames, setAttendeeNames] = useState({}); // { attendeeId: email }
  const [connectionStates, setConnectionStates] = useState({});
  const [room, setRoom] = useState(null);
  const [chimeMeetingInfo, setChimeMeetingInfo] = useState(null); // Chime Meeting オブジェクト
  const [chimeJoinError, setChimeJoinError] = useState(null);

  const sessionRef = useRef(null); // MeetingSession
  const observerRef = useRef(null);
  const joinedRef = useRef(false);

  // ---- Chime Meeting に参加する ----
  const joinChimeMeeting = useCallback(async () => {
    if (!roomId || !user || !localStream || joinedRef.current) return;

    try {
      const action = isHost ? "create" : "join";
      const res = await base44.functions.invoke("createChimeMeeting", {
        action,
        roomId,
        email: user.email,
      });

      const { meeting, attendee } = res.data;
      if (!meeting || !attendee) throw new Error("Chime meeting data missing");

      setChimeMeetingInfo(meeting);

      // Chime SDK が利用可能か確認（CDN / npm ロード済み想定）
      const SDK = window.ChimeSDK;
      if (!SDK) {
        throw new Error(
          "Amazon Chime SDK JS が読み込まれていません。" +
          "index.html に CDN スクリプトを追加するか、npm install amazon-chime-sdk-js を実行してください。"
        );
      }

      const {
        ConsoleLogger,
        LogLevel,
        DefaultDeviceController,
        DefaultMeetingSession,
        MeetingSessionConfiguration,
        VideoTileState,
      } = SDK;

      const logger = new ConsoleLogger("ClassRoom", LogLevel.WARN);
      const deviceController = new DefaultDeviceController(logger);
      const configuration = new MeetingSessionConfiguration(meeting, attendee);
      const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
      sessionRef.current = meetingSession;
      joinedRef.current = true;

      const audioVideo = meetingSession.audioVideo;

      // ---- マイク（オーディオ入力）----
      const audioInputDevices = await audioVideo.listAudioInputDevices();
      if (audioInputDevices.length > 0) {
        await audioVideo.startAudioInput(audioInputDevices[0].deviceId);
      }

      // ---- カメラ（ビデオ入力）----
      const videoInputDevices = await audioVideo.listVideoInputDevices();
      if (videoInputDevices.length > 0) {
        await audioVideo.startVideoInput(videoInputDevices[0].deviceId);
      }

      // ---- オーディオ出力（スピーカー）----
      const audioOutputDevices = await audioVideo.listAudioOutputDevices();
      if (audioOutputDevices.length > 0) {
        await audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
      }

      // ---- リモート映像タイルの監視 ----
      const observer = {
        videoTileDidUpdate: (tileState) => {
          if (!tileState.boundAttendeeId || tileState.isContent) return;
          if (tileState.localTile) return; // 自分自身はスキップ
          const attendeeId = tileState.boundAttendeeId;
          const externalUserId = tileState.boundExternalUserId || attendeeId;

          setAttendeeNames((prev) => ({ ...prev, [attendeeId]: externalUserId }));
          setConnectionStates((prev) => ({ ...prev, [attendeeId]: "connected" }));

          // video element にバインド
          const el = document.getElementById(`chime-video-${attendeeId}`);
          if (el) {
            audioVideo.bindVideoElement(tileState.tileId, el);
          }
        },
        videoTileWasRemoved: (tileId) => {
          setConnectionStates((prev) => {
            const next = { ...prev };
            // tileId → attendeeId のマッピングは SDK 内部にあるため connected のものを除外
            return next;
          });
        },
        attendeeIdPresenceDidChange: (attendeeId, present, externalUserId) => {
          if (!present) {
            setRemoteStreams((prev) => {
              const n = { ...prev }; delete n[attendeeId]; return n;
            });
            setConnectionStates((prev) => ({ ...prev, [attendeeId]: "disconnected" }));
          } else {
            setConnectionStates((prev) => ({ ...prev, [attendeeId]: "connected" }));
            setAttendeeNames((prev) => ({ ...prev, [attendeeId]: externalUserId || attendeeId }));
          }
        },
      };
      observerRef.current = observer;
      audioVideo.addObserver(observer);

      // ---- セッション開始 ----
      audioVideo.start();
      audioVideo.startLocalVideoTile();

      console.log("[ClassRoom] ✅ Chime Meeting joined:", meeting.MeetingId);

    } catch (err) {
      console.error("[ClassRoom] Chime join error:", err);
      setChimeJoinError(err.message);
    }
  }, [roomId, user, isHost, localStream]);

  // ---- 初回接続 ----
  useEffect(() => {
    if (!roomId || !user || !localStream) return;
    joinChimeMeeting();

    return () => {
      if (sessionRef.current) {
        const av = sessionRef.current.audioVideo;
        if (observerRef.current) av.removeObserver(observerRef.current);
        av.stopLocalVideoTile();
        av.stop();
        sessionRef.current = null;
        joinedRef.current = false;
      }
    };
  }, [roomId, user?.email, localStream]);

  // ---- DB ポーリング: ミュート状態 + room state 同期 ----
  useEffect(() => {
    if (!roomId || !user) return;

    const sync = async () => {
      const rooms = await base44.entities.ClassRoom.filter({ id: roomId }).catch(() => []);
      const rm = rooms[0];
      if (!rm) return;
      setRoom(rm);

      if (!isHost && sessionRef.current) {
        const muted = rm.is_muted_all || (rm.muted_participant_emails || []).includes(user.email);
        const av = sessionRef.current.audioVideo;
        if (muted) {
          av.realtimeMuteLocalAudio();
        } else {
          av.realtimeUnmuteLocalAudio();
        }
      }
    };

    const interval = setInterval(sync, 3000);
    sync();

    const unsub = base44.entities.ClassRoom.subscribe((ev) => {
      if (ev.id === roomId || ev.data?.id === roomId) sync();
    });

    return () => { clearInterval(interval); unsub(); };
  }, [roomId, user?.email, isHost]);

  // ---- 全員ミュート（ホスト専用）----
  const muteAll = useCallback(async () => {
    if (!roomId) return;
    await base44.entities.ClassRoom.update(roomId, { is_muted_all: true });
  }, [roomId]);

  const unmuteAll = useCallback(async () => {
    if (!roomId) return;
    await base44.entities.ClassRoom.update(roomId, { is_muted_all: false, muted_participant_emails: [] });
  }, [roomId]);

  // ---- 個別ミュート（ホスト専用）----
  const muteParticipant = useCallback(async (peerEmail) => {
    if (!roomId) return;
    const rooms = await base44.entities.ClassRoom.filter({ id: roomId });
    const rm = rooms[0];
    if (!rm) return;
    const list = rm.muted_participant_emails || [];
    if (!list.includes(peerEmail)) {
      await base44.entities.ClassRoom.update(roomId, {
        muted_participant_emails: [...list, peerEmail],
      });
    }
  }, [roomId]);

  const unmuteParticipant = useCallback(async (peerEmail) => {
    if (!roomId) return;
    const rooms = await base44.entities.ClassRoom.filter({ id: roomId });
    const rm = rooms[0];
    if (!rm) return;
    const list = (rm.muted_participant_emails || []).filter((e) => e !== peerEmail);
    await base44.entities.ClassRoom.update(roomId, { muted_participant_emails: list });
  }, [roomId]);

  return {
    room,
    remoteStreams,
    attendeeNames,
    connectionStates,
    chimeMeetingInfo,
    chimeJoinError,
    muteAll,
    unmuteAll,
    muteParticipant,
    unmuteParticipant,
  };
}