import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

// ---- テンプレートワード ----
const TEMPLATES = {
  slander: {
    label: "誹謗中傷セット",
    words: ["バカ", "アホ", "死ね", "消えろ", "うざい", "きもい", "最低"],
  },
  broadcast: {
    label: "放送禁止用語セット",
    words: ["差別語A", "差別語B", "不適切語C", "禁止表現D"],
  },
  industry: {
    label: "業界用語セット",
    words: ["NG業界語1", "NG業界語2", "業界禁止語3", "専門禁止語4"],
  },
};

// ---- AIサジェスト モックデータ ----
const AI_SUGGESTIONS = {
  default: ["攻撃的ワード1", "暴力表現2", "ヘイト語3", "侮辱語4", "差別表現5"],
  暴力: ["暴力ワードA", "過激表現B", "危険語C"],
  政治: ["政治禁止語X", "偏向表現Y", "扇動語Z"],
};

function getAiSuggestions(mood) {
  const key = Object.keys(AI_SUGGESTIONS).find((k) => mood.includes(k));
  return AI_SUGGESTIONS[key ?? "default"];
}

// ---- Zod スキーマ ----
const schema = z.object({
  words: z.string().min(1, "NGワードを入力してください"),
  mood: z.string().optional(),
});

/**
 * NGワード設定フォーム
 * Props:
 *   defaultWords: string[]     — 既存NGワードリスト
 *   onSave: (words: string[]) => void
 */
export default function NgWordForm({ defaultWords = [], onSave }) {
  const [aiLoading, setAiLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      words: defaultWords.join(", "),
      mood: "",
    },
  });

  // カンマ区切りテキストから配列に変換
  const parseWords = (text) =>
    text
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

  // テキストエリアの末尾にワードを追加
  const appendWords = (newWords) => {
    const current = form.getValues("words");
    const existing = parseWords(current);
    const merged = [...new Set([...existing, ...newWords])];
    form.setValue("words", merged.join(", "), { shouldDirty: true });
  };

  // テンプレート追加
  const handleTemplate = (key) => {
    appendWords(TEMPLATES[key].words);
    toast.success(`「${TEMPLATES[key].label}」を追加しました`);
  };

  // AIサジェスト（モック）
  const handleAiSuggest = async () => {
    const mood = form.getValues("mood") || "";
    setAiLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    const suggestions = getAiSuggestions(mood);
    appendWords(suggestions);
    setAiLoading(false);
    toast.success("AIがワードをサジェストしました");
  };

  const onSubmit = (values) => {
    const words = parseWords(values.words);
    onSave(words);
    toast.success(`${words.length}件のNGワードを保存しました`);
  };

  const previewWords = parseWords(form.watch("words"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* A. 手動入力 */}
        <FormField
          control={form.control}
          name="words"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">
                A. NGワード手動入力
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="バカ, アホ, 死ね, ..."
                  className="bg-secondary border-0 resize-none min-h-[100px] font-mono text-sm"
                  rows={4}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">カンマ区切りで入力してください</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* プレビューバッジ */}
        {previewWords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {previewWords.slice(0, 20).map((w) => (
              <Badge key={w} variant="secondary" className="text-xs">
                {w}
              </Badge>
            ))}
            {previewWords.length > 20 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{previewWords.length - 20}件
              </Badge>
            )}
          </div>
        )}

        {/* B. テンプレート登録 */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">B. テンプレートから追加</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TEMPLATES).map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTemplate(key)}
                className="text-xs"
              >
                + {TEMPLATES[key].label}
              </Button>
            ))}
          </div>
        </div>

        {/* C. AIサジェスト */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">C. AIサジェスト</p>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="弾きたい雰囲気（例: 暴力、政治）"
                      className="bg-secondary border-0 text-sm"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAiSuggest}
              disabled={aiLoading}
              className="shrink-0 gap-1.5"
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-yellow-400" />
              )}
              {aiLoading ? "解析中..." : "AIでサジェスト"}
            </Button>
          </div>
        </div>

        {/* 保存ボタン */}
        <Button type="submit" className="w-full gap-2">
          <Save className="w-4 h-4" />
          NGワードを保存する（{previewWords.length}件）
        </Button>
      </form>
    </Form>
  );
}