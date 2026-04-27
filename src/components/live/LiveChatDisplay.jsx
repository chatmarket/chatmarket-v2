import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function LiveChatDisplay({ streamId }) {
  const { data: comments = [] } = useQuery({
    queryKey: ["live-comments", streamId],
    queryFn: () => base44.entities.Comment.filter({ target_type: "livestream_chat", target_id: streamId }, "-created_date", 30),
    refetchInterval: 2000,
    enabled: !!streamId,
  });

  return comments.length > 0 ? (
    comments.map((c) => (
      <div key={c.id} className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
        <p className="text-xs font-bold text-cyan-400">{c.user_name}</p>
        <p className="text-xs text-foreground/80 break-words">{c.content}</p>
      </div>
    ))
  ) : (
    <p className="text-xs text-zinc-500 text-center py-8">チャットが表示されます</p>
  );
}