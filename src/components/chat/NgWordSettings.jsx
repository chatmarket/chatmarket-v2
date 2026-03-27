import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function NgWordSettings({ channel, onClose, onSaved }) {
  const [words, setWords] = useState(channel?.ng_words || []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const addWord = () => {
    const w = input.trim();
    if (!w || words.includes(w)) { setInput(""); return; }
    setWords((prev) => [...prev, w]);
    setInput("");
  };

  const removeWord = (w) => setWords((prev) => prev.filter((x) => x !== w));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Channel.update(channel.id, { ng_words: words });
    setSaving(false);
    toast.success("NGワードを保存しました");
    onSaved?.(words);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> NGワード設定
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">設定したワードを含むコメントは自動的に非表示になります。</p>

          {/* 追加フォーム */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWord()}
              placeholder="NGワードを入力"
              className="bg-secondary border-0 flex-1"
            />
            <Button size="sm" onClick={addWord} className="shrink-0 gap-1">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* ワード一覧 */}
          {words.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">NGワードがありません</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {words.map((w) => (
                <span key={w} className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 text-xs px-2.5 py-1 rounded-full">
                  {w}
                  <button onClick={() => removeWord(w)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}