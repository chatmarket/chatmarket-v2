import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen, Plus, Search, ChevronDown, ChevronUp, Edit3, Trash2, X, Save, Star, RefreshCw, Tag, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const THEMES = ["恋愛・結婚", "仕事・転職", "人間関係", "健康", "金運・財運", "総合運", "その他"];
const THEME_COLORS = {
  "恋愛・結婚": "#ec4899",
  "仕事・転職": "#3b82f6",
  "人間関係": "#10b981",
  "健康": "#22d3ee",
  "金運・財運": "#f59e0b",
  "総合運": "#a78bfa",
  "その他": "#6b7280",
};

const EMPTY_FORM = {
  client_name: "",
  client_email: "",
  consultation_theme: "恋愛・結婚",
  birth_date: "",
  fortune_method: "",
  consultation_content: "",
  reading_result: "",
  private_memo: "",
  follow_up_date: "",
  rating: 0,
  tags: [],
  session_type: "manual",
};

export default function FortuneKartePanel({ channel, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQ, setSearchQ] = useState("");
  const [filterTheme, setFilterTheme] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [tagInput, setTagInput] = useState("");

  const { data: kartes = [], isLoading } = useQuery({
    queryKey: ["fortune-kartes", channel?.id],
    queryFn: () => base44.entities.FortuneKarte.filter({ channel_id: channel.id }, "-created_date", 100),
    enabled: !!channel?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editTarget) {
        return base44.entities.FortuneKarte.update(editTarget.id, data);
      }
      // リピーター判定
      const sameClient = kartes.filter((k) => k.client_email && k.client_email === data.client_email);
      const repeatCount = sameClient.length + 1;
      return base44.entities.FortuneKarte.create({
        ...data,
        channel_id: channel.id,
        channel_owner_email: user.email,
        is_repeat_client: repeatCount > 1,
        repeat_count: repeatCount,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fortune-kartes", channel?.id] });
      setShowForm(false);
      setEditTarget(null);
      setForm(EMPTY_FORM);
      toast.success(editTarget ? "カルテを更新しました" : "鑑定カルテを保存しました 🔮");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FortuneKarte.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fortune-kartes", channel?.id] });
      toast.success("カルテを削除しました");
    },
  });

  const openNew = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (k) => {
    setEditTarget(k);
    setForm({
      client_name: k.client_name || "",
      client_email: k.client_email || "",
      consultation_theme: k.consultation_theme || "恋愛・結婚",
      birth_date: k.birth_date || "",
      fortune_method: k.fortune_method || "",
      consultation_content: k.consultation_content || "",
      reading_result: k.reading_result || "",
      private_memo: k.private_memo || "",
      follow_up_date: k.follow_up_date || "",
      rating: k.rating || 0,
      tags: k.tags || [],
      session_type: k.session_type || "manual",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  // フィルタリング
  const filtered = kartes.filter((k) => {
    const matchTheme = filterTheme === "all" || k.consultation_theme === filterTheme;
    const matchSearch = !searchQ || [k.client_name, k.client_email, k.consultation_content, k.reading_result, ...(k.tags || [])]
      .filter(Boolean).join(" ").toLowerCase().includes(searchQ.toLowerCase());
    return matchTheme && matchSearch;
  });

  const repeatClients = kartes.filter((k) => k.is_repeat_client);
  const totalKartes = kartes.length;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)" }}>
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-black text-base text-white flex items-center gap-2">
              🔮 鑑定カルテ
              <span className="text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">{totalKartes}件</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              リピーター <span className="text-violet-400 font-bold">{repeatClients.length}人</span>
            </p>
          </div>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="w-4 h-4" /> 新規カルテ
        </Button>
      </div>

      {/* 新規 / 編集フォーム */}
      {showForm && (
        <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-950/60 to-indigo-950/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-black text-sm text-violet-300">{editTarget ? "カルテを編集" : "新規鑑定カルテ"}</p>
            <button onClick={() => { setShowForm(false); setEditTarget(null); }} className="text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300/70">相談者名</label>
              <Input value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="例: 山田 花子" className="bg-black/30 border-violet-500/30 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300/70">メール（任意）</label>
              <Input value={form.client_email} onChange={(e) => setForm(f => ({ ...f, client_email: e.target.value }))}
                placeholder="example@email.com" className="bg-black/30 border-violet-500/30 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300/70">相談テーマ</label>
              <select value={form.consultation_theme} onChange={(e) => setForm(f => ({ ...f, consultation_theme: e.target.value }))}
                className="w-full h-9 rounded-md bg-black/30 border border-violet-500/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50">
                {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300/70">占術</label>
              <Input value={form.fortune_method} onChange={(e) => setForm(f => ({ ...f, fortune_method: e.target.value }))}
                placeholder="例: タロット、西洋占星術" className="bg-black/30 border-violet-500/30 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300/70">生年月日（任意）</label>
              <Input type="date" value={form.birth_date} onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))}
                className="bg-black/30 border-violet-500/30 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-violet-300/70">フォローアップ予定日</label>
              <Input type="date" value={form.follow_up_date} onChange={(e) => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                className="bg-black/30 border-violet-500/30 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-violet-300/70">相談内容</label>
            <Textarea value={form.consultation_content} onChange={(e) => setForm(f => ({ ...f, consultation_content: e.target.value }))}
              placeholder="相談者が話してくれた内容をメモ..." rows={3}
              className="bg-black/30 border-violet-500/30 text-sm resize-none" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-violet-300/70">鑑定結果・アドバイス</label>
            <Textarea value={form.reading_result} onChange={(e) => setForm(f => ({ ...f, reading_result: e.target.value }))}
              placeholder="カードの内容、鑑定の結論、アドバイスなど..." rows={4}
              className="bg-black/30 border-violet-500/30 text-sm resize-none" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-violet-300/70">🔒 プライベートメモ（相談者非公開）</label>
            <Textarea value={form.private_memo} onChange={(e) => setForm(f => ({ ...f, private_memo: e.target.value }))}
              placeholder="次回に向けての個人的なメモ..." rows={2}
              className="bg-black/30 border-red-500/20 text-sm resize-none" />
          </div>

          {/* タグ */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-violet-300/70">タグ（Enterで追加）</label>
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag}
              placeholder="例: 復縁、転職、片想い..." className="bg-black/30 border-violet-500/30 text-sm" />
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 自己評価 */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-violet-300/70">鑑定の自己評価</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}>
                  <Star className={`w-5 h-5 transition-colors ${form.rating >= n ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "保存中..." : "カルテを保存"}
          </Button>
        </div>
      )}

      {/* 検索・フィルター */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 relative min-w-40">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
            placeholder="名前・内容・タグで検索..."
            className="pl-8 bg-secondary border-0 text-sm h-9" />
        </div>
        <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)}
          className="h-9 rounded-md bg-secondary border-0 px-3 text-xs text-foreground focus:outline-none shrink-0">
          <option value="all">すべてのテーマ</option>
          {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* カルテ一覧 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <div className="text-4xl">🔮</div>
          <p className="text-sm text-muted-foreground">鑑定カルテがまだありません</p>
          <p className="text-xs text-muted-foreground/60">通話後に「新規カルテ」から記録を残しましょう</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((k) => {
            const themeColor = THEME_COLORS[k.consultation_theme] || "#6b7280";
            const isExpanded = expandedId === k.id;
            return (
              <div key={k.id} className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all">
                {/* カード行 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  onClick={() => setExpandedId(isExpanded ? null : k.id)}
                >
                  {/* テーマカラーライン */}
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: themeColor }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">{k.client_name || "匿名"}</span>
                      {k.is_repeat_client && (
                        <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <RefreshCw className="w-2.5 h-2.5" /> リピーター({k.repeat_count}回目)
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                        style={{ color: themeColor, borderColor: themeColor + "40", background: themeColor + "15" }}>
                        {k.consultation_theme}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {k.fortune_method && <span className="flex items-center gap-1"><span>✨</span>{k.fortune_method}</span>}
                      {k.created_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(k.created_date), "M/d", { locale: ja })}</span>}
                      {k.follow_up_date && <span className="flex items-center gap-1 text-amber-400/70"><Calendar className="w-3 h-3" />フォロー: {k.follow_up_date}</span>}
                      {k.rating > 0 && <span className="flex items-center gap-0.5 text-yellow-400">{Array.from({ length: k.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400" />)}</span>}
                    </div>
                    {k.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {k.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* 展開詳細 */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/30">
                    {k.consultation_content && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">相談内容</p>
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">{k.consultation_content}</p>
                      </div>
                    )}
                    {k.reading_result && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-violet-400/70 uppercase tracking-widest">🔮 鑑定結果・アドバイス</p>
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap rounded-lg p-3"
                          style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)" }}>
                          {k.reading_result}
                        </p>
                      </div>
                    )}
                    {k.private_memo && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">🔒 プライベートメモ</p>
                        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap bg-red-500/5 border border-red-500/15 rounded-lg p-3">{k.private_memo}</p>
                      </div>
                    )}
                    {k.birth_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> 生年月日: {k.birth_date}
                      </p>
                    )}
                    {/* 操作ボタン */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openEdit(k)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
                        <Edit3 className="w-3.5 h-3.5" /> 編集
                      </button>
                      <button onClick={() => { if (confirm("このカルテを削除しますか？")) deleteMutation.mutate(k.id); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> 削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}