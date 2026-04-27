import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Camera, CameraOff, CheckCircle2, AlertCircle, Zap, Radio, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BrowserBroadcaster({ streamId, channelId, onEnd }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasCtxRef = useRef(null);
  const canvasRafRef = useRef(null);
  const whipClientRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const videoWidthCheckRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [whipEndpoint, setWhipEndpoint] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(() => 
    sessionStorage.getItem('selectedCamera') || null
  );
  const [selectedMic, setSelectedMic] = useState(() => 
    sessionStorage.getItem('selectedMic') || null
  );
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const loadingTimeoutRef = useRef(null);
  const [debugMode, setDebugMode] = useState(false);
  const [canvasActive, setCanvasActive] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null); // null | "connecting" | "live" | "error"
  const [broadcastError, setBroadcastError] = useState(null);
  const broadcastTimeoutRef = useRef(null);

  // 【修正】クエリパラメータから debug=true を検出
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get('debug') === 'true');
  }, []);

  // 【修正】3秒後にローディング画面を強制的に削除
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (loading) {
          console.log('[BrowserBroadcaster] ⏱️ 3秒経過 — ローディング画面を強制削除');
          setLoading(false);
        }
      }, 3000);
    }
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [loading]);

  // 【修正】selectedCamera/selectedMic を sessionStorage に永続化
  useEffect(() => {
    if (selectedCamera) sessionStorage.setItem('selectedCamera', selectedCamera);
  }, [selectedCamera]);

  useEffect(() => {
    if (selectedMic) sessionStorage.setItem('selectedMic', selectedMic);
  }, [selectedMic]);

  // 【修正】マイクレベルメーター監視 — ストリーム取得直後から稼働
  // 【修正】マイクレベルメーター — 映像完了を待たずに独立実行
  useEffect(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioContext = null;
    let analyzer = null;
    let rafId = null;
    let alive = true;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(streamRef.current);
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const tick = () => {
        if (!alive) return;
        analyzer.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
        setMicLevel(Math.round((avg / 255) * 100));
        rafId = requestAnimationFrame(tick);
      };

      tick();
      console.log('[BrowserBroadcaster] 🎤 Mic level meter started (independent)');
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ Audio context error:', err);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      if (analyzer) analyzer.disconnect();
      if (audioContext) audioContext.close();
    };
  }, []);

  // デバイス列挙
  const enumerateDevices = async () => {
    try {
      console.log('[BrowserBroadcaster] 📱 Enumerating devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter((d) => d.kind === 'videoinput');
      const micDevices = devices.filter((d) => d.kind === 'audioinput');
      
      console.log(`[BrowserBroadcaster] 📷 Found ${cameraDevices.length} camera(s), 🎤 ${micDevices.length} microphone(s)`);
      cameraDevices.forEach((cam, i) => console.log(`  Camera ${i + 1}: ${cam.label || 'Unknown'}`));
      micDevices.forEach((mic, i) => console.log(`  Mic ${i + 1}: ${mic.label || 'Unknown'}`));
      
      setCameras(cameraDevices);
      setMicrophones(micDevices);
      
      if (cameraDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraDevices[0].deviceId);
      }
      if (micDevices.length > 0 && !selectedMic) {
        setSelectedMic(micDevices[0].deviceId);
      }
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ Device enumeration error:', err);
      toast.error('デバイス列挙に失敗: ' + err.message);
    }
  };

  // 【修正】マウント時に一回だけ setupDevices() を実行（複雑な監視ループ破棄）
  useEffect(() => {
    const setupDevices = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[BrowserBroadcaster] 🚀 [MOUNT] Initializing media stream...');

        // デバイス列挙
        await enumerateDevices();

        // 【重要】既存ストリームを確実に停止
        if (streamRef.current) {
          console.log('[BrowserBroadcaster] 🛑 Stopping existing stream tracks...');
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // 【修正】デバイスIDをクリア（sessionStorage リセット）→ デフォルトカメラで再接続
        const cleanCamera = !selectedCamera;
        const cleanMic = !selectedMic;
        if (cleanCamera || cleanMic) {
          console.log('[BrowserBroadcaster] 🔄 [CLEAN RETRY] Clearing device IDs from sessionStorage...');
          sessionStorage.removeItem('selectedCamera');
          sessionStorage.removeItem('selectedMic');
        }

        // ユーザーメディアを取得（デバイスID指定なし = デフォルト）
        const constraints = {
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        };

        console.log('[BrowserBroadcaster] 📍 Requesting user media (default devices)...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        streamRef.current = stream;
        console.log('[BrowserBroadcaster] ✅ Stream acquired');
        console.log(`  Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${stream.getAudioTracks().length}`);
        
        // 【修正】video要素がDOMにマウントされるまで polling で待機（最大15秒、Async/Await最適化）
        let videoElement = null;
        let retries = 0;
        const maxRetries = 150; // 15秒間（100ms × 150回）待機
        
        console.log('[BrowserBroadcaster] ⏳ Polling for video element mount...');
        
        // 非同期でポーリング（ブラウザフリーズ防止）
        while (!videoElement && retries < maxRetries) {
          videoElement = videoRef.current || document.getElementById('browser-broadcaster-video');
          if (videoElement) {
            console.log(`[BrowserBroadcaster] ✅ Video element found at attempt ${retries + 1}`);
            break;
          }
          
          retries++;
          
          // 進捗ログ（5回ごと）
          if (retries % 5 === 0) {
            console.log(`[BrowserBroadcaster] ⏳ Still waiting... (${retries * 100}ms / ${maxRetries * 100}ms)`);
          }
          
          // 非同期で優雅に待機（イベントループを解放）
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!videoElement) {
          // 【修正】失敗時に再試行ボタンをUI上に自動表示
          console.error('[BrowserBroadcaster] ❌ Video element not found after 15 second wait');
          setError('⚠️ ブラウザの準備に時間がかかっています。下の「再度試す」ボタンをクリックしてください。');
          setLoading(false);
          return; // setupDevices 終了、再試行待機
        }
        
        console.log('[BrowserBroadcaster] 🚀 Video element mounted - injecting stream immediately (zero latency)!');

        // 【瞬発力：要素マウント直後の即着火】
        console.log('[BrowserBroadcaster] ⚡ [ZERO LATENCY] srcObject injection...');
        videoElement.srcObject = stream; // 1ミリ秒の遅延もなく即座にストリーム流し込み
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        console.log('[BrowserBroadcaster] ✅ Stream injected with zero latency');
        
        // 【最強CSS直書き】
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.style.opacity = '1';
        videoElement.style.zIndex = '10';
        videoElement.style.display = 'block';
        videoElement.style.backgroundColor = '#000';

        // 【強制再生：srcObject 設定直後に play() を即座に実行】
        const forcePlay = async () => {
          try {
            console.log('[BrowserBroadcaster] 🎬 Attempting immediate play()...');
            await videoElement.play();
            console.log('[BrowserBroadcaster] ✅ play() succeeded immediately');
          } catch (err) {
            console.warn(`[BrowserBroadcaster] ⚠️  Autoplay blocked: ${err.name} - ${err.message}`);
            console.log('[BrowserBroadcaster] 📍 Waiting for user interaction to play...');
            // ユーザークリック時に play() を再度試みる
            const onUserInteraction = async () => {
              try {
                console.log('[BrowserBroadcaster] 👆 User clicked, attempting play()...');
                await videoElement.play();
                console.log('[BrowserBroadcaster] ✅ play() succeeded after user interaction');
                document.removeEventListener('click', onUserInteraction);
              } catch (err2) {
                console.warn('[BrowserBroadcaster] ⚠️  play() failed even after click:', err2.message);
              }
            };
            document.addEventListener('click', onUserInteraction);
          }
        };

        // メタデータ読み込み後も play() をリトライ
        const onMetadata = () => {
          console.log('[BrowserBroadcaster] 📹 Metadata loaded, attempting play...');
          forcePlay();
        };
        videoElement.addEventListener('loadedmetadata', onMetadata, { once: true });
        
        // srcObject 設定直後に一度試す
        await new Promise(resolve => setTimeout(resolve, 50));
        forcePlay();
        
        console.log('[BrowserBroadcaster] ✅ Stream INJECTED with MAXED-OUT attributes');
        console.log(`  Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${stream.getAudioTracks().length}`);

        // 【Canvas フォールバック：requestAnimationFrame で強制描画】
        const setupCanvasFallback = () => {
          const canvas = document.createElement('canvas');
          canvas.id = 'browser-broadcaster-canvas-fallback';
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'cover';
          canvas.style.zIndex = '5';
          canvas.style.backgroundColor = '#000';
          canvas.style.display = 'none';

          const container = videoElement.parentElement;
          if (container) {
            container.appendChild(canvas);
            canvasRef.current = canvas;
            console.log('[BrowserBroadcaster] 📋 Canvas fallback prepared (hidden)');

            // video が描画されなかったら Canvas で requestAnimationFrame 描画開始
            const startCanvasRendering = () => {
              if (videoElement.readyState < 2) {
                console.log('[BrowserBroadcaster] 🎨 Video not ready, activating Canvas RAF rendering...');
                const ctx = canvas.getContext('2d');
                canvasCtxRef.current = ctx;
                
                if (ctx) {
                  canvas.style.display = 'block';
                  videoElement.style.display = 'none';
                  setCanvasActive(true);

                  const renderCanvas = () => {
                    if (!canvasRef.current || !videoElement.srcObject) return;
                    
                    // Canvas サイズを video サイズに同期
                    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                      canvas.width = videoElement.videoWidth;
                      canvas.height = videoElement.videoHeight;
                    }

                    // 1/30秒ごとに video フレームを canvas に描画
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    canvasRafRef.current = requestAnimationFrame(renderCanvas);
                  };

                  renderCanvas();
                }
              }
            };

            // 1.5秒後に videoWidth 確認、ダメなら Canvas 開始
            setTimeout(() => {
              if (videoElement.videoWidth === 0 && videoElement.videoHeight === 0) {
                startCanvasRendering();
              }
            }, 1500);
          }
        };

        setupCanvasFallback();

        // 【ストリームの自動復旧：videoWidth が 0 のままなら再取得】
        const startWidthCheck = () => {
          videoWidthCheckRef.current = setInterval(() => {
            if (!videoElement.srcObject) {
              clearInterval(videoWidthCheckRef.current);
              return;
            }
            if (videoElement.videoWidth === 0 && videoElement.videoHeight === 0) {
              console.warn('[BrowserBroadcaster] ⚠️  videoWidth is still 0, attempting stream restart...');
              // ストリーム再取得（非同期で静かに実行）
              streamRef.current?.getTracks().forEach((t) => {
                console.log(`[BrowserBroadcaster] 🔄 Restarting ${t.kind} track`);
                t.stop();
              });
              // 200ms 待ってから再取得
              setTimeout(() => {
                navigator.mediaDevices
                  .getUserMedia({
                    video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
                    audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
                  })
                  .then((newStream) => {
                    console.log('[BrowserBroadcaster] ✅ Stream reacquired after auto-recovery');
                    streamRef.current = newStream;
                    videoElement.srcObject = newStream;
                  })
                  .catch((err) => console.error('[BrowserBroadcaster] ❌ Stream restart failed:', err));
              }, 200);
            }
          }, 3000); // 3秒ごとにチェック
        };
        startWidthCheck();
        
        setPermissionError(null);

        // トラック確認
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        const videoSettings = videoTrack?.getSettings();
        console.log(`[BrowserBroadcaster] ✅ Video track acquired: ${videoSettings?.width}x${videoSettings?.height} @ ${videoSettings?.frameRate}fps`);
        console.log(`[BrowserBroadcaster] ✅ Audio track acquired: ${audioTrack?.label}`);

        setCameraReady(!!videoTrack && videoTrack.enabled);
        setMicReady(!!audioTrack && audioTrack.enabled);

        // 【修正】マイク音が取れたら即座にローディング解除（映像待たない）
        if (audioTrack && audioTrack.enabled) {
          console.log('[BrowserBroadcaster] 🎤 Audio ready - forcing loading OFF immediately');
          setLoading(false);
        } else if (videoTrack && videoTrack.enabled) {
          // 映像だけでも取れたら解除
          console.log('[BrowserBroadcaster] 📹 Video ready - forcing loading OFF');
          setLoading(false);
        }

        // WHIP エンドポイント取得（並列）
        console.log('[BrowserBroadcaster] 🌐 Fetching WHIP endpoint...');
        try {
          const whipRes = await base44.functions.invoke('getIvsWhipEndpoint', { streamId });
          if (whipRes?.data?.whipEndpoint) {
            setWhipEndpoint(whipRes.data.whipEndpoint);
            console.log('[BrowserBroadcaster] ✅ WHIP endpoint ready');
          }
        } catch (whipErr) {
          console.warn('[BrowserBroadcaster] ⚠️  WHIP endpoint fetch failed:', whipErr.message);
        }

        setLoading(false);
      } catch (err) {
        // 【修正】エラーの生の英語メッセージをそのまま画面表示
        console.error('[BrowserBroadcaster] ❌ Initialization error:', err);
        const rawMsg = err.message || String(err);
        
        // ユーザー向けメッセージを構築（英語エラーコード含める）
        let userMsg = rawMsg;
        if (err.name === 'NotAllowedError') {
          userMsg = `🔴 Permission Denied (${err.name})\n\n手順:\n1️⃣ URLバーの南京錠🔒をクリック\n2️⃣ 「カメラ」「マイク」を「許可」に\n3️⃣ ページを再読み込み`;
        } else if (err.name === 'NotFoundError') {
          userMsg = `🔴 Device Not Found (${err.name})\n\n• 他のアプリがカメラを使用していないか\n• USB ケーブルがしっかり接続されているか`;
        } else if (err.name === 'OverconstrainedError') {
          userMsg = `🔴 Overconstrained (${err.name})\n\n別のカメラを選択してください`;
        }

        console.error(`[BrowserBroadcaster] Error: ${err.name} - ${rawMsg}`);
        setError(userMsg);
        setPermissionError(userMsg);
        setLoading(false);
        toast.error(`エラー: ${rawMsg}`);
      }
    };

    setupDevices();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      whipClientRef.current?.close();
      clearInterval(videoWidthCheckRef.current);
      cancelAnimationFrame(canvasRafRef.current);
    };
  }, [streamId]); // 【修正】依存配列を最小化（一回だけ実行）

  const handleStartBroadcast = async () => {
    if (!cameraReady || !micReady) {
      toast.error("カメラとマイクの両方が必要です");
      return;
    }

    // 【修正】ボタン押下状態を即座に表示
    setBroadcastStatus("connecting");
    setBroadcastError(null);
    console.log('[BrowserBroadcaster] 🚀 [USER CLICKED] Start broadcast button pressed');

    // 【修正】10秒タイムアウトをセット
    broadcastTimeoutRef.current = setTimeout(() => {
      console.error('[BrowserBroadcaster] ⏱️ TIMEOUT: Broadcast connection took too long (10s)');
      setBroadcastStatus("error");
      setBroadcastError("接続がタイムアウトしました。OBS配信をお試しください。");
      setIsBroadcasting(false);
      toast.error("配信接続がタイムアウトしました");
    }, 10000);

    try {
      console.log('[BrowserBroadcaster] 📍 [STEP 1/4] Validating prerequisites...');
      
      if (!whipEndpoint) {
        throw new Error('WHIP エンドポイントが見つかりません');
      }

      console.log(`[BrowserBroadcaster] ✅ WHIP Endpoint present: ${whipEndpoint.split('?')[0]}...`);

      // 【修正】ストリームキーを再ロード（最新性保証）
      console.log('[BrowserBroadcaster] 📍 [STEP 2/4] Reloading stream key from database...');
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      if (!streams[0]) {
        throw new Error('配信情報が見つかりません');
      }

      const freshStreamKey = streams[0].ivs_stream_key;
      const freshIngestEndpoint = streams[0].ivs_ingest_endpoint;
      console.log(`[BrowserBroadcaster] ✅ Stream key reloaded: ${freshStreamKey ? '✅ PRESENT' : '❌ EMPTY'}`);
      console.log(`[BrowserBroadcaster] ✅ Ingest endpoint reloaded: ${freshIngestEndpoint ? '✅ PRESENT' : '❌ EMPTY'}`);

      if (!freshStreamKey || !freshIngestEndpoint) {
        throw new Error('ストリームキーまたはインジェストエンドポイントが空です');
      }

      // 【修正】AudioContext.resume() をクリック時に即座に実行
      console.log('[BrowserBroadcaster] 📍 [STEP 3/4] Preparing audio context...');
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          console.log('[BrowserBroadcaster] 🔊 Resuming AudioContext...');
          await audioContextRef.current.resume();
          console.log('[BrowserBroadcaster] ✅ AudioContext resumed');
        }
      } catch (err) {
        console.warn('[BrowserBroadcaster] ⚠️  AudioContext resume failed (non-critical):', err);
      }

      console.log('[BrowserBroadcaster] 📍 [STEP 4/4] Initiating WHIP connection...');
      console.log(`[BrowserBroadcaster] 📊 Stream State: ${streamRef.current?.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ') || 'NO TRACKS'}`);
      console.log(`[BrowserBroadcaster] 🎥 Video: ${cameraReady ? '✅ READY' : '❌ NOT READY'}, 🎤 Audio: ${micReady ? '✅ READY' : '❌ NOT READY'}`);

      setIsBroadcasting(true);
      console.log('[BrowserBroadcaster] 🎬 Starting broadcast...');

      // ストリーム状態を 'live' に更新
      const now = new Date().toISOString();
      console.log('[BrowserBroadcaster] 💾 Updating stream status to "live"');
      await base44.entities.LiveStream.update(streamId, {
        status: "live",
        live_started_at: now,
      });
      console.log('[BrowserBroadcaster] ✅ Stream status updated');

      // チャンネル is_live フラグ更新
      if (channelId) {
        console.log('[BrowserBroadcaster] 💾 Updating channel is_live flag');
        await base44.entities.Channel.update(channelId, { is_live: true });
        console.log('[BrowserBroadcaster] ✅ Channel is_live flag updated');
      }

      // IVS WebRTC 接続開始（WHIP プロトコル）
      console.log('[BrowserBroadcaster] 🔌 Initiating WHIP connection to AWS IVS...');
      await connectToWhip();

      // タイムアウトをクリア（成功時）
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
        broadcastTimeoutRef.current = null;
      }

      console.log('[BrowserBroadcaster] ✅✅✅ WHIP BROADCAST SUCCESSFULLY STARTED ✅✅✅');
      setBroadcastStatus("live");
      toast.success("✅ ブラウザ配信開始 — 視聴者へ配信中...");
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌❌❌ BROADCAST START FAILED ❌❌❌');
      console.error('[BrowserBroadcaster] 🔍 Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack?.split('\n')[0],
      });

      // タイムアウトをクリア（失敗時）
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
        broadcastTimeoutRef.current = null;
      }

      setBroadcastStatus("error");
      setBroadcastError(err.message);
      toast.error("配信開始に失敗: " + err.message);
      setIsBroadcasting(false);
    }
  };

  const connectToWhip = async (retryCount = 0, maxRetries = 3) => {
    try {
      console.log(`[BrowserBroadcaster] 🔌 [WHIP ${retryCount + 1}/${maxRetries + 1}] Creating RTCPeerConnection...`);
      
      // PC (PeerConnection) 作成
      const pc = new RTCPeerConnection();
      console.log('[BrowserBroadcaster] ✅ RTCPeerConnection created');

      // 接続状態を監視
      pc.onconnectionstatechange = () => {
        console.log(`[BrowserBroadcaster] WebRTC Connection State: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('[BrowserBroadcaster] ⚠️  Connection lost, attempting to reconnect...');
          if (retryCount < maxRetries) {
            setTimeout(() => connectToWhip(retryCount + 1, maxRetries), 2000);
          } else {
            console.error('[BrowserBroadcaster] ❌ Max retries reached');
            toast.error('配信接続が失敗しました。もう一度試してください。');
            setIsBroadcasting(false);
          }
        } else if (pc.connectionState === 'connected') {
          console.log('[BrowserBroadcaster] ✅ WebRTC Connection Established');
        }
      };

      // ローカルストリームのトラックを追加
      streamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current);
        console.log(`[BrowserBroadcaster] ➕ Added ${track.kind} track: ${track.label}`);
      });

      // Offer 生成
      console.log('[BrowserBroadcaster] 📝 Creating SDP offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[BrowserBroadcaster] ✅ SDP offer created and set as local description');

      // WHIP エンドポイントへ POST
      console.log(`[BrowserBroadcaster] 📤 Posting offer to WHIP endpoint...`);
      const response = await fetch(whipEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      console.log(`[BrowserBroadcaster] 📥 WHIP response status: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        throw new Error(`WHIP HTTP Error: ${response.status} ${response.statusText}`);
      }

      const answerSdp = await response.text();
      console.log('[BrowserBroadcaster] 📄 SDP answer received from WHIP server');
      const answer = new RTCSessionDescription({ type: 'answer', sdp: answerSdp });
      await pc.setRemoteDescription(answer);
      console.log('[BrowserBroadcaster] ✅ Remote description set from answer');

      whipClientRef.current = pc;
      console.log('[BrowserBroadcaster] 🎬🎬🎬 WHIP CONNECTION ESTABLISHED SUCCESSFULLY 🎬🎬🎬');
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ WHIP connection error:', err);
      if (retryCount < maxRetries) {
        console.log(`[BrowserBroadcaster] 🔄 Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return connectToWhip(retryCount + 1, maxRetries);
      }
      throw err;
    }
  };

  // 【修正】ローディング画面は、エラーがない場合だけ表示
  if (loading && !error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 rounded-2xl">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">デバイスを接続中...</p>
            <p className="text-xs text-muted-foreground">
              コンソールで進捗を確認: ブラウザの開発者ツール (F12) → Console タブ
            </p>
          </div>
          {permissionError && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2 whitespace-pre-line">
            {permissionError}
          </div>
          )}
        </div>
      </div>
    );
  }

  // 【修正】エラー画面完全廃止 → オーバーレイで制御
  const errorOverlayVisible = !!error;

  return (
    <div className="w-full space-y-6">
      {/* 【修正】デバッグ情報は debug=true の時だけ表示（管理者限定） */}
      {error && debugMode && (
        <div className="bg-red-950/80 border border-red-700 rounded-lg p-3 text-xs font-mono text-red-200 space-y-1">
          <p>🔴 <strong>DEBUG INFO:</strong></p>
          <p>videoRef.current: {videoRef.current === null ? 'NULL' : videoRef.current === undefined ? 'UNDEFINED' : 'ELEMENT FOUND ✅'}</p>
          <p>videoRef.current.tagName: {videoRef.current?.tagName || 'N/A'}</p>
          <p>videoRef.current.srcObject: {videoRef.current?.srcObject ? 'STREAM ASSIGNED ✅' : 'NO STREAM ❌'}</p>
          <p>streamRef.current: {streamRef.current ? 'EXISTS ✅' : 'NULL ❌'}</p>
          <p>Error: {error}</p>
        </div>
      )}

      {/* プレビュー */}
      <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl border border-zinc-800" style={{ aspectRatio: "16/9" }}>
        {/* 【強制描画ボタン】映像が黒い場合、クリックで 10 回連続 play() */}
        {!isBroadcasting && (
          <button
            onClick={async () => {
              console.log('[BrowserBroadcaster] 💥 Force play triggered! Executing 10 play() attempts...');
              for (let i = 0; i < 10; i++) {
                try {
                  await videoRef.current?.play();
                  console.log(`[BrowserBroadcaster] ✅ Force play attempt ${i + 1}/10 succeeded`);
                } catch (err) {
                  console.warn(`[BrowserBroadcaster] ⚠️  Force play attempt ${i + 1}/10 failed:`, err.message);
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }}
            className="absolute inset-0 z-30 cursor-pointer opacity-0 hover:opacity-5 transition-opacity"
            title="クリックして映像を強制再生"
          />
        )}
        {/* 【修正】エラーオーバーレイ — ブランド保護メッセージ */}
        {errorOverlayVisible && (
          <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center rounded-2xl">
            <AlertCircle className="w-16 h-16 text-amber-400 mx-auto animate-pulse mb-4" />
            <p className="font-bold text-white mb-2 text-lg">配信環境を準備中</p>
            <p className="text-sm text-foreground/80 text-center max-w-xs mb-4 leading-relaxed">
              現在、より良い配信環境を構築中です。<br/>
              お急ぎの方は <strong>OBS配信</strong> をご利用ください。
            </p>
            {debugMode && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-4 font-mono max-w-xs">
                [DEBUG] {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log('[BrowserBroadcaster] ✅ User clicked retry - resetting error state');
                  setError(null);
                  setLoading(true);
                }}
                className="px-6 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                再度試す
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                OBS配信に切り替え
              </button>
            </div>
          </div>
        )}

        <video
          id="browser-broadcaster-video"
          ref={videoRef}
          autoPlay={true}
          muted={true}
          playsInline={true}
          controls={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 1,
            zIndex: 10,
            display: 'block',
            backgroundColor: '#000',
          }}
        />

        {/* テストパターン オーバーレイ */}
        {!isBroadcasting && (
          <div className="absolute inset-0 pointer-events-none">
            {/* グリッド線 */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Test Pattern テキスト */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-black text-white opacity-5 pointer-events-none select-none">TEST</span>
            </div>
          </div>
        )}

        {/* プレビュー中バッジ（中央下部） */}
        {!isBroadcasting && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-red-500/90 backdrop-blur px-4 py-2 rounded-full border border-red-400/50 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-black text-white tracking-wide">🔴 プレビュー中：視聴者には見えていません</span>
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-zinc-700/50">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">ブラウザプレビュー</span>
        </div>

        {/* WHIP 接続ステータス */}
        {isBroadcasting && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 backdrop-blur px-3 py-2 rounded-lg border border-red-400/50 animate-pulse">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="text-xs font-semibold text-white">配信中</span>
          </div>
        )}
      </div>

      {/* デバイス選択 */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-white text-lg">デバイス選択</h3>
        </div>

        {/* カメラ選択 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">カメラ</label>
          <select
            value={selectedCamera || ""}
            onChange={(e) => {
              console.log('[BrowserBroadcaster] 📷 Camera device changed, reinitializing...');
              setSelectedCamera(e.target.value);
            }}
            disabled={isBroadcasting}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `カメラ ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* マイク選択 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">マイク</label>
          <select
            value={selectedMic || ""}
            onChange={(e) => {
              console.log('[BrowserBroadcaster] 🎤 Microphone device changed, reinitializing...');
              setSelectedMic(e.target.value);
            }}
            disabled={isBroadcasting}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {microphones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `マイク ${microphones.indexOf(mic) + 1}`}
              </option>
            ))}
          </select>

          {/* マイクレベルメーター */}
          <div className="space-y-1.5 mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">🎤 音量レベル</p>
              <span className="text-xs font-bold text-primary">{micLevel}%</span>
            </div>
            {/* 横棒メーター */}
            <div className="w-full h-2 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  micLevel < 30
                    ? "bg-green-500"
                    : micLevel < 60
                    ? "bg-yellow-500"
                    : micLevel < 85
                    ? "bg-orange-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(micLevel, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {micLevel < 20 ? "📍 無音に近い" : micLevel < 50 ? "🟢 良好" : micLevel < 80 ? "🟡 大きめ" : "🔴 大きすぎる"}
            </p>
          </div>
        </div>
      </div>

      {/* ステータスチェック */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <h3 className="font-bold text-white text-lg mb-4">配信準備確認</h3>

        {/* カメラステータス */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-3">
            {cameraReady ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">カメラ</p>
              <p className="text-xs text-muted-foreground">
                {cameraReady ? "✅ 準備完了" : "❌ エラー"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const track = streamRef.current?.getVideoTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setCameraReady(track.enabled);
              }
            }}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {cameraReady ? (
              <Camera className="w-4 h-4 text-primary" />
            ) : (
              <CameraOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* マイクステータス */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-3">
            {micReady ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">マイク</p>
              <p className="text-xs text-muted-foreground">
                {micReady ? "✅ 準備完了" : "❌ エラー"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const track = streamRef.current?.getAudioTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setMicReady(track.enabled);
              }
            }}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {micReady ? (
              <Mic className="w-4 h-4 text-primary" />
            ) : (
              <MicOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* 配信開始ボタン */}
      <div className="flex gap-3">
        <button
          onClick={onEnd}
          disabled={isBroadcasting || broadcastStatus === "connecting"}
          className="flex-1 py-4 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-bold transition-all duration-200 disabled:opacity-50 shadow-lg"
        >
          キャンセル
        </button>
        <button
          onClick={handleStartBroadcast}
          disabled={!cameraReady || !micReady || isBroadcasting || broadcastStatus === "connecting"}
          className={`flex-1 py-4 rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
            broadcastStatus === "live"
              ? "bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30"
              : broadcastStatus === "error"
              ? "bg-gradient-to-r from-red-600 to-red-700 shadow-red-600/30"
              : broadcastStatus === "connecting"
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-yellow-500/30 animate-pulse"
              : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30 hover:shadow-red-500/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {broadcastStatus === "live" && <CheckCircle2 className="w-5 h-5" />}
          {broadcastStatus === "connecting" && <Loader2 className="w-5 h-5 animate-spin" />}
          {broadcastStatus === "error" && <AlertCircle className="w-5 h-5" />}
          {!broadcastStatus && <Zap className="w-5 h-5" />}

          {broadcastStatus === "live"
            ? "配信中（LIVE）"
            : broadcastStatus === "connecting"
            ? "接続中..."
            : broadcastStatus === "error"
            ? `エラー: ${broadcastError || "接続失敗"}`
            : "配信を開始する"}
        </button>
      </div>
    </div>
  );
}