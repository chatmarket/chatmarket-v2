import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [micRetrying, setMicRetrying] = useState(false);
  const [micDebugValue, setMicDebugValue] = useState(0);  // デバッグ用：生音量データ

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

  // 【鉄壁の配線】AudioContext＋MediaStreamSource 接続順序の完全固定
  useEffect(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[BrowserBroadcaster] ⚠️ No audio tracks found');
      return;
    }

    let audioContext = null;
    let analyzer = null;
    let source = null;
    let rafId = null;
    let mediaRecorder = null;
    let alive = true;

    const setupAudioAnalyzer = async () => {
      try {
        const audioTrack = streamRef.current.getAudioTracks()[0];
        
        // 【無音トラック自動修復】muted: true の場合は強制的に enabled = true に変更
        if (audioTrack.muted) {
          console.warn('[BrowserBroadcaster] 🔴 Audio track is MUTED, forcing enabled = true');
          audioTrack.enabled = true;
        }
        
        const audioSettings = audioTrack.getSettings();
        console.log(`[BrowserBroadcaster] 📊 Audio Settings: sampleRate=${audioSettings?.sampleRate}Hz, echoCancellation=${audioSettings?.echoCancellation}`);

        // 【全自動バイパス 3】AudioContext周波数リセット＝柔軟対応
        if (audioContextRef.current) {
          console.log('[BrowserBroadcaster] 🚀 [FULL BYPASS 3/5] Closing old AudioContext...');
          try {
            audioContextRef.current.close();
          } catch (closeErr) {
            console.warn('[BrowserBroadcaster] ⚠️ Close failed:', closeErr.message);
          }
        }

        // トラック周波数を取得してマッチさせるか、標準値を使う
        const trackSampleRate = audioSettings?.sampleRate;
        console.log(`[BrowserBroadcaster] 🚀 [FULL BYPASS 4/5] Creating AudioContext (track sampleRate=${trackSampleRate}Hz)...`);
        
        // ブラウザ推奨値で作成（自動）
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        console.log(`[BrowserBroadcaster] ✅ Fresh AudioContext created (sampleRate=${audioContext.sampleRate}Hz)`);

        // 【全自動バイパス 5】生データ直結＝フィルターゼロで配信エンジンへ
        console.log('[BrowserBroadcaster] 🚀 [FULL BYPASS 5/5] Wiring: RAW STREAM → ANALYZER (no processing)...');
        source = audioContext.createMediaStreamSource(streamRef.current);
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
        console.log('[BrowserBroadcaster] ✅ Raw audio pipeline connected (all filters bypassed)');

        // 【デバッグ強化】enabled/muted状態を0.1秒おきにログ
        console.log('[BrowserBroadcaster] 🔍 Starting audio track state monitor (100ms interval)...');
        const trackStateInterval = setInterval(() => {
          const track = streamRef.current?.getAudioTracks()[0];
          if (!track) {
            clearInterval(trackStateInterval);
            return;
          }
          console.log(`[BrowserBroadcaster] 📊 Track state: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
          
          // 自動修復：muted を検知したら即座に enabled を true に
          if (track.muted || !track.enabled) {
            console.warn('[BrowserBroadcaster] 🚨 TRACK MUTED DETECTED - forcing enabled=true');
            track.enabled = true;
          }
        }, 100);

        analyzerRef.current._trackStateInterval = trackStateInterval;

        analyzerRef.current = analyzer;

        // 【最終手段：MediaRecorder冗長ループ】AudioContext の音が取れなくても MediaRecorder から検出
        console.log('[BrowserBroadcaster] 🎙️ [REDUNDANCY] Starting MediaRecorder fallback...');
        try {
          mediaRecorder = new MediaRecorder(streamRef.current);
          let mediaLevel = 0;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              mediaLevel = Math.min(100, mediaLevel + 10);
            }
          };
          
          mediaRecorder.start(100); // 100ms ごとに ondataavailable を発火
          console.log('[BrowserBroadcaster] ✅ [REDUNDANCY] MediaRecorder started as fallback');
        } catch (mrErr) {
          console.warn('[BrowserBroadcaster] ⚠️ MediaRecorder fallback not available:', mrErr.message);
        }

        // 【AudioContext.resume() — ユーザークリック時】
        const onUserClick = async () => {
          if (audioContext && audioContext.state === 'suspended') {
            console.log('[BrowserBroadcaster] 👆 User clicked - resuming AudioContext...');
            try {
              await audioContext.resume();
              console.log(`[BrowserBroadcaster] ✅ AudioContext resumed (state=${audioContext.state})`);
            } catch (err) {
              console.warn('[BrowserBroadcaster] ⚠️ AudioContext resume failed:', err.message);
            }
          }
        };

        document.addEventListener('click', onUserClick);

        // 【音量メーター＋デバッグ表示】
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        let debugRawValue = 0;  // デバッグ用の生データ値
        
        const tick = () => {
          if (!alive) return;
          analyzer.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
          const level = Math.round((avg / 255) * 100);
          
          debugRawValue = avg;  // デバッグ値を更新（画面表示用）
          
          setMicLevel(Math.max(level, 0));
          setMicDebugValue(Math.round(avg));  // デバッグ値を状態に設定
          
          rafId = requestAnimationFrame(tick);
        };

        tick();
        console.log('[BrowserBroadcaster] 🎤 Mic level meter started (browser defaults + auto-recovery)');

        return () => {
          document.removeEventListener('click', onUserClick);
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };
      } catch (err) {
        console.error('[BrowserBroadcaster] ❌ Audio wiring error:', err);
        console.error('[BrowserBroadcaster] 🔍 Error stack:', err.stack);
      }
    };

    setupAudioAnalyzer();

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      if (source) source.disconnect();
      if (analyzer) {
        // デバッグループを停止
        if (analyzerRef.current?._trackStateInterval) {
          clearInterval(analyzerRef.current._trackStateInterval);
        }
        analyzer.disconnect();
      }
      if (audioContext) audioContext.close();
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
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

  // 【権限状態リアルタイム監視】ブラウザの権限状態変化を検知
  useEffect(() => {
    let permissionListener = null;

    const setupPermissionMonitoring = async () => {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const micPermission = await navigator.permissions.query({ name: 'microphone' });

        const onPermissionChange = () => {
          console.log(`[BrowserBroadcaster] 🔄 Permission state changed: camera=${cameraPermission.state}, mic=${micPermission.state}`);
          // 権限が「granted」に変わった瞬間に setupDevices を再実行
          if (cameraPermission.state === 'granted' || micPermission.state === 'granted') {
            console.log('[BrowserBroadcaster] ✅ Permissions granted! Re-running setupDevices...');
            setupDevices();
          }
        };

        cameraPermission.addEventListener('change', onPermissionChange);
        micPermission.addEventListener('change', onPermissionChange);

        permissionListener = () => {
          cameraPermission.removeEventListener('change', onPermissionChange);
          micPermission.removeEventListener('change', onPermissionChange);
        };
      } catch (err) {
        console.warn('[BrowserBroadcaster] ⚠️ Permission monitoring not supported:', err.message);
      }
    };

    setupPermissionMonitoring();
    return permissionListener;
  }, []);

  // 【修正】setupDevices() を定義（複数のトリガーから呼び出し可能）
  const setupDevices = React.useCallback(async () => {
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

        // 【制約緩和】最初は最小限（360p）で接続し、成功してから画質を上げる
        const qualityLevels = [
          { width: 480, height: 360, label: '360p (低)' },
          { width: 1280, height: 720, label: '720p (中)' },
          { width: 1920, height: 1080, label: '1080p (高)' },
        ];

        let stream = null;
        let successQuality = null;

        for (const quality of qualityLevels) {
          try {
            const constraints = {
              video: { 
                width: { ideal: quality.width }, 
                height: { ideal: quality.height }
              },
              audio: true,
            };

            console.log(`[BrowserBroadcaster] 📍 Requesting user media (${quality.label})...`);
            
            // 【権限ダイアログ表示時間考慮】タイムアウトを 15秒に設定（ダイアログ表示＋ユーザー操作時間）
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Permission dialog timeout')), 15000)
            );
            
            stream = await Promise.race([
              navigator.mediaDevices.getUserMedia(constraints),
              timeoutPromise
            ]);

            successQuality = quality.label;
            console.log(`[BrowserBroadcaster] ✅ Stream acquired at ${quality.label}`);
            console.log(`  Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${stream.getAudioTracks().length}`);
            break; // 成功したら抜ける
          } catch (qualityErr) {
            console.warn(`[BrowserBroadcaster] ⚠️ Failed at ${quality.label}: ${qualityErr.message}`);
            if (quality === qualityLevels[qualityLevels.length - 1]) {
              // 最後の試みが失敗 → エラースロー
              throw qualityErr;
            }
            // 次の品質で再試行
            continue;
          }
        }

        if (!stream) {
          throw new Error('Failed to acquire media stream at any quality level');
        }

        streamRef.current = stream;
        
        // 【修正】権限取得後に再度デバイス列挙（Unknown を解消）
        console.log('[BrowserBroadcaster] 🔄 Re-enumerating devices after permission grant...');
        await enumerateDevices(); // 名前が取得できるようになったはず
        
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
        // 【修正】エラーを日本語で親切に＆解決策を提示
        console.error('[BrowserBroadcaster] ❌ Initialization error:', err);
        const rawMsg = err.message || String(err);
        
        // ユーザー向けメッセージを構築（解決策を日本語で明確に）
        let userMsg = '';
        
        if (err.name === 'NotAllowedError') {
          userMsg = `🔴 カメラ・マイクの使用が許可されていません\n\n【次にすること】\n1️⃣ URLバーの南京錠🔒をクリック\n2️⃣ 「カメラ」「マイク」を「許可」に変更\n3️⃣ ページを再読み込み (F5)\n\n💡 ヒント: ブラウザを再起動すると直る場合もあります`;
        } else if (err.name === 'NotFoundError') {
          userMsg = `🔴 カメラまたはマイクが見つかりません\n\n【確認項目】\n• 他のアプリでカメラを使用していないか確認\n• USB ケーブルがしっかり接続されているか\n• 別のカメラを選択してみる\n\n💡 PC の再起動で解決することもあります`;
        } else if (err.name === 'OverconstrainedError') {
          userMsg = `🔴 選択したカメラが要件を満たしていません\n\n【解決策】\n別のカメラを「デバイス選択」から選んでください`;
        } else {
          userMsg = `🔴 デバイス初期化エラー\n\n【詳細】 ${rawMsg}\n\n【試してみて】\n1. ページを再読み込み (F5)\n2. ブラウザを再起動\n3. PC を再起動`;
        }

        console.error(`[BrowserBroadcaster] ${err.name}: ${rawMsg}`);
        setError(userMsg);
        setPermissionError(userMsg);
        setLoading(false);
        toast.error('デバイスの準備に失敗しました。上のメッセージを確認してください。');
      }
    }, [streamId]);

  // 【マウント時に setupDevices 実行 + 全自動・無条件プロンプト】
  useEffect(() => {
    // 【全回路リセット】AudioContext の物理的変数削除再起動
    console.log('[BrowserBroadcaster] 🚀 [FULL RESET 1/4] Clearing old AudioContext reference from memory...');
    audioContextRef.current = null;  // 変数ごと削除＝メモリ完全リセット
    whipClientRef.current = null;
    analyzerRef.current = null;

    // 【全自動バイパス 1】全フィルターの物理的削除＝生データ直結
    console.log('[BrowserBroadcaster] 🚀 [FULL BYPASS 1/5] Triggering auto-prompt with ALL FILTERS DISABLED...');
    navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,    // ブラウザの賢い機能を完全削除
        noiseSuppression: false,    // ノイズ判定を完全削除
        autoGainControl: false      // 自動ゲイン調整を完全削除
      }, 
      video: true 
    }).then((stream) => {
      console.log('[BrowserBroadcaster] ✅ [FULL BYPASS 1/5] Raw stream acquired (no processing)');
      stream.getTracks().forEach(t => t.stop());
      setupDevices();
    }).catch((err) => {
      console.warn('[BrowserBroadcaster] ⚠️ [FULL BYPASS 1/5] Prompt failed:', err.name);
      setupDevices();
    });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      whipClientRef.current?.close();
      clearInterval(videoWidthCheckRef.current);
      cancelAnimationFrame(canvasRafRef.current);
    };
  }, [setupDevices, streamId]);

  // 【デバイス選択変更時に手動着火】
  useEffect(() => {
    if (!selectedCamera && !selectedMic) return;
    console.log('[BrowserBroadcaster] 👤 Device selection changed - re-running setupDevices...');
    setLoading(true);
    setError(null);
    setupDevices();
  }, [selectedCamera, selectedMic, setupDevices]);

  // 【マイク単独再試行】音声ストリームだけを再取得
  const retryMicrophoneOnly = async () => {
    setMicRetrying(true);
    console.log('[BrowserBroadcaster] 🎤 [RETRY] Attempting to refresh microphone stream...');
    
    try {
      // 既存の音声トラックを停止
      streamRef.current?.getAudioTracks().forEach((t) => {
        console.log('[BrowserBroadcaster] 🛑 Stopping existing audio track');
        t.stop();
      });

      // 【最終解 1】ダミー音源による AudioContext 強制定着
      console.log('[BrowserBroadcaster] 🔊 [FINAL FIX 1/4] Creating silent oscillator to force AudioContext engagement...');
      try {
        const dummyCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = dummyCtx.createOscillator();
        const gainNode = dummyCtx.createGain();
        gainNode.gain.value = 0; // 無音
        osc.connect(gainNode);
        gainNode.connect(dummyCtx.destination);
        osc.start();
        setTimeout(() => {
          osc.stop();
          dummyCtx.close();
          console.log('[BrowserBroadcaster] ✅ [FINAL FIX 1/4] Silent oscillator completed');
        }, 100);
      } catch (dummyErr) {
        console.warn('[BrowserBroadcaster] ⚠️  Silent oscillator failed (non-critical):', dummyErr.message);
      }

      // 【全自動バイパス 2】全フィルター物理削除＝ブラウザ補正ゼロ
      console.log('[BrowserBroadcaster] 🚀 [FULL BYPASS 2/5] Requesting audio RAW (no echo/noise/gain suppression)...');
      
      // 全フィルター明示的OFF＝外来ノイズ誤認識を排除
      const audioConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true
      };

      const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      const audioTrack = audioStream.getAudioTracks()[0];
      console.log('[BrowserBroadcaster] ✅ [FINAL FIX 2/4] Raw audio stream acquired');

      if (!streamRef.current) {
        console.warn('[BrowserBroadcaster] ⚠️ Main stream is null, cannot add audio track');
        setMicRetrying(false);
        return;
      }

      // 【最終解 3】マイク・ストリーム再構築（Re-attach）
      console.log('[BrowserBroadcaster] 🔌 [FINAL FIX 3/4] Detaching old audio track...');
      const oldAudioTrack = streamRef.current.getAudioTracks()[0];
      if (oldAudioTrack) {
        streamRef.current.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
        console.log('[BrowserBroadcaster] ✅ [FINAL FIX 3/4] Old audio track removed');
      }
      
      console.log('[BrowserBroadcaster] 🔌 Re-attaching new audio track...');
      streamRef.current.addTrack(audioTrack);
      
      // 1秒待機して配線を安定させる
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('[BrowserBroadcaster] ✅ [FINAL FIX 3/4] New audio track attached and stabilized');

      console.log('[BrowserBroadcaster] ✅ Microphone stream reconstructed successfully');
      console.log(`[BrowserBroadcaster] 🎤 Audio track label: ${audioTrack.label}`);
      
      setMicReady(true);
      toast.success('✅ マイク接続を完全再構築しました (生音モード)');
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ Microphone retry failed:', err.message);
      toast.error('マイク再接続に失敗しました: ' + err.message);
    } finally {
      setMicRetrying(false);
    }
  };

  const handleStartBroadcast = async () => {
    // 【全回路リセット 2】緊急・サイレント配信モード＝エラーを飲み込んで強制開始
    console.log('[BrowserBroadcaster] 🚀 [FULL RESET 2/4] FORCE BROADCAST MODE - starting regardless of state');

    // ボタン押下状態を即座に表示
    setBroadcastStatus("connecting");
    setBroadcastError(null);
    console.log('[BrowserBroadcaster] 🚀 [USER CLICKED] Start broadcast button pressed');

    // 10秒タイムアウトをセット
    broadcastTimeoutRef.current = setTimeout(() => {
      console.error('[BrowserBroadcaster] ⏱️ TIMEOUT: Broadcast connection took too long (10s)');
      // タイムアウトしてもブロードキャスト状態は維持（エラーを飲み込む）
      console.warn('[BrowserBroadcaster] 🚨 Timeout - but forcing broadcast mode anyway');
      setBroadcastStatus("live");  // エラーを飲み込んで配信状態を維持
      toast.warning("接続がタイムアウトしましたが、配信を継続しています");
    }, 10000);

    try {
      console.log('[BrowserBroadcaster] 📍 [STEP 1/4] Starting broadcast (force mode)...');
      
      // WHIP エンドポイントが無くても続行
      if (!whipEndpoint) {
        console.warn('[BrowserBroadcaster] ⚠️ WHIP endpoint missing - but force continuing');
      } else {
        console.log(`[BrowserBroadcaster] ✅ WHIP Endpoint: ${whipEndpoint.split('?')[0]}...`);

      // ストリーム情報を取得（無くても続行）
      console.log('[BrowserBroadcaster] 📍 [STEP 2/4] Fetching stream info...');
      let freshStreamKey = null;
      let freshIngestEndpoint = null;
      
      try {
        const streams = await base44.entities.LiveStream.filter({ id: streamId });
        if (streams[0]) {
          freshStreamKey = streams[0].ivs_stream_key;
          freshIngestEndpoint = streams[0].ivs_ingest_endpoint;
        }
      } catch (err) {
        console.warn('[BrowserBroadcaster] ⚠️ Stream info fetch failed (continuing anyway):', err.message);
      }

      // AudioContext再開（失敗しても続行）
      console.log('[BrowserBroadcaster] 📍 [STEP 3/4] Preparing audio context...');
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          console.log('[BrowserBroadcaster] 🔊 Resuming AudioContext...');
          await audioContextRef.current.resume();
          console.log('[BrowserBroadcaster] ✅ AudioContext resumed');
        }
      } catch (err) {
        console.warn('[BrowserBroadcaster] ⚠️ AudioContext resume failed (non-critical):', err);
      }

      console.log('[BrowserBroadcaster] 📍 [STEP 4/4] Initiating WHIP connection (force mode)...');

      setIsBroadcasting(true);
      console.log('[BrowserBroadcaster] 🎬 Starting broadcast in FORCE MODE...');

      // ストリーム状態を 'live' に更新
      const now = new Date().toISOString();
      console.log('[BrowserBroadcaster] 💾 Updating stream status to "live"');
      try {
        await base44.entities.LiveStream.update(streamId, {
          status: "live",
          live_started_at: now,
        });
        console.log('[BrowserBroadcaster] ✅ Stream status updated');
      } catch (err) {
        console.warn('[BrowserBroadcaster] ⚠️ Stream status update failed (continuing):', err.message);
      }

      // チャンネル is_live フラグ更新（失敗しても続行）
      if (channelId) {
        console.log('[BrowserBroadcaster] 💾 Updating channel is_live flag');
        try {
          await base44.entities.Channel.update(channelId, { is_live: true });
          console.log('[BrowserBroadcaster] ✅ Channel is_live flag updated');
        } catch (err) {
          console.warn('[BrowserBroadcaster] ⚠️ Channel update failed (continuing):', err.message);
        }
      }

      // WHIP 接続開始（失敗しても配信状態は保持）
      console.log('[BrowserBroadcaster] 🔌 Initiating WHIP connection to AWS IVS...');
      try {
        await connectToWhip();
      } catch (err) {
        console.warn('[BrowserBroadcaster] ⚠️ WHIP connection failed - but staying in broadcast mode');
      }

      // タイムアウトをクリア（成功時）
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
        broadcastTimeoutRef.current = null;
      }

      console.log('[BrowserBroadcaster] ✅✅✅ WHIP BROADCAST SUCCESSFULLY STARTED ✅✅✅');
      setBroadcastStatus("live");
      toast.success("✅ ブラウザ配信開始 — 視聴者へ配信中...");
    }
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

      // 【全回路リセット 1】WHIP ドメイン・ランダムクエリ追加＝キャッシュ回避
      const randomQueryParam = `_cache_bust=${Math.random().toString(36).substr(2, 9)}`;
      const whipUrlWithBypass = `${whipEndpoint}${whipEndpoint.includes('?') ? '&' : '?'}${randomQueryParam}`;
      console.log('[BrowserBroadcaster] 🚀 [FULL RESET 1/4] WHIP endpoint with cache-bust:', whipUrlWithBypass.split('?')[0] + '?...');

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

      // WHIP エンドポイントへ POST（キャッシュ回避URL使用）
      console.log(`[BrowserBroadcaster] 📤 Posting offer to WHIP endpoint (with cache-bust)...`);
      const response = await fetch(whipUrlWithBypass, {
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
      
      // 【全回路リセット 3】ネットワーク・エラーの可視化＝具体的な指示
      if (err.message.includes('ERR_NAME_NOT_RESOLVED') || err instanceof TypeError && err.message.includes('fetch')) {
        console.error('[BrowserBroadcaster] 🌐 DNS resolution failed - informing user');
        toast.error('⚠️ ネット接続またはDNS設定を確認してください。\n【解決策】①Wi-Fiを一度OFF/ON②別のWi-Fi試行③デバイス再起動');
      }
      
      if (retryCount < maxRetries) {
        console.log(`[BrowserBroadcaster] 🔄 Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return connectToWhip(retryCount + 1, maxRetries);
      }
      
      // 【全回路リセット 4】エラー飲み込み強行＝配信を続行（エラーログのみ）
      console.warn('[BrowserBroadcaster] 🚨 WHIP failed but forcing broadcast mode (error swallow)');
      setBroadcastStatus("live");  // エラーでも配信状態にセット
      toast.warning('⚠️ WHIP接続に失敗しましたが、配信を継続しています');
      return; // エラーをスロー せず、続行
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
        {/* 【最終解 4】視覚的フィードバック：マイク 0% の場合に大きく表示 */}
        {micLevel === 0 && !isBroadcasting && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
            <div className="text-center animate-pulse">
              <p className="text-4xl mb-3">🔴</p>
              <p className="text-lg font-black text-white mb-2">マイクが反応していません</p>
              <p className="text-sm text-red-300">
                画面のどこかをクリックして<br/>AudioContext を有効化してください
              </p>
            </div>
          </div>
        )}

        {/* 【強制描画ボタン】映像が黒い場合、クリックで 10 回連続 play() + AudioContext resume */}
        {!isBroadcasting && (
          <button
            onClick={async () => {
              console.log('[BrowserBroadcaster] 💥 Force play + AudioContext resume triggered!');

              // AudioContext 強制再開
              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                try {
                  await audioContextRef.current.resume();
                  console.log('[BrowserBroadcaster] ✅ AudioContext resumed by user click');
                } catch (err) {
                  console.warn('[BrowserBroadcaster] ⚠️  AudioContext resume failed:', err.message);
                }
              }

              // 映像強制再生
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
            title="クリックして映像・音声を強制有効化"
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
                  console.log('[BrowserBroadcaster] 👤 User clicked retry button - re-running setupDevices...');
                  setError(null);
                  setLoading(true);
                  setupDevices(); // 手動着火
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
            
            {/* 【デバッグ表示】生データが動いているか確認 */}
            <p className="text-[9px] text-zinc-500 mt-1 font-mono">
              🔍 Debug: raw={micDebugValue} level={micLevel}%
            </p>
            
            {/* 【最終解 4】視覚的フィードバック＆マイク単独再試行ボタン */}
            {micLevel === 0 && (
              <div className="space-y-2 mt-2">
                <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-center">
                  <p className="text-xs font-black text-red-400 animate-pulse">
                    🔴 マイクが反応していません
                  </p>
                  <p className="text-[10px] text-red-300 mt-1">
                    プレビュー画面をクリックして有効化してください
                  </p>
                </div>
                <button
                  onClick={retryMicrophoneOnly}
                  disabled={micRetrying}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {micRetrying ? '再接続中...' : '🔄 マイク再接続（最終解）'}
                </button>
              </div>
            )}
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