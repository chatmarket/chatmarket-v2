import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRICE_OPTIONS = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];

export default function ChekiSettingsPanel({ channel, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: 1000, image_url: "", stock: -1, is_active: true });

  const { data: chekis = [] } = useQuery({
    queryKey: ["my-chekis", channel?.id],
    queryFn: () => base44.entities.DigitalCheki.filter({ channel_id: channel.id }, "-created_date"),
    enabled: !!channel?.id,
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!form.title || !form.price) { toast.error("タイトルと価格は必須です"); return; }
    setSaving(true);
    await base44.entities.DigitalCheki.create({
      ...form,
      channel_id: channel.id,
      channel_name: channel.name,
      owner_email: user.email,
      sold_count: 0,
    });
    queryClient.invalidateQueries({ queryKey: ["my-chekis", channel.id] });
    queryClient.invalidateQueries({ queryKey: ["channel-chekis", channel.id] });
    setForm({ title: "", description: "", price: 1000, image_url: "", stock: -1, is_active: true });
    setShowForm(false);
    setSaving(false);
    toast.success("チェキ商品を追加しました");
  };

  const handleToggle = async (cheki) => {
    await base44.entities.DigitalCheki.update(cheki.id, { is_active: !cheki.is_active });
    queryClient.invalidateQueries({ queryKey: ["my-chekis", channel.id] });
    queryClient.invalidateQueries({ queryKey: ["channel-chekis", channel.id] });
  };

  const handleDelete = async (chekiId) => {
    if (!window.confirm("削除しますか？")) return;
    await base44.entities.DigitalCheki.delete(chekiId);
    queryClient.invalidateQueries({ queryKey: ["my-chekis", channel.id] });
    queryClient.invalidateQueries({ queryKey: ["channel-chekis", channel.id] });
    toast.success("削除しました");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-pink-400 flex items-center gap-2">
          <Camera className="w-5 h-5" /> デジタルチェキ販売設定
        </h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}
          className="gap-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30">
          <Plus className="w-3.5 h-3.5" /> 商品を追加
        </Button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-pink-500/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold mb-1 block">タイトル *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例: サイン入りチェキ" className="bg-background border-border/50" />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1 block">価格（円）*</Label>
              <select
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-md border border-border/50 bg-background text-sm"
              >
                {PRICE_OPTIONS.map((p) => (
                  <option key={p} value={p}>¥{p.toLocaleString()}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold mb-1 block">説明（300文字以内）</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="チェキの内容説明" className="bg-background border-border/50 resize-none" rows={2} maxLength={300} />
          </div>

          <div>
            <Label className="text-xs font-bold mb-1 block">サムネイル画像</Label>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => handleImageUpload(e.target.files[0])} />
              <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border/50 rounded-lg hover:border-pink-500/50 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">{form.image_url ? "アップロード済み ✓" : "画像をアップロード"}</span>
                {form.image_url && <img src={form.image_url} alt="" className="w-8 h-8 rounded object-cover ml-auto" />}
              </div>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>キャンセル</Button>
            <Button size="sm" className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
              onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "商品を追加"}
            </Button>
          </div>
        </div>
      )}

      {/* 商品一覧 */}
      {chekis.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>まだチェキ商品がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chekis.map((cheki) => (
            <div key={cheki.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cheki.is_active ? "border-pink-500/30 bg-pink-500/5" : "border-border/30 opacity-60"}`}>
              {cheki.image_url
                ? <img src={cheki.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0"><Camera className="w-5 h-5 text-pink-400" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{cheki.title}</p>
                <p className="text-xs text-pink-400 font-black">¥{cheki.price.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">販売数: {cheki.sold_count || 0}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={cheki.is_active} onCheckedChange={() => handleToggle(cheki)} />
                <button onClick={() => handleDelete(cheki.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
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