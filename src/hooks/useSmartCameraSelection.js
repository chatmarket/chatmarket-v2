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

        // 2. カメラ: 仮想カメラ（OBS/Virtual）を除外して物理カメラを最優先選択
        // localStorage に保存済みでも仮想カメラなら無視して物理カメラを選び直す
        const isVirtualCamera = (label) => {
          const l = label.toLowerCase();
          return l.includes('obs') || l.includes('virtual') || l.includes('manycam') || l.includes('xsplit') || l.includes('snap camera') || l.includes('droidcam') || l.includes('iriun');
        };
        const physicalCameras = vDevices.filter(d => !isVirtualCamera(d.label));

        let camId = localStorage.getItem('selectedCameraId');
        const savedDevice = vDevices.find(d => d.deviceId === camId);
        // 保存済みデバイスが仮想カメラなら無視
        if (!camId || !savedDevice || isVirtualCamera(savedDevice.label)) {
          // FaceTime > Built-in > その他物理カメラ > 最終手段で全デバイス先頭
          const pool = physicalCameras.length > 0 ? physicalCameras : vDevices;
          let cam = pool.find(d => d.label.toLowerCase().includes('facetime'));
          if (!cam) cam = pool.find(d => d.label.toLowerCase().includes('built-in'));
          if (!cam) cam = pool[0];
          camId = cam?.deviceId || null;
          if (camId) localStorage.setItem('selectedCameraId', camId);
          console.log('[useSmartCameraSelection] 📷 Physical camera selected:', cam?.label);
        } else {
          console.log('[useSmartCameraSelection] 📷 Restored physical camera:', savedDevice.label);
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