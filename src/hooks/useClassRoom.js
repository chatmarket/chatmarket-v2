/**
 * useClassRoom — 1対9 グループビデオ通話 (WebRTC Mesh + Simulcast)
 *
 * ■ 講師（ホスト）: 720p / ~1.5Mbps 固定送信
 * ■ 生徒（ゲスト）: 240p〜360p / ~300kbps 低画質送信
 * ■ 接続方式: Full-Mesh P2P (SFUサーバー不要でインフラコスト最小)
 *   ※ 最大10接続なので Mesh でも十分管理可能
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// ---- 画質プリセット ----
const HOST_VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
};
const GUEST_VIDEO_CONSTRAINTS = {
  width: { ideal: 480 },
  height: { ideal: 360 },
  frameRate: { ideal: 15, max: 20 },
};

// ---- サイマルキャスト エンコーディング設定 ----
const HOST_ENCODINGS = [
  { rid: "h", maxBitrate: 1_500_000, scaleResolutionDownBy: 1 },
];
const GUEST_ENCODINGS = [
  { rid: "l", maxBitrate: 300_000, scaleResolutionDownBy: 3 },
];

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useClassRoom({ roomId, user, isHost, localStream }) {
  const [remoteStreams, setRemoteStreams] = useState({}); // { email: MediaStream }
  const [room, setRoom] = useState(null);
  const [connectionStates, setConnectionStates] = useState({}); // { email: string }
  const peerConnections = useRef({}); // { email: RTCPeerConnection }
  const pendingCandidates = useRef({}); // { email: [candidate] }
  const processedSignals = useRef(new Set());
  const isHostRef = useRef(isHost);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // ---- PeerConnection 作成 ----
  const createPeerConnection = useCallback((peerEmail) => {
    if (peerConnections.current[peerEmail]) return peerConnections.current[peerEmail];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnections.current[peerEmail] = pc;

    // ローカルストリームのトラックを追加（サイマルキャスト制御）
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];

      if (videoTrack) {
        const encodings = isHostRef.current ? HOST_ENCODINGS : GUEST_ENCODINGS;
        const sender = pc.addTrack(videoTrack, localStream);
        // サイマルキャストパラメータ設定
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = encodings;
          } else {
            params.encodings = params.encodings.map((enc, i) => ({
              ...enc,
              ...encodings[i < encodings.length ? i : encodings.length - 1],
            }));
          }
          sender.setParameters(params).catch(() => {});
        } catch (e) {
          console.warn("[ClassRoom] Simulcast setParameters error:", e.message);
        }
      }
      if (audioTrack) pc.addTrack(audioTrack, localStream);
    }

    // リモートストリーム受信
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStreams((prev) => ({ ...prev, [peerEmail]: stream }));
        console.log(`[ClassRoom] 📹 Remote stream from ${peerEmail}`);
      }
    };

    // ICE candidate 収集 → DB送信
    pc.onicecandidate = async (event) => {
      if (!event.candidate || !roomId) return;
      try {
        const current = await base44.entities.ClassRoom.filter({ id: roomId });
        const rm = current[0];
        if (!rm) return;
        const candidates = rm.webrtc_ice_candidates || {};
        const myEmail = user?.email;
        const key = `${myEmail}__${peerEmail}`;
        const existing = candidates[key] ? JSON.parse(candidates[key]) : [];
        existing.push(event.candidate.toJSON());
        await base44.entities.ClassRoom.update(roomId, {
          webrtc_ice_candidates: {
            ...candidates,
            [key]: JSON.stringify(existing),
          },
        });
      } catch (e) {
        console.warn("[ClassRoom] ICE send error:", e.message);
      }
    };

    // 接続状態監視
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionStates((prev) => ({ ...prev, [peerEmail]: state }));
      console.log(`[ClassRoom] ${peerEmail} connection: ${state}`);
      if (state === "failed") {
        // 自動再接続
        setTimeout(() => restartPeer(peerEmail), 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected") {
        console.warn(`[ClassRoom] ICE disconnected for ${peerEmail}`);
      }
    };

    return pc;
  }, [localStream, roomId, user?.email]);

  // ---- Offer 作成（ホスト → 生徒）----
  const createOffer = useCallback(async (peerEmail) => {
    const pc = createPeerConnection(peerEmail);
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);

    // DB に offer 保存
    const current = await base44.entities.ClassRoom.filter({ id: roomId });
    const rm = current[0];
    if (!rm) return;
    const offers = rm.webrtc_offers || {};
    const key = `${user.email}__${peerEmail}`;
    await base44.entities.ClassRoom.update(roomId, {
      webrtc_offers: { ...offers, [key]: JSON.stringify(offer) },
    });
    console.log(`[ClassRoom] 📤 Offer sent to ${peerEmail}`);
  }, [createPeerConnection, roomId, user?.email]);

  // ---- Answer 作成（生徒 → ホスト）----
  const createAnswer = useCallback(async (peerEmail, offerSdp) => {
    const pc = createPeerConnection(peerEmail);
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

    // キューに積んでいたICEを適用
    if (pendingCandidates.current[peerEmail]) {
      for (const c of pendingCandidates.current[peerEmail]) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      delete pendingCandidates.current[peerEmail];
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const current = await base44.entities.ClassRoom.filter({ id: roomId });
    const rm = current[0];
    if (!rm) return;
    const answers = rm.webrtc_answers || {};
    const key = `${peerEmail}__${user.email}`;
    await base44.entities.ClassRoom.update(roomId, {
      webrtc_answers: { ...answers, [key]: JSON.stringify(answer) },
    });
    console.log(`[ClassRoom] 📥 Answer sent to ${peerEmail}`);
  }, [createPeerConnection, roomId, user?.email]);

  // ---- peer 再起動 ----
  const restartPeer = useCallback((peerEmail) => {
    const pc = peerConnections.current[peerEmail];
    if (pc) {
      pc.close();
      delete peerConnections.current[peerEmail];
      setRemoteStreams((prev) => { const n = { ...prev }; delete n[peerEmail]; return n; });
    }
    if (isHostRef.current) createOffer(peerEmail);
  }, [createOffer]);

  // ---- DBポーリングでシグナリング処理 ----
  useEffect(() => {
    if (!roomId || !user || !localStream) return;

    const processSignaling = async () => {
      const rooms = await base44.entities.ClassRoom.filter({ id: roomId });
      const rm = rooms[0];
      if (!rm) return;
      setRoom(rm);

      const myEmail = user.email;
      const participants = rm.participants || [];
      const otherEmails = participants
        .map((p) => p.email)
        .filter((e) => e !== myEmail);

      // ---- ホスト: 全生徒へ offer ----
      if (isHost) {
        for (const peerEmail of otherEmails) {
          const key = `${myEmail}__${peerEmail}`;
          if (!peerConnections.current[peerEmail] || peerConnections.current[peerEmail].signalingState === "closed") {
            if (!processedSignals.current.has(`offer__${key}`)) {
              processedSignals.current.add(`offer__${key}`);
              createOffer(peerEmail).catch(() => {});
            }
          }
          // answer を受信したら setRemoteDescription
          const answers = rm.webrtc_answers || {};
          const answerStr = answers[key];
          if (answerStr && !processedSignals.current.has(`answer__${key}`)) {
            processedSignals.current.add(`answer__${key}`);
            const pc = peerConnections.current[peerEmail];
            if (pc && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerStr))).catch(() => {});
              console.log(`[ClassRoom] ✅ Answer applied from ${peerEmail}`);
              // pending ICE
              if (pendingCandidates.current[peerEmail]) {
                for (const c of pendingCandidates.current[peerEmail]) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                delete pendingCandidates.current[peerEmail];
              }
            }
          }
        }
      }

      // ---- 生徒: ホストからの offer を受信して answer ----
      if (!isHost) {
        const hostEmail = rm.host_email;
        const offers = rm.webrtc_offers || {};
        const key = `${hostEmail}__${myEmail}`;
        const offerStr = offers[key];
        if (offerStr && !processedSignals.current.has(`offer__${key}`)) {
          processedSignals.current.add(`offer__${key}`);
          await createAnswer(hostEmail, JSON.parse(offerStr)).catch(() => {});
        }
      }

      // ---- ICE candidates 処理 ----
      const allCandidates = rm.webrtc_ice_candidates || {};
      const peerEmails = isHost ? otherEmails : [rm.host_email];
      for (const peerEmail of peerEmails) {
        const key = `${peerEmail}__${myEmail}`;
        const candidatesStr = allCandidates[key];
        if (!candidatesStr) continue;
        const candidates = JSON.parse(candidatesStr);
        const pc = peerConnections.current[peerEmail];
        if (!pc) continue;
        for (let i = 0; i < candidates.length; i++) {
          const iceKey = `ice__${key}__${i}`;
          if (processedSignals.current.has(iceKey)) continue;
          processedSignals.current.add(iceKey);
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(candidates[i])).catch(() => {});
          } else {
            if (!pendingCandidates.current[peerEmail]) pendingCandidates.current[peerEmail] = [];
            pendingCandidates.current[peerEmail].push(candidates[i]);
          }
        }
      }

      // ---- 全員ミュート / 個別ミュート 反映 ----
      if (!isHost && rm.is_muted_all) {
        const localAudioTracks = localStream?.getAudioTracks();
        localAudioTracks?.forEach((t) => { t.enabled = false; });
      }
      if (!isHost && rm.muted_participant_emails?.includes(myEmail)) {
        const localAudioTracks = localStream?.getAudioTracks();
        localAudioTracks?.forEach((t) => { t.enabled = false; });
      }
    };

    const interval = setInterval(processSignaling, 2000);
    processSignaling();

    // リアルタイム購読
    const unsub = base44.entities.ClassRoom.subscribe((ev) => {
      if (ev.id === roomId || ev.data?.id === roomId) {
        processSignaling();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      processedSignals.current.clear();
    };
  }, [roomId, user?.email, isHost, localStream, createOffer, createAnswer]);

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
    const current = await base44.entities.ClassRoom.filter({ id: roomId });
    const rm = current[0];
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
    const current = await base44.entities.ClassRoom.filter({ id: roomId });
    const rm = current[0];
    if (!rm) return;
    const list = (rm.muted_participant_emails || []).filter((e) => e !== peerEmail);
    await base44.entities.ClassRoom.update(roomId, { muted_participant_emails: list });
  }, [roomId]);

  return {
    room,
    remoteStreams,
    connectionStates,
    muteAll,
    unmuteAll,
    muteParticipant,
    unmuteParticipant,
  };
}

// ---- メディアストリーム取得（ホスト/ゲスト別画質）----
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