import { useEffect, useState } from 'react';

/**
 * 1対1通話用のスマートカメラ・マイク選択 hook
 * - FaceTime / Built-in を優先
 * - OBS Virtual Camera を除外
 * - localStorage に選択状態を記憶
 */
export function useSmartCameraSelection() {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // 1. デバイス一覧取得
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const audioDevices = devices.filter(d => d.kind === 'audioinput');

        // 2. カメラ優先度選択: FaceTime > Built-in > OBS除外 > 最初のデバイス
        let selectedCameraId = localStorage.getItem('selectedCameraId');
        if (!selectedCameraId || !videoDevices.find(d => d.deviceId === selectedCameraId)) {
          // FaceTime を優先
          let camera = videoDevices.find(d => d.label.includes('FaceTime'));
          // なければ Built-in を選択
          if (!camera) camera = videoDevices.find(d => d.label.includes('Built-in'));
          // OBS Virtual Camera を除外
          if (!camera) camera = videoDevices.find(d => !d.label.includes('OBS'));
          // デフォルトに
          if (!camera) camera = videoDevices[0];
          
          if (camera) {
            selectedCameraId = camera.deviceId;
            localStorage.setItem('selectedCameraId', selectedCameraId);
            console.log('[useSmartCameraSelection] 📷 Camera selected:', camera.label);
          }
        }

        // 3. マイク優先度選択（同様にOBS除外）
        let selectedMicId = localStorage.getItem('selectedMicId');
        if (!selectedMicId || !audioDevices.find(d => d.deviceId === selectedMicId)) {
          let mic = audioDevices.find(d => !d.label.includes('OBS'));
          if (!mic) mic = audioDevices[0];
          if (mic) {
            selectedMicId = mic.deviceId;
            localStorage.setItem('selectedMicId', selectedMicId);
            console.log('[useSmartCameraSelection] 🎤 Mic selected:', mic.label);
          }
        }

        // ストリーム取得
        const constraints = {
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        console.log('[useSmartCameraSelection] ✅ Stream initialized');
      } catch (err) {
        console.error('[useSmartCameraSelection] ❌ Device init failed:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeDevices();

    return () => {
      // cleanup
    };
  }, []);

  return { stream, loading, error };
}