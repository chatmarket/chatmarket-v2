import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Video } from "lucide-react";
import { toast } from "sonner";

export default function ArchivePriceModal({ stream, onClose, onSaved }) {
  const [archiveIsPaid, setArchiveIsPaid] = useState((stream.price || 0) > 0);
  const [archivePrice, setArchivePrice] = useState(stream.price || 1);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (archiveIsPaid && !consentConfirmed) {
      toast.error("肖像権に関する同意確認が必要です。");
      return;
    }
    setSaving(true);
    await base44.entities.LiveStream.update(stream.id, {
      price: archiveIsPaid ? archivePrice : 0,
    });
    toast.success("アーカイブ設定を保存しました");
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border/50 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-bold flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            アーカイブ有料公開設定
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-3">
            「{stream.title}」の終了後アーカイブの公開設定を変更します。
          </p>

          <div className="flex items-center justify-between">
            <div>
              <Label>アーカイブを有料公開する</Label>
              <p className="text-xs text-muted-foreground mt-0.5">¥1〜自由設定で動画として販売できます</p>
            </div>
            <Switch
              checked={archiveIsPaid}
              onCheckedChange={(v) => { setArchiveIsPaid(v); setConsentConfirmed(false); }}
            />
          </div>

          {archiveIsPaid && (
            <>
              <div className="space-y-2">
                <Label>アーカイブ販売価格（円）</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={archivePrice}
                  onChange={(e) => setArchivePrice(parseInt(e.target.value) || 1)}
                  className="bg-secondary border-0"
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">¥1〜自由に設定できます</p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-400">肖像権・同意について（重要）</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>通話・配信に映り込む相手（第三者）の肖像権を尊重してください。</li>
                      <li>アーカイブを有料公開する場合、映り込んだすべての方から<span className="text-orange-300 font-semibold">事前に書面または口頭による明示的な同意</span>を得る必要があります。</li>
                      <li>同意を得ていないアーカイブの公開は肖像権侵害となり、法的責任を負う可能性があります。</li>
                      <li>当プラットフォームは同意の有無を確認する義務を負わず、投稿者が全責任を負うものとします。</li>
                    </ul>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5 accent-orange-400 w-4 h-4"
                  />
                  <span className="text-xs text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                    映り込む全員から肖像権に関する同意を得ており、本規約に同意してアーカイブを有料公開します。
                  </span>
                </label>
              </div>
            </>
          )}

          {!archiveIsPaid && (
            <p className="text-xs text-muted-foreground">
              ※ 有料公開しない場合、アーカイブはあなたの記録用として非公開で保存されます。
            </p>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-border/50">
          <Button variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
          <Button
            onClick={handleSave}
            disabled={saving || (archiveIsPaid && !consentConfirmed)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </div>
    </div>
  );
}