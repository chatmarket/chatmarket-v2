import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Download, Package, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const FILE_ACCEPT = ".pdf,.mp3,.zip,.jpg,.png,.mp4";

export default function ProductManagePanel({ channel }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: 500, stock: -1,
    is_digital: false, file_url: "", file_name: "", file_type: "other",
    image_url: "", category: "goods",
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", channel?.id],
    queryFn: () => base44.entities.Product.filter({ channel_id: channel.id }, "-created_date", 50),
    enabled: !!channel?.id,
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
      toast.success("画像をアップロードしました");
    } catch (err) {
      toast.error("画像アップロード失敗");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const ext = file.name.split(".").pop().toLowerCase();
      const typeMap = { pdf: "pdf", mp3: "mp3", zip: "zip", jpg: "jpg", png: "png", mp4: "mp4" };
      setForm(f => ({ ...f, file_url, file_name: file.name, file_type: typeMap[ext] || "other" }));
      toast.success("ファイルをアップロードしました");
    } catch (err) {
      toast.error("ファイルアップロード失敗");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.price) { toast.error("タイトルと価格は必須です"); return; }
    if (form.is_digital && !form.file_url) { toast.error("デジタル商品はファイルのアップロードが必要です"); return; }
    setSaving(true);
    try {
      await base44.entities.Product.create({
        ...form,
        channel_id: channel.id,
        channel_name: channel.name,
        owner_email: channel.owner_email,
        category: form.is_digital ? "digital" : "goods",
        sold_count: 0,
        is_active: true,
      });
      qc.invalidateQueries(["products", channel.id]);
      toast.success("商品を登録しました");
      setShowForm(false);
      setForm({ title: "", description: "", price: 500, stock: -1, is_digital: false, file_url: "", file_name: "", file_type: "other", image_url: "", category: "goods" });
    } catch (err) {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product) => {
    await base44.entities.Product.update(product.id, { is_active: !product.is_active });
    qc.invalidateQueries(["products", channel.id]);
  };

  const handleDelete = async (product) => {
    if (!confirm(`「${product.title}」を削除しますか？`)) return;
    await base44.entities.Product.delete(product.id);
    qc.invalidateQueries(["products", channel.id]);
    toast.success("削除しました");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">物販・デジタル販売</h3>
        <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-2">
          <Plus className="w-4 h-4" />新規登録
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">デジタル商品</Label>
            <Switch checked={form.is_digital} onCheckedChange={v => setForm(f => ({ ...f, is_digital: v }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">タイトル *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="商品名" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">説明</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="商品の説明" rows={2} />
            </div>
            <div>
              <Label className="text-xs">価格（円）*</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} min={0} />
            </div>
            <div>
              <Label className="text-xs">在庫数（-1=無制限）</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
          </div>

          {/* サムネイル */}
          <div>
            <Label className="text-xs">サムネイル画像</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.image_url && <img src={form.image_url} className="w-12 h-12 rounded-lg object-cover" alt="" />}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingImage} asChild>
                  <span>{uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}　画像選択</span>
                </Button>
              </label>
            </div>
          </div>

          {/* デジタルファイル */}
          {form.is_digital && (
            <div>
              <Label className="text-xs">販売ファイル（PDF / MP3 / ZIP など）*</Label>
              <div className="flex items-center gap-2 mt-1">
                {form.file_name && <span className="text-xs text-primary bg-primary/10 rounded px-2 py-1">{form.file_name}</span>}
                <label className="cursor-pointer">
                  <input type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingFile} asChild>
                    <span>{uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}　ファイル選択</span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>キャンセル</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}保存
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">商品が登録されていません</p>
      ) : (
        <div className="space-y-2">
          {products.map(product => (
            <div key={product.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              {product.image_url ? (
                <img src={product.image_url} className="w-12 h-12 object-cover rounded-lg shrink-0" alt="" />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  {product.is_digital ? <Download className="w-5 h-5 text-muted-foreground" /> : <Package className="w-5 h-5 text-muted-foreground" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm truncate">{product.title}</p>
                  <Badge className={`text-xs shrink-0 ${product.is_digital ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"}`}>
                    {product.is_digital ? "デジタル" : "グッズ"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">¥{product.price?.toLocaleString()} · {product.sold_count || 0}件販売</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(product)} className="text-muted-foreground hover:text-foreground transition-colors" title={product.is_active ? "販売中（クリックで停止）" : "停止中（クリックで再開）"}>
                  {product.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => handleDelete(product)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}