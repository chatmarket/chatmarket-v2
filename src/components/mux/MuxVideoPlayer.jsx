import React from 'react';

export default function MuxVideoPlayer({ playbackId }) {
  if (!playbackId) return null;

  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  return (
    <div className="aspect-video bg-black rounded-2xl overflow-hidden w-full">
      <video
        controls
        autoPlay
        className="w-full h-full"
        src={hlsUrl}
        crossOrigin="anonymous"
      >
        <source src={hlsUrl} type="application/x-mpegURL" />
        お使いのブラウザは動画再生に対応していません。
      </video>
    </div>
  );
}