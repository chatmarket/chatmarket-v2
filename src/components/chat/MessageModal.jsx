import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { MessageCircle, Flag, Ban, Send } from "lucide-react";
import { t } from "@/lib/i18n";

export default function MessageModal({ channel, video, user, onClose }) {
  const [tab, setTab] = useState("message"); // message | block | report
  const [content, setContent] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!content.trim() || !user) return;
    setSending(true);
    await base44.entities.Message.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_id: channel.id,
      to_channel_owner_email: channel.owner_email,
      content: content.trim(),
      video_id: video?.id || "",
    });
    toast.success(t("messageSent"));
    setSending(false);
    onClose();
  };

  const handleBlock = async () => {
    if (!user) return;
    setSending(true);
    await base44.entities.BlockReport.create({
      type: "block",
      from_email: user.email,
      target_email: channel.owner_email,
    });
    toast.success(t("blocked"));
    setSending(false);
    onClose();
  };

  const handleReport = async () => {
    if (!user || !reportReason.trim()) return;
    setSending(true);
    await base44.entities.BlockReport.create({
      type: "report",
      from_email: user.email,
      target_email: channel.owner_email,
      reason: reportReason.trim(),
    });
    toast.success(t("reported"));
    setSending(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
              {channel.avatar_url
                ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm font-bold">{channel.name?.[0]}</span>
              }
            </div>
            {channel.name}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setTab("message")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "message" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MessageCircle className="w-3.5 h-3.5" /> {t("sendMessage")}
          </button>
          <button
            onClick={() => setTab("block")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "block" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Ban className="w-3.5 h-3.5" /> {t("block")}
          </button>
          <button
            onClick={() => setTab("report")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "report" ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Flag className="w-3.5 h-3.5" /> {t("report")}
          </button>
        </div>

        {tab === "message" && (
          <div className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("messagePlaceholder")}
              className="bg-secondary border-0 resize-none"
              rows={4}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!content.trim() || sending}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
              {sending ? "..." : t("send")}
            </Button>
          </div>
        )}

        {tab === "block" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("blockConfirm")}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>{t("cancel")}</Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleBlock}
                disabled={sending}
              >
                <Ban className="w-4 h-4" /> {t("block")}
              </Button>
            </div>
          </div>
        )}

        {tab === "report" && (
          <div className="space-y-3">
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t("reportReason")}
              className="bg-secondary border-0 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>{t("cancel")}</Button>
              <Button
                className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleReport}
                disabled={!reportReason.trim() || sending}
              >
                <Flag className="w-4 h-4" /> {t("report")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}