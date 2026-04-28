import { useEffect, useState } from 'react';

/**
 * 1対1通話用のカメラ・マイク選択 hook
 *
 * デフォルト: PC内蔵カメラ（FaceTime / Built-in）を優先して自動選択
 * 選択肢: OBS Virtual Camera も含む全デバイスをリストアップ
 * ユーザーが localStorage でデバイスを切り替え可能
 *
 * ★ AWS通信網（IVS Stages）は一切変更しない
 */
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
        // 1. デバイス一覧取得（OBS含む全デバイス）
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevices = devices.filter(d => d.kind === 'videoinput');
        const aDevices = devices.filter(d => d.kind === 'audioinput');

        setVideoDevices(vDevices);
        setAudioDevices(aDevices);

        // 2. カメラ: localStorage に保存済みなら使用、なければ内蔵カメラを優先
        let camId = localStorage.getItem('selectedCameraId');
        if (!camId || !vDevices.find(d => d.deviceId === camId)) {
          // FaceTime > Built-in > その他（OBSは除外してデフォルトを選ぶが、選択肢には残す）
          let cam = vDevices.find(d => d.label.toLowerCase().includes('facetime'));
          if (!cam) cam = vDevices.find(d => d.label.toLowerCase().includes('built-in'));
          if (!cam) cam = vDevices.find(d => !d.label.toLowerCase().includes('obs'));
          if (!cam) cam = vDevices[0];
          camId = cam?.deviceId || null;
          if (camId) localStorage.setItem('selectedCameraId', camId);
          console.log('[useSmartCameraSelection] 📷 Default camera:', cam?.label);
        } else {
          console.log('[useSmartCameraSelection] 📷 Restored camera from localStorage:', vDevices.find(d => d.deviceId === camId)?.label);
        }
        setSelectedCameraId(camId);

        // 3. マイク: localStorage に保存済みなら使用、なければ内蔵マイクを優先
        let micId = localStorage.getItem('selectedMicId');
        if (!micId || !aDevices.find(d => d.deviceId === micId)) {
          let mic = aDevices.find(d => !d.label.toLowerCase().includes('obs'));
          if (!mic) mic = aDevices[0];
          micId = mic?.deviceId || null;
          if (micId) localStorage.setItem('selectedMicId', micId);
          console.log('[useSmartCameraSelection] 🎤 Default mic:', mic?.label);
        }
        setSelectedMicId(micId);

        // 4. ストリーム取得
        const constraints = {
          video: camId ? { deviceId: { exact: camId } } : true,
          audio: micId ? { deviceId: { exact: micId } } : true,
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
        const newAudioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { deviceId: { exact: deviceId } } });
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