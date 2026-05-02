import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Camera, CameraOff, CheckCircle2, AlertCircle, Zap, Radio, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CanvasVideoEffect from "@/components/broadcast/CanvasVideoEffect";
import EffectPanel from "@/components/broadcast/EffectPanel";

/**
 * BrowserBroadcaster — シンプルな放送機材
 * 
 * ❌ 削除：場当たり的な useEffect、自動リトライ、Canvas フォールバック、ストリーム自動復旧
 * ✅ 残す：Permission Dialog、マイクメーター、ビデオストリーム（optional）、配信ボタン
 * ✅ エラー時：ユーザーに「再試行しますか？」と聞いて停止
 */
export default function BrowserBroadcaster({ streamId, channelId, onEnd }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const whipClientRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(() => sessionStorage.getItem('selectedCamera') || null);
  const [selectedMic, setSelectedMic] = useState(() => sessionStorage.getItem('selectedMic') || null);
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null); // null | "connecting" | "live" | "error"
  const [broadcastError, setBroadcastError] = useState(null);
  
  const [effectKey, setEffectKey] = useState("none");
  const canvasEffectRef = useRef(null);
  const canvasStreamRef = useRef(null); // Canvasから生成したストリーム（音声付き）

  const [error, setError] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showMicEnableButton, setShowMicEnableButton] = useState(true);
  const [micWarning, setMicWarning] = useState(null);
  const [testConfirmed, setTestConfirmed] = useState(false); // テスト完了フラグ
  const silenceCounterRef = useRef(0);

  // refで最新のselectedCamera/Micを参照（useCallback再生成ループを防ぐ）
  const selectedCameraRef = useRef(selectedCamera);
  const selectedMicRef = useRef(selectedMic);
  useEffect(() => { selectedCameraRef.current = selectedCamera; }, [selectedCamera]);
  useEffect(() => { selectedMicRef.current = selectedMic; }, [selectedMic]);

  // 【デバイス列挙 — 依存配列なし、refで参照】
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter((d) => d.kind === 'videoinput');
      const micDevices = devices.filter((d) => d.kind === 'audioinput');
      
      setCameras(cameraDevices);
      setMicrophones(micDevices);
      
      // 未選択の場合のみデフォルトをセット（ループ防止：既に選択済みなら何もしない）
      if (cameraDevices.length > 0 && !selectedCameraRef.current) {
        let defaultCam = cameraDevices.find(d => d.label.toLowerCase().includes('facetime'));
        if (!defaultCam) defaultCam = cameraDevices.find(d => d.label.toLowerCase().includes('built-in'));
        if (!defaultCam) defaultCam = cameraDevices[0];
        setSelectedCamera(defaultCam.deviceId);
        console.log('[BrowserBroadcaster] 📷 Default camera:', defaultCam.label);
      }
      if (micDevices.length > 0 && !selectedMicRef.current) {
        const label = (d) => d.label.toLowerCase();
        let defaultMic =
          micDevices.find(d => label(d).includes('built-in')) ||
          micDevices.find(d => label(d).includes('内蔵')) ||
          micDevices.find(d => label(d).includes('macbook')) ||
          micDevices.find(d => label(d).includes('facetime')) ||
          micDevices.find(d => !label(d).includes('obs')) ||
          micDevices[0];
        setSelectedMic(defaultMic.deviceId);
        console.log('[BrowserBroadcaster] 🎤 Default mic:', defaultMic.label);
      }
    } catch (err) {
      console.error('[BrowserBroadcaster] Device enumeration error:', err);
    }
  }, []); // 依存配列を空にしてループを完全防止

  // 【マイクメーター】source → analyser のみ（destinationには繋がない！繋ぐとChrome/Safariがフィードバック検出してゼロ出力になる）
  const startMicMeter = useCallback((stream) => {
    if (!stream || !audioContextRef.current) {
      console.warn('[BrowserBroadcaster] startMicMeter: missing stream or AudioContext');
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[BrowserBroadcaster] No audio tracks found');
      return;
    }
    console.log('[BrowserBroadcaster] ✅ Audio track found:', audioTracks[0].label, 'enabled:', audioTracks[0].enabled);

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // ★ 毎回新規作成（analyzerRefはhandleMicEnableでリセット済み）
    // ★ destination に繋がない — 解析専用ルート（ハウリング防止）
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024; // 高精度
    analyser.smoothingTimeConstant = 0.3; // 追従を速く
    source.connect(analyser);
    // ↑ analyser.connect(ctx.destination) は意図的に省略
    analyzerRef.current = analyser;
    console.log('[BrowserBroadcaster] ✅ Analyser connected (no destination — meter-only mode)');

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let meterLoopId = null;
    let logThrottle = 0;

    const meterTick = () => {
      if (!analyzerRef.current) return;
      analyzerRef.current.getByteFrequencyData(dataArray);

      // 単純平均（感度高）× 4倍スケールで0-100に正規化
      const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
      const newLevel = Math.min(100, Math.round(avg * 4));
      setMicLevel(newLevel);

      // 生値ログ（10秒に1回だけ出力）
      logThrottle++;
      if (logThrottle % 600 === 0) {
        console.log(`[MicMeter] avg=${avg.toFixed(2)} level=${newLevel}% ctx=${ctx.state}`);
      }

      // 無音判定は5秒（300フレーム）に延長（起動直後の誤検知を防ぐ）
      if (avg < 0.5) {
        silenceCounterRef.current += 1;
        if (silenceCounterRef.current > 300) {
          setMicWarning('マイクの音が届いていません！');
        }
      } else {
        silenceCounterRef.current = 0;
        setMicWarning(null);
      }

      meterLoopId = requestAnimationFrame(meterTick);
    };

    meterLoopId = requestAnimationFrame(meterTick);
    console.log('[BrowserBroadcaster] ✅ Mic meter started — loop active');

    return () => {
      if (meterLoopId) cancelAnimationFrame(meterLoopId);
    };
  }, []);

  // 【初期化：Permission Dialog → デバイス確定 → ビデオ → マイクメーター】
  // 【初期化】- 自動起動せず、ボタンクリック待機
  useEffect(() => {
    console.log('[BrowserBroadcaster] 🚀 Mount: Waiting for user interaction');

    // クリック時に AudioContext.resume() を『強制連発』
    const handleUserClick = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('[BrowserBroadcaster] ✅ AudioContext force resumed on click');
        }).catch((err) => {
          console.warn('[BrowserBroadcaster] AudioContext resume failed:', err);
        });
      }
    };

    document.addEventListener('click', handleUserClick);

    return () => {
      document.removeEventListener('click', handleUserClick);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      whipClientRef.current?.close();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 【sessionStorage に選択状態を保存】
  useEffect(() => {
    if (selectedCamera) sessionStorage.setItem('selectedCamera', selectedCamera);
  }, [selectedCamera]);

  useEffect(() => {
    if (selectedMic) sessionStorage.setItem('selectedMic', selectedMic);
  }, [selectedMic]);

  // ★ カメラ変更useEffectを廃止 — handleMicEnableを再呼び出しするとMic restartループになるため
  // カメラ変更はデバイスセレクト後に「再テスト開始」ボタンで対応

  // 【配信開始】認証確認 → streamId 確認 → WHIP 接続
  const handleStartBroadcast = async () => {
    // ログイン確認（未ログインでは WHIP を叩かない）
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      base44.auth.redirectToLogin();
      return;
    }

    if (!streamId) {
      setError('配信IDが見つかりません');
      setShowErrorDialog(true);
      return;
    }

    // メーターが動いているか確認（0なら配信不可）
    if (micLevel === 0) {
      setError('マイクが反応していません。マイクリセットボタンを押してから再度お試しください。');
      setShowErrorDialog(true);
      return;
    }

    console.log('[BrowserBroadcaster] 🚀 Starting broadcast for streamId:', streamId);
    setBroadcastStatus("connecting");
    setBroadcastError(null);

    try {
      // WHIP 接続（カメラプレビューは既に映っている状態で実行）
      console.log('[BrowserBroadcaster] 🔌 Connecting to WHIP...');
      setIsBroadcasting(true);
      await connectToWhip();

      // WHIP 接続成功後にDBを更新
      await base44.entities.LiveStream.update(streamId, {
        status: "live",
        live_started_at: new Date().toISOString(),
      }).catch(err => console.warn('[BrowserBroadcaster] LiveStream update failed (non-fatal):', err.message));

      if (channelId) {
        await base44.entities.Channel.update(channelId, { is_live: true })
          .catch(err => console.warn('[BrowserBroadcaster] Channel update failed (non-fatal):', err.message));
      }

      setBroadcastStatus("live");
      toast.success("✅ 配信開始 — 世界へ放送中");
    } catch (err) {
      console.error('[BrowserBroadcaster] Broadcast error:', err);
      setBroadcastStatus("error");
      setBroadcastError(err.message);
      setIsBroadcasting(false);
      // ★ 配信失敗してもカメラプレビューは継続（streamRef はそのまま）
      setShowErrorDialog(true);
    }
  };

  // 【WHIP 接続】
  // アーキテクチャ:
  //   1. RTCPeerConnection 作成 → SDP Offer 生成 → ICE gathering 完了待ち
  //   2. whipProxy へ { sdp } POST
  //      - Deno 側: IVS Stage WHIP URL + Participant Token 取得 → IVS へ転送 → SDP アンサー返却
  //   3. SDP アンサーを setRemoteDescription
  const connectToWhip = async () => {
    if (!streamRef.current || streamRef.current.getTracks().length === 0) {
      throw new Error('カメラ・マイクが取得できていません');
    }

    // エフェクトがある場合はCanvasストリーム+音声トラックを合成
    let broadcastStream = streamRef.current;
    if (canvasStreamRef.current) {
      const vTracks = canvasStreamRef.current.getVideoTracks();
      const aTracks = streamRef.current.getAudioTracks();
      if (vTracks.length > 0) broadcastStream = new MediaStream([...vTracks, ...aTracks]);
    }

    // RTCPeerConnection 作成
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    broadcastStream.getTracks().forEach((track) => pc.addTrack(track, broadcastStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // ICE gathering 完了まで待機（最大10秒）
    const rawSdp = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[WHIP] ICE gathering timeout — using current SDP');
        resolve(pc.localDescription?.sdp || offer.sdp);
      }, 10000);
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve(pc.localDescription.sdp);
        return;
      }
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve(pc.localDescription.sdp);
        }
      });
    });

    console.log('[WHIP] 📤 Sending SDP to whipProxy for IVS ingestion...');
    console.log('[WHIP] Raw SDP size:', rawSdp.length, 'bytes');

    // whipProxy が SDPクレンジング + IVS転送 + アンサー返却を一括処理
    const proxyRes = await base44.functions.invoke('whipProxy', { sdp: rawSdp });

    if (!proxyRes?.data) throw new Error('whipProxy: レスポンスなし');
    if (proxyRes.data.error) throw new Error(proxyRes.data.error);
    if (!proxyRes.data.answer_sdp) throw new Error('whipProxy: SDPアンサーなし — ' + JSON.stringify(proxyRes.data));

    console.log('[WHIP] ✅ Answer SDP received:', proxyRes.data.answer_sdp.length, 'bytes');
    console.log('[WHIP] Answer preview:', proxyRes.data.answer_sdp.slice(0, 150));

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: proxyRes.data.answer_sdp }));

    whipClientRef.current = pc;
    console.log('[WHIP] 🎉 WHIP CONNECTED — Broadcasting live to IVS Stage!');
  };

  // 【マイク有効化ボタン（中央）】ユーザー操作で初実行
  const handleMicEnable = async () => {
    console.log('[BrowserBroadcaster] 🎙️ Mic enable button clicked - User gesture detected');
    
    // 古いストリームを完全破棄
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // analyzerRefをリセット（多重接続防止）
    analyzerRef.current = null;

    // AudioContextは毎回新規作成（再起動時の音声断絶を防ぐ）
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[BrowserBroadcaster] ✅ AudioContext created on user click');
    
    // AudioContext を確実に resume（Safari ユーザージェスチャー認証）
    try {
      await audioContextRef.current.resume();
      console.log('[BrowserBroadcaster] ✅ AudioContext resumed - state:', audioContextRef.current.state);
    } catch (err) {
      console.warn('[BrowserBroadcaster] AudioContext resume warning:', err);
    }
    
    // ストリーム取得（async/awaitで一本化 — .then内でawaitが使えない問題を解消）
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic
          ? { deviceId: { exact: selectedMic }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          : { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      console.error('[BrowserBroadcaster] Mic enable failed:', err.name, err.message);
      setError('マイク取得に失敗しました: ' + err.message);
      setShowErrorDialog(true);
      return;
    }

    console.log('[BrowserBroadcaster] ✅ Stream acquired - tracks:', stream.getTracks().map(t => t.kind));
    streamRef.current = stream;

    // ★ 100ms バッファ後に srcObject をセット → AbortError・チラつき防止
    const vid = videoRef.current;
    if (vid) {
      // 既に再生中なら先に止める（play()の多重発火防止）
      if (!vid.paused) vid.pause();
      vid.srcObject = null; // 一度クリアして確実にリセット
      await new Promise(r => setTimeout(r, 100)); // 1080p安定待ち（100ms）
      vid.srcObject = stream;
      vid.muted = true;
      // play()は一度だけ呼び、Promiseを完全に待つ
      try {
        await vid.play();
        console.log('[BrowserBroadcaster] ✅ Video playing stably');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[BrowserBroadcaster] Video play error:', err.name, err.message);
        }
        // AbortError は静かに無視（autoPlayが自動リトライする）
      }
    } else {
      console.error('[BrowserBroadcaster] ❌ videoRef.current is NULL at srcObject assignment!');
    }

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    setCameraReady(!!videoTrack && videoTrack.enabled);
    setMicReady(!!audioTrack && audioTrack.enabled);
    console.log('[BrowserBroadcaster] ✅ Camera ready:', !!videoTrack, 'Mic ready:', !!audioTrack);

    startMicMeter(stream);
    enumerateDevices();
    setShowMicEnableButton(false);
    setTestConfirmed(true);
  };

  // 【マイク再起動ボタン】ストリーム完全破棄 + 再初期化
  const handleMicRestart = () => {
    console.log('[BrowserBroadcaster] 🔄 Mic restart requested');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
        console.log('[BrowserBroadcaster] 🛑 Track stopped on restart:', t.kind);
      });
      streamRef.current = null;
    }
    // AudioContext も一度 close して再作成
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    handleMicEnable();
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 relative">
      {/* 左側：ビデオプレイヤー */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "16/9" }}>
          {/* ★ 映像タグ — 常時最前面。srcObjectはhandleMicEnableで直接セット */}
          <video
            ref={(el) => {
              videoRef.current = el;
              // refコールバックからは play() を呼ばない（handleMicEnableが制御する）
            }}
            autoPlay
            muted
            playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: effectKey === "none" ? 'block' : 'none',
              zIndex: 10,
            }}
          />
          {/* Canvasエフェクトプレビュー（エフェクト選択時のみ） */}
          {effectKey !== "none" && (
            <CanvasVideoEffect
              ref={canvasEffectRef}
              sourceRef={videoRef}
              effectKey={effectKey}
              onStream={(stream) => { canvasStreamRef.current = stream; }}
              width={1280}
              height={720}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10 }}
            />
          )}

          {/* プレビュー中バッジ（映像の上に薄く重ねるだけ — 映像を隠さない） */}
          {!isBroadcasting && testConfirmed && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/80 backdrop-blur px-4 py-2 rounded-full border border-red-400/50 shadow-lg" style={{ zIndex: 20 }}>
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-black text-white tracking-wide">🔴 プレビュー中</span>
            </div>
          )}

          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-zinc-700/50" style={{ zIndex: 20 }}>
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">ブラウザプレビュー</span>
          </div>

          {isBroadcasting && (
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2" style={{ zIndex: 20 }}>
              <div className="flex items-center gap-2 bg-red-600 px-4 py-2.5 rounded-xl border-2 border-red-400 shadow-2xl shadow-red-500/60"
                style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <span className="text-base font-black text-white tracking-widest">🔴 配信中</span>
              </div>
              <span className="text-xs font-black text-red-400 tracking-widest uppercase bg-black/70 px-2 py-0.5 rounded-full">ON AIR</span>
            </div>
          )}
        </div>
      </div>

      {/* 右側パネル：コントロール + チャット + コイン */}
      <div className="w-full lg:w-80 flex flex-col gap-4 max-h-screen overflow-y-auto">
        {/* エフェクトパネル */}
        <EffectPanel value={effectKey} onChange={setEffectKey} />

        {/* デバイス設定 */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            デバイス
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">カメラ</label>
            <select
              value={selectedCamera || ""}
              onChange={(e) => { setSelectedCamera(e.target.value); if (testConfirmed) handleMicEnable(); }}
              disabled={isBroadcasting}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `カメラ ${cameras.indexOf(cam) + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">マイク</label>
            <select
              value={selectedMic || ""}
              onChange={(e) => { setSelectedMic(e.target.value); if (testConfirmed) handleMicEnable(); }}
              disabled={isBroadcasting}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `マイク ${microphones.indexOf(mic) + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* マイクメーター */}
          <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">🎤 {micLevel}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  micLevel < 30 ? "bg-green-500" : micLevel < 60 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(micLevel, 100)}%` }}
              />
            </div>
          </div>

          {/* ステータス */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {cameraReady ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className="text-muted-foreground">カメラ {cameraReady ? "✅" : "❌"}</span>
            </div>
            <div className="flex items-center gap-2">
              {micReady ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className="text-muted-foreground">マイク {micReady ? "✅" : "❌"}</span>
            </div>
          </div>
        </div>

        {/* テスト完了バナー / 未完了ガイド */}
        {!isBroadcasting && (
          testConfirmed ? (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-xs font-black text-green-400">テスト完了 — 配信可能です！</p>
                <p className="text-[10px] text-green-400/70">カメラ・マイクの確認が取れました</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-400/80">先に「カメラ・マイクテスト」で<br/>映像と音声を確認してください</p>
            </div>
          )
        )}

        {/* 配信ボタン — テスト完了まで無効 */}
        <button
          onClick={handleStartBroadcast}
          disabled={isBroadcasting || !testConfirmed}
          className={`w-full py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
            broadcastStatus === "live"
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : broadcastStatus === "connecting"
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600 animate-pulse"
              : !testConfirmed
              ? "bg-gray-600 cursor-not-allowed opacity-40"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {broadcastStatus === "live" && <CheckCircle2 className="w-5 h-5" />}
          {broadcastStatus === "connecting" && <Loader2 className="w-5 h-5 animate-spin" />}
          {!broadcastStatus && <Zap className="w-5 h-5" />}
          {broadcastStatus === "live" ? "配信中" : broadcastStatus === "connecting" ? "接続中..." : "配信を開始"}
        </button>

        <button
          onClick={onEnd}
          disabled={isBroadcasting}
          className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-bold text-sm transition-all disabled:opacity-50"
        >
          キャンセル
        </button>

        {/* チャット表示（常時表示）*/}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            💬 チャット
          </h3>
          <div className="h-32 bg-zinc-900/50 rounded-lg p-2 overflow-y-auto border border-zinc-800/50">
            <div className="text-xs text-muted-foreground text-center py-12">
              {isBroadcasting ? "コメント待機中..." : "配信開始後に表示"}
            </div>
          </div>
        </div>

        {/* コイン・ギフト通知（常時表示）*/}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            ⭐ スーパーチャット
          </h3>
          <div className="h-32 bg-zinc-900/50 rounded-lg p-2 overflow-y-auto border border-zinc-800/50">
            <div className="text-xs text-muted-foreground text-center py-12">
              {isBroadcasting ? "ギフト待機中..." : "配信開始後に表示"}
            </div>
          </div>
        </div>
      </div>

      {/* エラーダイアログ */}
      {showErrorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card border border-red-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h2 className="font-bold text-white text-lg">エラーが発生しました</h2>
            </div>
            <p className="text-sm text-red-300">{error || broadcastError}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowErrorDialog(false);
                  setError(null);
                  setBroadcastError(null);
                  setBroadcastStatus(null);
                }}
                className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-white font-bold text-sm"
              >
                閉じる
              </button>
              {broadcastStatus === "error" && (
                <button
                  onClick={() => {
                    setShowErrorDialog(false);
                    handleStartBroadcast();
                  }}
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-sm"
                >
                  再試行
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* カメラ・マイクテストオーバーレイ */}
      {showMicEnableButton && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-zinc-900 to-black rounded-2xl p-8 border border-primary/30 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Mic className="w-7 h-7 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">カメラ・マイクテスト</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ボタンを押すと<span className="text-white font-bold">あなたの顔が映り</span>、<br/>
                声に合わせて<span className="text-white font-bold">音量メーターが動きます</span>。<br/>
                確認できたら配信を開始できます。
              </p>
            </div>
            <button
              onClick={handleMicEnable}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-black font-black text-lg transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> テスト開始（顔を映す）
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              ※ テスト完了後、配信開始ボタンが有効になります
            </p>
          </div>
        </div>
      )}

      {/* 無音警告 */}
      {micWarning && (
        <div className="absolute top-4 right-4 z-30 bg-red-500/80 border border-red-400 rounded-lg px-4 py-3 flex items-center gap-2 backdrop-blur">
          <AlertCircle className="w-5 h-5 text-white" />
          <span className="text-sm font-bold text-white">{micWarning}</span>
        </div>
      )}
    </div>
  );
}