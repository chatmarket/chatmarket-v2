import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REACTIONS = [
  { emoji: "👍", label: "いいね" },
  { emoji: "❤️", label: "好き" },
  { emoji: "😂", label: "笑った" },
  { emoji: "😮", label: "驚き" },
  { emoji: "🔥", label: "最高" },
  { emoji: "💯", label: "完璧" },
];

export default function ReactionBar({ targetType, targetId, user }) {
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const queryClient = useQueryClient();

  const sendReaction = useMutation({
    mutationFn: (emoji) => {
      if (!user) {
        base44.auth.redirectToLogin();
        return;
      }
      return base44.entities.VideoReaction.create({
        video_id: targetId,
        user_email: user.email,
        type: "like",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`reactions`, targetId] });
    },
    onError: () => {
      toast.error("リアクション送信に失敗しました");
    },
  });

  return (
    <div className="flex gap-1.5">
      {REACTIONS.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className="text-xl hover:scale-125 transition-transform"
          onClick={() => sendReaction.mutate(reaction.emoji)}
          title={reaction.label}
        >
          {reaction.emoji}
        </Button>
      ))}
    </div>
  );
}