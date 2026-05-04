import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function NgWordManagement() {
  const [ngWord, setNgWord] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: channels = [] } = useQuery({
    queryKey: ["admin-ng-words-channels"],
    queryFn: () => base44.entities.Channel.list(),
  });

  const handleAddNgWord = async () => {
    if (!ngWord.trim()) {
      toast.error("NGワードを入力してください");
      return;
    }

    setSaving(true);
    try {
      // NGワード一覧を更新（全チャンネル共通）
      const updatedWords = channels.map((ch) => ({
        ...ch,
        ng_words: [...(ch.ng_words || []), ngWord.toLowerCase()],
      }));

      for (const ch of updatedWords) {
        await base44.entities.Channel.update(ch.id, {
          ng_words: ch.ng_words,
        });
      }

      toast.success(`NGワード「${ngWord}」を${channels.length}チャンネルに追加しました`);
      setNgWord("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-ng-words-channels"] });
    } catch (err) {
      toast.error("NGワード追加に失敗: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNgWord = async (word) => {
    setSaving(true);
    try {
      const updatedWords = channels.map((ch) => ({
        ...ch,
        ng_words: (ch.ng_words || []).filter((w) => w !== word),
      }));

      for (const ch of updatedWords) {
        await base44.entities.Channel.update(ch.id, {
          ng_words: ch.ng_words,
        });
      }

      toast.success(`NGワード「${word}」を${channels.length}チャンネルから削除しました`);
      queryClient.invalidateQueries({ queryKey: ["admin-ng-words-channels"] });
    } catch (err) {
      toast.error("NGワード削除に失敗: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 全チャンネルのNGワードリスト（合併・重複排除）
  const allNgWords = [...new Set(channels.flatMap((ch) => ch.ng_words || []))].sort();

  return (
    <div className="space-y-6">
      {/* 追加フォーム */}
      <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新しいNGワードを追加
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold">NGワード *</label>
            <Input
              value={ngWord}
              onChange={(e) => setNgWord(e.target.value)}
              placeholder="例: 禁止ワード"
              className="bg-secondary border-0"
            />
            <p className="text-xs text-muted-foreground">
              完全一致・大文字小文字区別なしで自動ブロックされます
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">理由・説明（任意）</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例: 人種差別的な表現のため"
              className="bg-secondary border-0 resize-none"
              rows={2}
            />
          </div>

          <Button
            onClick={handleAddNgWord}
            disabled={saving || !ngWord.trim()}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            {saving ? "追加中..." : "NGワードを追加"}
          </Button>
        </div>
      </div>

      {/* 警告バナー */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-orange-300 mb-1">⚠️ 重要な注意</p>
          <ul className="text-xs text-orange-200/80 space-y-1">
            <li>• NGワードが含まれたコメントは自動的に「ブロック」され、投稿されません</li>
            <li>• 追加したNGワードは<strong>全チャンネル共通</strong>で適用されます</li>
            <li>• NGワードの登録は即座に反映されます</li>
            <li>• 削除したNGワードは再度フィルタリング対象にはなりません</li>
          </ul>
        </div>
      </div>

      {/* NGワード一覧 */}
      <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">現在のNGワード一覧（{allNgWords.length}件）</h3>
        </div>

        {allNgWords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            NGワードが登録されていません
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allNgWords.map((word) => (
              <div
                key={word}
                className="bg-secondary/50 border border-red-500/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground break-all">{word}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(word, word)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="コピー"
                  >
                    {copiedId === word ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRemoveNgWord(word)}
                    disabled={saving}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フィルタリング統計 */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-300 mb-2">📊 フィルタリング仕組み</p>
        <ul className="text-xs text-blue-200/80 space-y-1">
          <li>✓ コメント投稿時にNGワードを自動チェック</li>
          <li>✓ マッチすればコメント拒否（エラーメッセージ表示）</li>
          <li>✓ ブロック理由: 「不適切な言葉が含まれています」</li>
          <li>✓ 全チャンネルで共通ルール適用</li>
        </ul>
      </div>
    </div>
  );
}