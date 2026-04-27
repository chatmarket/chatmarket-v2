import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function LiveChatDisplay({ streamId }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!streamId) return;
    
    console.log(`[LiveChatDisplay] 📡 Subscribing to comments on stream: ${streamId}`);
    
    // 初回ロード
    const fetchComments = async () => {
      try {
        const data = await base44.entities.Comment.filter(
          { target_type: "livestream_chat", target_id: streamId },
          "-created_date",
          30
        );
        setComments(data);
      } catch (err) {
        console.error('[LiveChatDisplay] Failed to fetch comments:', err);
      }
    };

    fetchComments();

    // リアルタイム購読
    const unsubscribe = base44.entities.Comment.subscribe((event) => {
      if (event.type !== "create") return;
      if (event.data?.target_id !== streamId) return;
      console.log(`[LiveChatDisplay] ✅ Comment added: ${event.data?.user_name}`);
      setComments((prev) => [event.data, ...prev.slice(0, 29)]);
    });

    return unsubscribe;
  }, [streamId]);

  return comments.length > 0 ? (
    comments.map((c) => (
      <div key={c.id} className="bg-zinc-800/50 rounded px-1.5 sm:px-2 py-1 border border-zinc-700/50 text-[10px] sm:text-xs">
        <p className="font-bold text-cyan-400 leading-tight">{c.user_name}</p>
        <p className="text-foreground/80 break-words leading-tight">{c.content}</p>
      </div>
    ))
  ) : (
    <p className="text-[9px] sm:text-xs text-zinc-500 text-center py-4">チャットが表示されます</p>
  );
}