/**
 * ChimeBroadcasterEngine
 * 配信者専用 Chime 送信エンジン
 *
 * 要件:
 * 1. 配信開始時に getUserMedia を完全再取得してフレッシュな MediaStream を Chime に叩き込む
 * 2. 自分の送信タイルが確定したら「🔵 送信タイル確定」を画面表示
 * 3. 実際に Chime サーバーへ送っているタイル映像を <video> にバインドして配信者に見せる
 */
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ChimeBroadcasterEngine({ streamId }) {
  const sessionRef    = useRef(null);
  const isMountedRef  = useRef(true);
  const initCalledRef = useRef(false);
  const audioElRef    = useRef(null);
  // ★ 実際にサーバーへ送っているタイル映像を映す <video> ref
  const tileVideoRef  = useRef(null);

  const [phase, setPhase]       = useState("カメラ再取得中...");
  const [tileReady, setTileReady] = useState(false);
  const [tileId, setTileId]     = useState(null);
  const [freshStream, setFreshStream] = useState(null); // 再取得したMediaStream

  useEffect(() => {
    if (!streamId) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    isMountedRef.current = true;

    async function initChimeBroadcaster() {
      try {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 1: getUserMedia を完全再取得（空箱防止）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        setPhase("📷 getUserMedia 完全再取得中...");
        console.log("[ChimeBroadcaster] 🎥 getUserMedia 再取得開始");

        const freshMediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });
        if (!isMountedRef.current) { freshMediaStream.getTracks().forEach(t => t.stop()); return; }

        const videoTrack = freshMediaStream.getVideoTracks()[0];
        const audioTrack = freshMediaStream.getAudioTracks()[0];
        console.log("[ChimeBroadcaster] ✅ 再取得成功 — video:", videoTrack?.label, "| audio:", audioTrack?.label);
        setFreshStream(freshMediaStream);
        setPhase("✅ カメラ再取得完了 — Chime Meeting 入室中...");

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 2: Chime Meeting 参加
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'broadcaster',
        });
        if (!isMountedRef.current) return;

        const { Meeting, Attendee } = res?.data || {};
        if (!Meeting || !Attendee) throw new Error(`Meeting/Attendee取得失敗: ${JSON.stringify(res?.data)}`);
        console.log("[ChimeBroadcaster] Meeting:", Meeting.MeetingId, "Attendee:", Attendee.AttendeeId);

        setPhase("🔧 SDK 初期化中...");
        const {
          DefaultMeetingSession,
          MeetingSessionConfiguration,
          DefaultDeviceController,
          ConsoleLogger,
          LogLevel,
        } = await import('amazon-chime-sdk-js');
        if (!isMountedRef.current) return;

        const logger     = new ConsoleLogger('ChimeBroadcaster', LogLevel.INFO);
        const deviceCtrl = new DefaultDeviceController(logger);
        const config     = new MeetingSessionConfiguration(Meeting, Attendee);
        const session    = new DefaultMeetingSession(config, logger, deviceCtrl);
        sessionRef.current = session;

        const av = session.audioVideo;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 3: Observer — タイル確定を監視 & <video> にバインド
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        av.addObserver({
          videoTileDidUpdate: (tileState) => {
            console.log("[ChimeBroadcaster] 🎯 videoTileDidUpdate:", {
              tileId: tileState.tileId,
              localTile: tileState.localTile,
              active: tileState.active,
            });
            // ★ ローカルタイル（自分の送信映像）が確定したら <video> にバインド
            if (tileState.localTile && tileState.tileId && tileVideoRef.current) {
              console.log(`[ChimeBroadcaster] 🔵 送信タイル確定！ tileId: ${tileState.tileId} → <video> にバインド`);
              av.bindVideoElement(tileState.tileId, tileVideoRef.current);
              setTileId(tileState.tileId);
              setTileReady(true);
              setPhase(`🔵 送信タイル確定 (tileId: ${tileState.tileId})`);
            }
          },
          videoTileWasRemoved: (id) => {
            console.log("[ChimeBroadcaster] tile removed:", id);
            setTileReady(false);
            setTileId(null);
            setPhase("⚠️ 映像タイル削除 — 再送出が必要");
          },
          audioVideoDidStart: () => {
            console.log("[ChimeBroadcaster] ✅ audioVideoDidStart");
            setPhase("🔌 Chime 接続完了 — startLocalVideoTile 実行中...");
          },
          audioVideoDidStop: (status) => {
            const code = status?.statusCode?.();
            console.log("[ChimeBroadcaster] ⚠️ audioVideoDidStop:", code);
            if (isMountedRef.current) setPhase(`接続終了 (${code})`);
          },
        });

        // 音声出力（ハウリング防止のためミュート）
        if (!audioElRef.current) {
          const el = document.createElement('audio');
          el.autoplay = true;
          el.muted = true; // 配信者PC側でのハウリング防止
          el.style.display = 'none';
          document.body.appendChild(el);
          audioElRef.current = el;
        }
        av.bindAudioElement(audioElRef.current);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 4: フレッシュな MediaStream を Chime に叩き込む
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (videoTrack) {
          setPhase("📹 フレッシュ映像を Chime に投入中...");
          // MediaStream ごと渡す（トラックIDが正しく伝わる）
          await av.startVideoInput(new MediaStream([videoTrack]));
          console.log("[ChimeBroadcaster] ✅ startVideoInput 完了 — track:", videoTrack.label);
        } else {
          console.error("[ChimeBroadcaster] ❌ ビデオトラックなし！");
          setPhase("❌ ビデオトラック取得失敗");
          return;
        }
        if (audioTrack) {
          await av.startAudioInput(new MediaStream([audioTrack]));
          console.log("[ChimeBroadcaster] ✅ startAudioInput 完了");
        }

        setPhase("⏳ Chime av.start() 実行中...");
        await av.start();
        console.log("[ChimeBroadcaster] ✅ av.start() 完了");

        // ★ startLocalVideoTile — これで視聴者にタイルが届く
        av.startLocalVideoTile();
        console.log("[ChimeBroadcaster] ✅✅✅ startLocalVideoTile() 発火！ 電波に乗った！");
        setPhase("📡 startLocalVideoTile 発火済 — タイル確定待ち...");

      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("[ChimeBroadcaster] ❌ 失敗:", err.message);
        setPhase(`❌ エラー: ${err.message}`);
      }
    }

    initChimeBroadcaster();

    return () => {
      isMountedRef.current = false;
      try {
        if (sessionRef.current?.audioVideo) {
          sessionRef.current.audioVideo.stopLocalVideoTile();
          sessionRef.current.audioVideo.stop();
        }
      } catch (_) {}
      sessionRef.current = null;
      // フレッシュ取得したStreamのトラックを解放
      if (freshStream) freshStream.getTracks().forEach(t => t.stop());
      if (audioElRef.current) { audioElRef.current.remove(); audioElRef.current = null; }
    };
  }, [streamId]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none" }}>

      {/* ★ 実際に電波に乗っている映像（サーバー送信タイル） */}
      <video
        ref={tileVideoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#000",
          // タイルが確定するまでは非表示にしない（黒画面で存在を示す）
          opacity: tileReady ? 1 : 0,
          transition: "opacity 0.3s",
          zIndex: 41,
        }}
      />

      {/* ━━━ ステータスバッジ ━━━ */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          background: tileReady ? "rgba(0,60,180,0.95)" : "rgba(20,20,20,0.92)",
          border: `2px solid ${tileReady ? "#4488ff" : "#ff8800"}`,
          borderRadius: 10,
          padding: "6px 14px",
          textAlign: "center",
          pointerEvents: "none",
          minWidth: 260,
          maxWidth: "90%",
        }}
      >
        <p style={{ color: tileReady ? "#88ccff" : "#ffaa44", fontSize: 11, fontFamily: "monospace", margin: 0 }}>
          {phase}
        </p>
        {tileReady && (
          <p style={{ color: "#ffffff", fontSize: 15, fontWeight: "bold", margin: "4px 0 0" }}>
            🔵 送信タイル確定 — 視聴者に届いています
          </p>
        )}
        {!tileReady && (
          <p style={{ color: "#888", fontSize: 10, margin: "3px 0 0", fontFamily: "monospace" }}>
            ⬛ タイル未確定（鏡ではなく実際の送信映像を待機中）
          </p>
        )}
      </div>

      {/* タイル未確定時の黒画面オーバーレイメッセージ */}
      {!tileReady && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 42,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.75)",
          gap: 8,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid #ff8800", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#ffaa44", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "0 20px" }}>
            実際の送信映像を取得中...<br />
            <span style={{ fontSize: 10, color: "#888" }}>（鏡ではなくChimeサーバー経由の映像がここに映ります）</span>
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}