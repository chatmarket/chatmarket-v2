/**
 * ChimeBroadcasterEngine
 * 配信者専用 Chime 送信エンジン
 * - カメラ映像・音声を Chime Meeting に送出する
 * - BroadcasterStream と並列でマウントされる
 */
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ChimeBroadcasterEngine({ streamId, localStream }) {
  const sessionRef    = useRef(null);
  const isMountedRef  = useRef(true);
  const initCalledRef = useRef(false);
  const audioElRef    = useRef(null);

  const [phase, setPhase]       = useState("Chime初期化待機...");
  const [tileReady, setTileReady] = useState(false);
  const [tileId, setTileId]     = useState(null);

  useEffect(() => {
    if (!streamId || !localStream) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    isMountedRef.current = true;

    async function initChimeBroadcaster() {
      try {
        setPhase("Chime Meeting 入室中...");
        console.log("[ChimeBroadcaster] 🚀 接続開始 streamId:", streamId);

        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'broadcaster',
        });

        if (!isMountedRef.current) return;

        const { Meeting, Attendee } = res?.data || {};
        if (!Meeting || !Attendee) {
          throw new Error(`Meeting/Attendee取得失敗: ${JSON.stringify(res?.data)}`);
        }

        console.log("[ChimeBroadcaster] Meeting:", Meeting.MeetingId, "Attendee:", Attendee.AttendeeId);
        setPhase("SDK 初期化中...");

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

        // ★ タイル監視：自分の映像がAWSに認識されたか確認
        av.addObserver({
          videoTileDidUpdate: (tileState) => {
            console.log("[ChimeBroadcaster] 🎯 videoTileDidUpdate:", {
              tileId: tileState.tileId,
              localTile: tileState.localTile,
              active: tileState.active,
            });
            if (tileState.localTile && tileState.active) {
              console.log(`[ChimeBroadcaster] ✅✅✅ 送信タイル確定！ tileId: ${tileState.tileId}`);
              setTileId(tileState.tileId);
              setTileReady(true);
              setPhase(`映像送出成功 ✅ tileId: ${tileState.tileId}`);
            }
          },
          videoTileWasRemoved: (id) => {
            console.log("[ChimeBroadcaster] tile removed:", id);
            setTileReady(false);
            setPhase("映像タイル削除済み");
          },
          audioVideoDidStart: () => {
            console.log("[ChimeBroadcaster] ✅ audioVideoDidStart");
            setPhase("Chime 接続完了 — 映像送出準備中...");
          },
          audioVideoDidStop: (status) => {
            console.log("[ChimeBroadcaster] ⚠️ audioVideoDidStop:", status?.statusCode?.());
          },
        });

        // ★ 音声出力
        if (!audioElRef.current) {
          const el = document.createElement('audio');
          el.autoplay = true;
          el.style.display = 'none';
          document.body.appendChild(el);
          audioElRef.current = el;
        }
        av.bindAudioElement(audioElRef.current);

        // ★ カメラ映像（localStream のビデオトラック）を Chime に紐付け
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];

        if (videoTrack) {
          setPhase("カメラデバイスを Chime に紐付け中...");
          console.log("[ChimeBroadcaster] 📹 カメラトラック:", videoTrack.label);
          await av.startVideoInput(new MediaStream([videoTrack]));
          console.log("[ChimeBroadcaster] ✅ startVideoInput 完了");
        } else {
          console.warn("[ChimeBroadcaster] ⚠️ ビデオトラックなし — カメラ未許可の可能性");
        }

        if (audioTrack) {
          await av.startAudioInput(new MediaStream([audioTrack]));
          console.log("[ChimeBroadcaster] ✅ startAudioInput 完了");
        }

        setPhase("Meeting 接続中...");
        await av.start();
        console.log("[ChimeBroadcaster] ✅ av.start() 完了");

        // ★ startLocalVideoTile — これが呼ばれないと視聴者に映像が届かない
        setPhase("映像タイル発行中（startLocalVideoTile）...");
        av.startLocalVideoTile();
        console.log("[ChimeBroadcaster] ✅✅✅ startLocalVideoTile() 実行！ 視聴者に映像が届きます");
        setPhase("映像タイル発行済み — 視聴者応答待ち...");

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
      if (audioElRef.current) {
        audioElRef.current.remove();
        audioElRef.current = null;
      }
    };
  }, [streamId, localStream]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 8,
        zIndex: 50,
        background: tileReady ? "rgba(0,80,0,0.92)" : "rgba(0,0,0,0.88)",
        border: `2px solid ${tileReady ? "#00ff88" : "#ff6600"}`,
        borderRadius: 8,
        padding: "6px 10px",
        maxWidth: "90%",
        pointerEvents: "none",
      }}
    >
      <p style={{ color: tileReady ? "#00ff88" : "#ffaa00", fontSize: 10, fontFamily: "monospace", margin: 0 }}>
        📡 {phase}
      </p>
      {tileReady && (
        <p style={{ color: "#ffffff", fontSize: 14, fontWeight: "bold", margin: "4px 0 0", textAlign: "center" }}>
          🟢 送信開始成功！視聴者に映像が届いています
        </p>
      )}
    </div>
  );
}