import { useEffect, useState } from 'react';

/**
 * 1対1通話用のカメラ・マイク選択 hook
 *
 * ★ 仮想カメラ（OBS等）を確実に回避し、物理カメラを優先起動
 * ★ ラベル名が空でも実際にストリームを取得して解像度で物理カメラを判定
 * ★ 失敗したら次のデバイスへリトライループ
 */

const VIRTUAL_KEYWORDS = ['obs', 'virtual', 'manycam', 'xsplit', 'snap camera', 'droidcam', 'iriun', 'mmhmm', 'camo'];
const PHYSICAL_KEYWORDS = ['facetime', 'built-in', 'integrated', 'internal', 'usb', 'webcam', 'hd camera', 'truedepth'];

function isVirtualCamera(label) {
  const l = (label || '').toLowerCase();
  return VIRTUAL_KEYWORDS.some(k => l.includes(k));
}

function isKnownPhysical(label) {
  const l = (label || '').toLowerCase();
  return PHYSICAL_KEYWORDS.some(k => l.includes(k));
}

// デバイスを実際に起動して解像度を取得（物理カメラは通常 640x480 以上を返す）
async function probeCamera(deviceId) {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const track = s.getVideoTracks()[0];
    const settings = track.getSettings();
    s.getTracks().forEach(t => t.stop());
    const width = settings.width || 0;
    const height = settings.height || 0;
    console.log(`[probeCamera] deviceId=${deviceId.slice(0,8)} → ${width}x${height}`);
    // 物理カメラは通常 320x240 以上を返す。OBS仮想は 0x0 や失敗することが多い
    return { ok: true, width, height };
  } catch (e) {
    console.warn(`[probeCamera] deviceId=${deviceId.slice(0,8)} failed:`, e.message);
    return { ok: false, width: 0, height: 0 };
  }
}

export function useSmartCameraSelection() {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [selectedMicId, setSelectedMicId] = useState(null);

  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // 1. まず権限を取得してラベルを確定させる
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
        if (tempStream) tempStream.getTracks().forEach(t => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevices = devices.filter(d => d.kind === 'videoinput');
        const aDevices = devices.filter(d => d.kind === 'audioinput');

        setVideoDevices(vDevices);
        setAudioDevices(aDevices);

        console.log('[useSmartCameraSelection] 📋 Video devices:', vDevices.map((d, i) => `[${i}] ${d.label || '(no label)'}`));

        // 2. localStorage に保存済みかつ仮想でないカメラを優先
        const savedId = localStorage.getItem('selectedCameraId');
        const savedDevice = vDevices.find(d => d.deviceId === savedId);
        if (savedDevice && !isVirtualCamera(savedDevice.label)) {
          console.log('[useSmartCameraSelection] 📷 Using saved camera:', savedDevice.label);
          setSelectedCameraId(savedId);
          const s = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: savedId } },
            audio: aDevices[0] ? {
              deviceId: { exact: aDevices[0].deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            } : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          setStream(s);
          setSelectedMicId(s.getAudioTracks()[0]?.getSettings()?.deviceId || aDevices[0]?.deviceId || null);
          return;
        }

        // 3. 候補を優先順位でソート:
        //    ① ラベルで物理カメラと確定できるもの
        //    ② ラベルが空（権限未取得 or Safariの匿名化）
        //    ③ 仮想でないもの
        //    ④ 仮想カメラ（最後の手段）
        const sorted = [...vDevices].sort((a, b) => {
          const aPhys = isKnownPhysical(a.label) ? 0 : isVirtualCamera(a.label) ? 3 : (!a.label ? 1 : 2);
          const bPhys = isKnownPhysical(b.label) ? 0 : isVirtualCamera(b.label) ? 3 : (!b.label ? 1 : 2);
          return aPhys - bPhys;
        });

        console.log('[useSmartCameraSelection] 📋 Sorted candidates:', sorted.map(d => d.label || `(no label) ${d.deviceId.slice(0,8)}`));

        // 4. リトライループ: 候補を順番に試して成功したものを使用
        let chosenStream = null;
        let chosenId = null;
        for (const dev of sorted) {
          const probe = await probeCamera(dev.deviceId);
          if (probe.ok && probe.width >= 160) {
            // 実際のストリームを取得
            const micId = localStorage.getItem('selectedMicId') || aDevices[0]?.deviceId;
            const s = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: dev.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: micId ? { 
                deviceId: { exact: micId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              } : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }).catch(() => null);
            if (s) {
              chosenStream = s;
              chosenId = dev.deviceId;
              console.log(`[useSmartCameraSelection] ✅ Using camera: "${dev.label || '(no label)'}" ${probe.width}x${probe.height}`);
              break;
            }
          }
        }

        // 5. 全て失敗したら最後の手段（デバイス指定なし）
        if (!chosenStream) {
          console.warn('[useSmartCameraSelection] ⚠️ All probes failed, using default');
          chosenStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          chosenId = chosenStream.getVideoTracks()[0]?.getSettings()?.deviceId || null;
        }

        if (chosenId) localStorage.setItem('selectedCameraId', chosenId);
        setSelectedCameraId(chosenId);
        setStream(chosenStream);

        const micId = chosenStream.getAudioTracks()[0]?.getSettings()?.deviceId || aDevices[0]?.deviceId || null;
        setSelectedMicId(micId);
        if (micId) localStorage.setItem('selectedMicId', micId);

        // エコーキャンセル確認ログ
        const audioTrack = chosenStream.getAudioTracks()[0];
        if (audioTrack) {
          const settings = audioTrack.getSettings();
          console.log('[EchoCancellation] 🎙️ Audio track settings:', {
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
            sampleRate: settings.sampleRate,
          });
        }

      } catch (err) {
        console.error('[useSmartCameraSelection] ❌ Device init failed:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeDevices();
  }, []);

  // デバイス切り替え関数（VideoCallPage から呼び出し可能）
  const switchCamera = async (deviceId) => {
    localStorage.setItem('selectedCameraId', deviceId);
    setSelectedCameraId(deviceId);
    if (stream) {
      stream.getVideoTracks().forEach(t => t.stop());
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
        const newTrack = newVideoStream.getVideoTracks()[0];
        const newStream = new MediaStream([newTrack, ...stream.getAudioTracks()]);
        setStream(newStream);
        console.log('[useSmartCameraSelection] 🔄 Camera switched:', deviceId);
      } catch (err) {
        console.error('[useSmartCameraSelection] ❌ Camera switch failed:', err);
      }
    }
  };

  const switchMic = async (deviceId) => {
    localStorage.setItem('selectedMicId', deviceId);
    setSelectedMicId(deviceId);
    if (stream) {
      stream.getAudioTracks().forEach(t => t.stop());
      try {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const newTrack = newAudioStream.getAudioTracks()[0];
        const newStream = new MediaStream([...stream.getVideoTracks(), newTrack]);
        setStream(newStream);
        console.log('[useSmartCameraSelection] 🔄 Mic switched:', deviceId);
      } catch (err) {
        console.error('[useSmartCameraSelection] ❌ Mic switch failed:', err);
      }
    }
  };

  return { stream, loading, error, videoDevices, audioDevices, selectedCameraId, selectedMicId, switchCamera, switchMic };
}