import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "ono@onestep-corp.com";

export default function BlogEdit() {
  const { id } = useParams(); // undefined = new post
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "お知らせ",
    status: "draft",
    author_name: "ChatMarket運営",
    published_at: new Date().toISOString().slice(0, 16),
    thumbnail_url: "",
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          if (u.email !== ADMIN_EMAIL) navigate("/blog");
        }).catch(() => navigate("/blog"));
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: existing } = useQuery({
    queryKey: ["blog-post-edit", id],
    queryFn: () => base44.entities.BlogPost.filter({ id }),
    select: (data) => data[0],
    enabled: !!id,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || "",
        content: existing.content || "",
        excerpt: existing.excerpt || "",
        category: existing.category || "お知らせ",
        status: existing.status || "draft",
        author_name: existing.author_name || "ChatMarket運営",
        published_at: existing.published_at ? existing.published_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
        thumbnail_url: existing.thumbnail_url || "",
      });
    }
  }, [existing]);

  const handleSave = async (status) => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("タイトルと本文を入力してください");
      return;
    }
    setSaving(true);

    let thumbnail_url = form.thumbnail_url;
    if (thumbnailFile) {
      const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
      thumbnail_url = res.file_url;
    }

    const data = {
      ...form,
      thumbnail_url,
      status,
      published_at: status === "published" ? (form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString()) : form.published_at ? new Date(form.published_at).toISOString() : null,
    };

    if (id) {
      await base44.entities.BlogPost.update(id, data);
      toast.success("記事を更新しました");
    } else {
      const created = await base44.entities.BlogPost.create(data);
      toast.success("記事を作成しました");
      queryClient.invalidateQueries({ queryKey: ["blog-posts-all"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts-public"] });
      navigate(`/blog/${created.id}`);
      setSaving(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["blog-posts-all"] });
    queryClient.invalidateQueries({ queryKey: ["blog-posts-public"] });
    queryClient.invalidateQueries({ queryKey: ["blog-post", id] });
    setSaving(false);
    navigate(`/blog/${id}`);
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/blog")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
        <h1 className="text-xl font-bold">{id ? "記事を編集" : "新規記事を作成"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> 下書き保存
          </Button>
          <Button size="sm" onClick={() => handleSave("published")} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            公開する
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Thumbnail */}
        <div className="space-y-2">
          <Label>サムネイル画像</Label>
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files[0])} />
            {thumbnailFile ? (
              <span className="text-sm text-primary font-medium">{thumbnailFile.name}</span>
            ) : form.thumbnail_url ? (
              <img src={form.thumbnail_url} alt="" className="h-full object-contain rounded-xl" />
            ) : (
              <div className="text-center">
                <Image className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">サムネイル画像を選択</p>
              </div>
            )}
          </label>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>タイトル *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="記事タイトル" className="bg-secondary border-0 text-lg font-semibold" />
        </div>

        {/* Excerpt */}
        <div className="space-y-2">
          <Label>概要（一覧表示用）</Label>
          <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="記事の概要を入力..." className="bg-secondary border-0 resize-none" rows={2} />
        </div>

        {/* Category & Author */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>カテゴリー</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-secondary border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["お知らせ", "使い方", "アップデート", "コラム", "その他"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>著者名</Label>
            <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="bg-secondary border-0" />
          </div>
        </div>

        {/* Published at */}
        <div className="space-y-2">
          <Label>公開日時</Label>
          <Input type="datetime-local" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} className="bg-secondary border-0" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label>本文（Markdown対応）*</Label>
          <Textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="# 見出し&#10;&#10;本文を入力してください...&#10;&#10;**太字** や *斜体* も使えます。"
            className="bg-secondary border-0 resize-none font-mono text-sm"
            rows={20}
          />
          <p className="text-xs text-muted-foreground">Markdown記法が使えます。# で見出し、**太字**、*斜体*、- でリストなど。</p>
        </div>
      </div>
    </div>
  );
}