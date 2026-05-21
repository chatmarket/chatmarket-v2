/**
 * ChekiCallEndBanner
 * アイドルカテゴリの通話終了後に表示するチェキ作成促進バナー
 * VideoCallPageのJSX末尾に追加し、通話終了時に自動表示
 */
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function ChekiCallEndBanner({ show, onClose, localVideoRef, remoteVideoRef, call }) {
  const navigate = useNavigate();

  const handleGoToEditor = () => {
    let idolSnap = null, fanSnap = null;
    try {
      if (localVideoRef?.current?.readyState >= 2) {
        const s = document.createElement("canvas");
        s.width = localVideoRef.current.videoWidth || 640;
        s.height = localVideoRef.current.videoHeight || 480;
        s.getContext("2d").drawImage(localVideoRef.current, 0, 0);
        idolSnap = s.toDataURL("image/jpeg", 0.85);
      }
      if (remoteVideoRef?.current?.readyState >= 2) {
        const s = document.createElement("canvas");
        s.width = remoteVideoRef.current.videoWidth || 640;
        s.height = remoteVideoRef.current.videoHeight || 480;
        s.getContext("2d").drawImage(remoteVideoRef.current, 0, 0);
        const d = s.getContext("2d").getImageData(0, 0, 10, 10);
        if ([...d.data].reduce((a, v) => a + v, 0) / d.data.length > 5) {
          fanSnap = s.toDataURL("image/jpeg", 0.85);
        }
      }
    } catch {}
    navigate("/cheki-editor", {
      state: {
        idolSnapshot: idolSnap,
        fanSnapshot: fanSnap,
        callId: call?.id,
        fanEmail: call?.caller_email,
        fanName: call?.caller_name,
      },
    });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-6 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-gradient-to-r from-pink-900/95 to-purple-900/95 backdrop-blur-xl border border-pink-500/50 rounded-2xl p-4 shadow-2xl shadow-pink-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">📸 デジタルチェキを作成しますか？</p>
                <p className="text-xs text-pink-200/70 mt-0.5">通話の思い出をチェキにしてファンに届けましょう</p>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white/70 p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs"
                onClick={onClose}
              >
                スキップ
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-black text-xs gap-1.5"
                onClick={handleGoToEditor}
              >
                <Camera className="w-3.5 h-3.5" /> チェキを作る
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}