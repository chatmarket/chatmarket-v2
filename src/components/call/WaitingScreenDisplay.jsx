/**
 * WaitingScreenDisplay
 * 1対1ビデオ通話の待機中画面: サムネイル画像 or カメラプレビュー を選択表示
 */
import React, { useState, useEffect, useRef } from "react";
import { Image, Camera, Radio } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function WaitingScreenDisplay({ channel, localVideoRef }) {
  const [mode, setMode] = useState("camera"); // "camera" | "thumbnail"
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(channel?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // チャンネルのアバターをデフォルトサムネイルとして使用
  useEffect(() => {
    if (channel?.avatar_url && !thumbnailUrl) {
      setThumbnailUrl(channel.avatar_url);
    }
  }, [channel]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setThumbnailUrl(res.file_url);
    } catch {
      // フォールバック: ローカルプレビュー
      setThumbnailUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* 表示エリア */}
      <div className="flex-1 relative bg-black">
        {mode === "camera" ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
              <div className="flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 border border-primary/40">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                <span className="text-white font-bold text-sm">待機中...</span>
              </div>
              <p className="text-white/50 text-xs">相手からの接続を待っています</p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-secondary to-card">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="待機中サムネイル"
                className="w-full h-full object-cover absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
                <Radio className="w-16 h-16 text-primary/30" />
              </div>
            )}
            {/* オーバーレイ */}
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
              {thumbnailUrl && (
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/60 shadow-2xl z-10">
                  <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 border border-primary/40 z-10">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                <span className="text-white font-bold text-sm">待機中...</span>
              </div>
              <p className="text-white/50 text-xs z-10">相手からの接続を待っています</p>
            </div>
          </div>
        )}
      </div>

      {/* 下部コントロール */}
      <div className="bg-black/90 border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-white/40">待機中の表示</p>
        <div className="flex items-center gap-2">
          {/* カメラモード */}
          <button
            onClick={() => setMode("camera")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              mode === "camera"
                ? "bg-primary/20 border-primary text-primary"
                : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            カメラ
          </button>

          {/* サムネイルモード */}
          <button
            onClick={() => setMode("thumbnail")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              mode === "thumbnail"
                ? "bg-primary/20 border-primary text-primary"
                : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            サムネイル
          </button>

          {/* サムネイル変更ボタン（サムネイルモード時のみ） */}
          {mode === "thumbnail" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs px-3 py-1.5 rounded-full border border-white/20 bg-white/5 text-white/50 hover:border-white/40 hover:text-white/80 transition-all disabled:opacity-40"
              >
                {uploading ? "uploading..." : "画像変更"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}