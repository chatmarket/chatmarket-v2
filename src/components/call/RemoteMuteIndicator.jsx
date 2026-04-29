import { MicOff } from "lucide-react";

/**
 * 相手がミュート中であることを示すオーバーレイバナー
 * call: VideoCall レコード, user: 自分, otherName: 相手の名前, selfMuted: 自分もミュート中か
 */
export default function RemoteMuteIndicator({ call, user, otherName, selfMuted }) {
  if (!call || !user) return null;
  const isCaller = user.email === call.caller_email;
  const otherMuted = isCaller ? call.callee_muted : call.caller_muted;
  if (!otherMuted) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bg-gray-900/90 border border-gray-500/60 rounded-xl px-4 py-2 flex items-center gap-2 text-gray-300 text-xs font-bold backdrop-blur pointer-events-auto"
      style={{ top: selfMuted ? 88 : 40 }}
    >
      <MicOff className="w-4 h-4 shrink-0 text-gray-400" />
      {otherName}さんが音声をオフにしています
    </div>
  );
}