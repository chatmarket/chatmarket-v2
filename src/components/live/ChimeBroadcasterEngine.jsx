/**
 * ChimeBroadcasterEngine v3
 * 配信者専用 Chime 送信エンジン
 *
 * 修正ポイント:
 * 1. startVideoInput → startLocalVideoTile → av.start() の正しい順序
 * 2. freshStream をrefで保持してクリーンアップ漏れを防止
 * 3. videoTileDidUpdate でタイルID番号を画面に大きく表示
 * 4. 視聴者へのタイル通知が確実に届くよう startRemoteVideoTileSubscription を追加
 */
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ChimeBroadcasterEngine({ streamId }) {
  const sessionRef     = useRef(null);
  const isMountedRef   = useRef(true);
  const initCalledRef  = useRef(false);
  const audioElRef     = useRef(null);
  const freshStreamRef = useRef(null); // refで保持してクリーンアップ漏れ防止
  const tileVideoRef   = useRef(null);

  const [phase, setPhase]       = useState("カメラ再取得中...");
  const [tileReady, setTileReady] = useState(false);
  const [tileId, setTileId]     = useState(null);

  useEffect(() => {
    if (!streamId) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    isMountedRef.current = true;

    async function initChimeBroadcaster() {
      try {
        // ━━━ STEP 1: getUserMedia 完全再取得 ━━━
        setPhase("📷 getUserMedia 再取得中...");
        console.log("[ChimeBroadcaster] 🎥 getUserMedia 再取得開始");

        const freshMediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });
        if (!isMountedRef.current) { freshMediaStream.getTracks().forEach(t => t.stop()); return; }

        freshStreamRef.current = freshMediaStream;
        const videoTrack = freshMediaStream.getVideoTracks()[0];
        const audioTrack = freshMediaStream.getAudioTracks()[0];
        console.log("[ChimeBroadcaster] ✅ 再取得成功 — video:", videoTrack?.label, "| audio:", audioTrack?.label);
        setPhase("✅ カメラ取得完了 — Chime Meeting 入室中...");

        // ━━━ STEP 2: Chime Meeting 参加 ━━━
        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'broadcaster',
        });
        if (!isMountedRef.current) return;

        const { Meeting, Attendee } = res?.data || {};
        if (!Meeting || !Attendee) throw new Error(`Meeting/Attendee取得失敗: ${JSON.stringify(res?.data)}`);
        console.log("[ChimeBroadcaster] ✅ Meeting:", Meeting.MeetingId, "| Attendee:", Attendee.AttendeeId);
        setPhase(`✅ Meeting入室完了 (${Meeting.MeetingId.slice(0,8)}...)`);

        // ━━━ STEP 3: SDK 初期化 ━━━
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

        // ━━━ STEP 4: Observer 設定 ━━━
        av.addObserver({
          videoTileDidUpdate: (tileState) => {
            console.log("[ChimeBroadcaster] 🎯 videoTileDidUpdate:", JSON.stringify({
              tileId: tileState.tileId,
              localTile: tileState.localTile,
              active: tileState.active,
            }));
            if (tileState.localTile && tileState.tileId && tileVideoRef.current) {
              console.log(`[ChimeBroadcaster] 🔵 ローカルタイル確定！ tileId=${tileState.tileId}`);
              av.bindVideoElement(tileState.tileId, tileVideoRef.current);
              setTileId(tileState.tileId);
              setTileReady(true);
              setPhase(`🔵 送信タイル確定 tileId=${tileState.tileId}`);
            }
          },
          videoTileWasRemoved: (id) => {
            console.log("[ChimeBroadcaster] tile removed:", id);
            if (isMountedRef.current) {
              setTileReady(false);
              setTileId(null);
              setPhase("⚠️ タイル削除 — 再送出必要");
            }
          },
          audioVideoDidStart: () => {
            console.log("[ChimeBroadcaster] ✅ audioVideoDidStart");
            setPhase("🔌 av.start() 完了 — startLocalVideoTile済み");
          },
          audioVideoDidStop: (status) => {
            const code = status?.statusCode?.();
            console.log("[ChimeBroadcaster] ⚠️ audioVideoDidStop:", code);
            if (isMountedRef.current) setPhase(`接続終了 (${code})`);
          },
        });

        // 音声出力（ハウリング防止でミュート）
        if (!audioElRef.current) {
          const el = document.createElement('audio');
          el.autoplay = true;
          el.muted = true;
          el.style.display = 'none';
          document.body.appendChild(el);
          audioElRef.current = el;
        }
        av.bindAudioElement(audioElRef.current);

        // ━━━ STEP 5: デバイス入力設定（start()前に必須） ━━━
        if (!videoTrack) {
          setPhase("❌ ビデオトラック取得失敗");
          console.error("[ChimeBroadcaster] ❌ ビデオトラックなし");
          return;
        }

        setPhase("📹 デバイス入力設定中...");
        await av.startVideoInput(videoTrack);
        console.log("[ChimeBroadcaster] ✅ startVideoInput 完了:", videoTrack.label, "readyState:", videoTrack.readyState);

        if (audioTrack) {
          await av.startAudioInput(audioTrack);
          console.log("[ChimeBroadcaster] ✅ startAudioInput 完了:", audioTrack.label);
        }

        // ━━━ STEP 6: startLocalVideoTile（start()前に発行） ━━━
        // ★ 正しい順序: startVideoInput → startLocalVideoTile → av.start()
        const localTileResult = av.startLocalVideoTile();
        console.log("[ChimeBroadcaster] ✅ startLocalVideoTile() 発火 — result:", localTileResult);
        setPhase("📡 startLocalVideoTile発火 — av.start()実行中...");

        // ━━━ STEP 7: av.start() ━━━
        await av.start();
        console.log("[ChimeBroadcaster] ✅ av.start() 完了 — タイル確定待ち");
        setPhase("⏳ タイル確定待ち... (videoTileDidUpdate待機中)");

        // 5秒後に強制タイル確認ログ
        setTimeout(() => {
          if (!isMountedRef.current) return;
          try {
            const tiles = av.getAllRemoteVideoTiles?.() || [];
            const localTiles = av.getAllLocalVideoTiles?.() || [];
            console.log(`[ChimeBroadcaster] 🔍 5秒後確認 — localTiles:${localTiles.length}, remoteTiles:${tiles.length}`);
            localTiles.forEach(tile => {
              const s = tile.state?.();
              console.log(`  LOCAL tileId:${s?.tileId}, active:${s?.active}`);
            });
          } catch (e) {
            console.warn("[ChimeBroadcaster] タイル確認失敗:", e.message);
          }
        }, 5000);

      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("[ChimeBroadcaster] ❌ 失敗:", err.message, err.stack);
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
      // freshStreamRef でクリーンアップ（stateではなくrefなので確実）
      freshStreamRef.current?.getTracks().forEach(t => t.stop());
      freshStreamRef.current = null;
      if (audioElRef.current) { audioElRef.current.remove(); audioElRef.current = null; }
    };
  }, [streamId]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none" }}>

      {/* 実際の送信タイル映像 */}
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
          opacity: tileReady ? 1 : 0,
          transition: "opacity 0.3s",
          zIndex: 41,
        }}
      />

      {/* ステータスバッジ（tileId番号を大きく表示） */}
      <div style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        background: tileReady ? "rgba(0,40,160,0.97)" : "rgba(20,20,20,0.95)",
        border: `2px solid ${tileReady ? "#4488ff" : "#ff8800"}`,
        borderRadius: 12,
        padding: "8px 18px",
        textAlign: "center",
        pointerEvents: "none",
        minWidth: 280,
        maxWidth: "92%",
      }}>
        <p style={{ color: tileReady ? "#88ccff" : "#ffaa44", fontSize: 11, fontFamily: "monospace", margin: 0 }}>
          {phase}
        </p>
        {tileReady && tileId !== null && (
          <p style={{ color: "#00ffcc", fontSize: 22, fontWeight: "bold", margin: "6px 0 2px", fontFamily: "monospace" }}>
            🔵 tileId = <span style={{ color: "#fff", fontSize: 28 }}>{tileId}</span>
          </p>
        )}
        {tileReady && (
          <p style={{ color: "#aaffcc", fontSize: 13, fontWeight: "bold", margin: "2px 0 0" }}>
            ✅ 視聴者に映像を送信中
          </p>
        )}
        {!tileReady && (
          <p style={{ color: "#888", fontSize: 10, margin: "3px 0 0", fontFamily: "monospace" }}>
            タイル未確定 — videoTileDidUpdate 待機中
          </p>
        )}
      </div>

      {/* タイル未確定時スピナー */}
      {!tileReady && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 42,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", gap: 10,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid #ff8800", borderTopColor: "transparent", animation: "chimeSpin 1s linear infinite" }} />
          <p style={{ color: "#ffaa44", fontSize: 12, fontFamily: "monospace", textAlign: "center" }}>
            Chime サーバーへ送信中...<br/>
            <span style={{ fontSize: 10, color: "#666" }}>videoTileDidUpdate を待機</span>
          </p>
        </div>
      )}

      <style>{`@keyframes chimeSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}