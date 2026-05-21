/**
 * useChekiCapture
 * アイドルカテゴリの通話終了時にチェキエディターへ遷移するフック
 */
import { useNavigate } from "react-router-dom";

export function useChekiCapture({ user, call, calleeChannel, localVideoRef, remoteVideoRef }) {
  const navigate = useNavigate();

  /**
   * アイドルカテゴリ(callee側)かどうか判定
   */
  const isIdolCallee =
    user && call &&
    user.email === call.callee_email &&
    calleeChannel?.service_category === "idol";

  /**
   * 通話終了後にチェキエディターへ遷移（アイドル側のみ）
   * @returns {boolean} 遷移した場合 true
   */
  const navigateToChekiEditor = () => {
    if (!isIdolCallee) return false;

    let idolSnap = null;
    let fanSnap = null;

    try {
      const localVid = localVideoRef?.current;
      if (localVid && localVid.readyState >= 2 && localVid.videoWidth > 0) {
        const s = document.createElement("canvas");
        s.width = localVid.videoWidth;
        s.height = localVid.videoHeight;
        s.getContext("2d").drawImage(localVid, 0, 0);
        idolSnap = s.toDataURL("image/jpeg", 0.85);
      }

      const remoteVid = remoteVideoRef?.current;
      if (remoteVid && remoteVid.readyState >= 2 && remoteVid.videoWidth > 0) {
        const s = document.createElement("canvas");
        s.width = remoteVid.videoWidth;
        s.height = remoteVid.videoHeight;
        s.getContext("2d").drawImage(remoteVid, 0, 0);
        // 映像が黒（カメラOFF）の場合はnullのまま
        const d = s.getContext("2d").getImageData(0, 0, 10, 10);
        const avg = [...d.data].reduce((a, v) => a + v, 0) / d.data.length;
        if (avg > 5) fanSnap = s.toDataURL("image/jpeg", 0.85);
      }
    } catch {}

    navigate("/cheki-editor", {
      state: {
        idolSnapshot: idolSnap,
        fanSnapshot: fanSnap,
        callId: call.id,
        fanEmail: call.caller_email,
        fanName: call.caller_name,
      },
    });
    return true;
  };

  return { isIdolCallee, navigateToChekiEditor };
}