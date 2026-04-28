import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Camera, CameraOff, Phone, PhoneOff, 
  Volume2, VolumeX, Maximize, Minimize, Settings, X, Coins
} from "lucide-react";

/**
 * Mobile Video Call UI
 * スマホ最適化の1対1ビデオ通話インターフェース
 * - タッチ操作最適化
 * - 映像送受信の安定性強化
 * - シンプルなコントロール
 */
export default function MobileVideoCallUI({
  call,
  user,
  localStream,
  localVideoRef,
  remoteVideoRef,
  micOn,
  camOn,
  onMicToggle,
  onCamToggle,
  onEndCall,
  onFullscreen,
  isFullscreen,
  remainingSeconds,
  coinBalance
}) {
  const [showControls, setShowControls] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const otherName = call && user
    ? user.email === call.caller_email ? call.callee_name : call.caller_name
    : "相手";

  const handleRemoteVideoLoad = () => {
    console.log('[MobileUI] 📹 Remote video element playing');
    setIsVideoReady(true);
  };

  const handleRemoteVideoError = (e) => {
    console.error('[MobileUI] ❌ Remote video error:', e);
    setIsVideoReady(false);
  };

  return (
    <div className="w-full h-screen bg-black relative flex flex-col">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 相手の映像（フルスクリーン） */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* リモートビデオ */}
        <video
          ref={remoteVideoRef}
          autoPlay={true}
          playsInline={true}
          muted={false}
          onLoadedMetadata={handleRemoteVideoLoad}
          onError={handleRemoteVideoError}
          className="w-full h-full object-cover"
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        />

        {/* リモートビデオ未受信時のプレースホルダ */}
        {!isVideoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-primary/40 border-t-primary animate-spin mx-auto" />
              <p className="text-white font-bold">相手の映像を待っています...</p>
              <p className="text-xs text-white/50">接続中です</p>
            </div>
          </div>
        )}

        {/* 通話時間カウントダウン（右上） */}
        {remainingSeconds !== null && (
          <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur rounded-lg px-3 py-2">
            <p className="text-2xl font-black text-primary"
              style={{
                textShadow: '0 0 10px rgba(0,255,157,0.8)'
              }}>
              {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}
            </p>
          </div>
        )}

        {/* 相手の名前（左上） */}
        <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur rounded-lg px-3 py-2">
          <p className="text-white font-bold text-sm">{otherName} との通話中</p>
        </div>

        {/* 自分の映像（左下 PiP） */}
        <div className="absolute bottom-20 left-4 w-20 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg bg-black/80 z-10">
          <video
            ref={localVideoRef}
            autoPlay={true}
            muted={true}
            playsInline={true}
            className="w-full h-full object-cover"
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <CameraOff className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-0.5 left-0.5 right-0.5 text-center">
            <span className="text-[8px] text-white/70 bg-black/50 px-1 py-0.5 rounded-full">自分</span>
          </div>
        </div>

        {/* マイク音声レベルインジケーター */}
        {micOn && (
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-lg px-2 py-1.5">
            <Mic className="w-3 h-3 text-primary" />
            <div className="flex items-end gap-[2px] h-3">
              {[20, 40, 60, 80, 100].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-sm bg-primary/60"
                  style={{ height: `${(i + 1) * 16}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* フルスクリーンボタン */}
        <button
          onClick={onFullscreen}
          className="absolute top-4 right-14 z-20 bg-black/60 hover:bg-black/90 text-white rounded-lg p-2 transition-all"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        {/* マイクOFF警告 */}
        {!micOn && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-red-900/90 border border-red-500/60 rounded-lg px-3 py-1.5 flex items-center gap-2 text-red-300 text-xs font-bold backdrop-blur">
            <MicOff className="w-3 h-3" />
            マイクがOFFです
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* コントロールバー */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-4 z-20"
          >
            {/* 通話時間プログレスバー */}
            {remainingSeconds !== null && (
              <div className="mb-3">
                <div className="w-full bg-black/50 rounded-full h-1 border border-cyan-500/20">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                    animate={{
                      width: "100%",
                      boxShadow: "0 0 8px rgba(0,229,255,0.5)"
                    }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            )}

            {/* コイン残高（caller） */}
            {user?.email === call?.caller_email && coinBalance !== null && (
              <div className="mb-3 text-center">
                <div className="inline-flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-3 py-1">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">
                    {coinBalance.toLocaleString()} コイン
                  </span>
                </div>
              </div>
            )}

            {/* コントロールボタン */}
            <div className="flex items-center justify-center gap-3">
              {/* マイク */}
              <button
                onClick={onMicToggle}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"
                }`}
              >
                {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>

              {/* カメラ */}
              <button
                onClick={onCamToggle}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"
                }`}
              >
                {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
              </button>

              {/* スピーカー */}
              <button
                onClick={() => setSpeakerOn(!speakerOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  speakerOn ? "bg-white/10 hover:bg-white/20" : "bg-orange-500"
                }`}
              >
                {speakerOn ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
              </button>

              {/* 設定 */}
              <button
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>

              {/* 通話終了 */}
              <motion.button
                onClick={onEndCall}
                animate={{ boxShadow: ["0 0 20px rgba(255,0,85,0.6)", "0 0 40px rgba(255,0,85,1)", "0 0 20px rgba(255,0,85,0.6)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-500 shrink-0"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>
            </div>

            {/* コントロール非表示ボタン */}
            <button
              onClick={() => setShowControls(false)}
              className="absolute top-2 right-2 text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* コントロール非表示時の タップして表示 */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white/60 text-xs px-3 py-2 rounded-lg hover:text-white/90 transition-colors"
        >
          タップしてコントロール表示
        </button>
      )}
    </div>
  );
}