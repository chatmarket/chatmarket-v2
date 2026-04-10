import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag, CheckCircle2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const REASON_OPTIONS = [
  { value: "harassment", label: "ハラスメント・嫌がらせ" },
  { value: "spam", label: "スパム・迷惑行為" },
  { value: "inappropriate", label: "不適切なコンテンツ" },
  { value: "misconduct", label: "悪質な言動" },
  { value: "ng_word", label: "NGワード・規約違反" },
  { value: "other", label: "その他" },
];

export default function ReportChannelDialog({ channel, user, open, onClose }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error("通報理由を選択してください"); return; }
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSubmitting(true);
    await base44.entities.ChannelReport.create({
      channel_id: channel.id,
      channel_name: channel.name,
      owner_email: channel.owner_email,
      reporter_email: user.email,
      reporter_name: user.full_name || user.email,
      reason,
      detail,
      status: "pending",
    });
    setSubmitting(false);
    setDone(true);
  };

  const handleClose = () => {
    setReason("");
    setDetail("");
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Flag className="w-5 h-5" /> チャンネルを通報する
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-bold">通報を受け付けました</p>
              <p className="text-sm text-muted-foreground mt-1">
                運営チームが内容を確認し、適切に対応いたします。
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">閉じる</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">通報対象チャンネル</p>
                <p className="font-bold">{channel?.name}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">通報理由 <span className="text-red-400">*</span></label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue placeholder="理由を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">詳細（任意）</label>
                <Textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="具体的な状況や証拠などを記入してください"
                  className="bg-secondary border-0 resize-none"
                  rows={3}
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-200 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                虚偽の通報は利用規約違反となる場合があります。
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>キャンセル</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 gap-2"
                onClick={handleSubmit}
                disabled={!reason || submitting}
              >
                <Flag className="w-4 h-4" />
                {submitting ? "送信中..." : "通報する"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}