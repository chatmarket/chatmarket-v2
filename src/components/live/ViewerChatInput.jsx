import React, { useState } from "react";
import { Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function ViewerChatInput({ streamId, user }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !user || sending) return;

    setSending(true);
    try {
      await base44.entities.Comment.create({
        content: trimmed,
        target_type: "livestream_chat",
        target_id: streamId,
        user_name: user.full_name || "匿名",
        user_email: user.email,
      });
      setMessage("");
      toast.success("メッセージ送信しました");
    } catch (err) {
      toast.error("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => base44.auth.redirectToLogin()}
          className="flex-1 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold transition-colors"
        >
          ログインしてコメント
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSend} className="px-3 pb-3 flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="コメントを入力..."
        className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-500 flex-1 text-sm"
        disabled={sending}
      />
      <button
        type="submit"
        disabled={sending || !message.trim()}
        className="shrink-0 w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center transition-colors"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}