import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Download, Package, Loader2, ToggleLeft, ToggleRight, Zap, ClipboardList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const FILE_ACCEPT = ".pdf,.mp3,.zip,.jpg,.png,.mp4";

// 物理グッズ販売は将来候補・現在非公開。is_digital は常に true で固定。
const EMPTY_FORM = {
  title: "", description: "", price: 500, stock: -1,
  is_digital: true, delivery_mode: "instant",
  file_url: "", file_name: "", file_type: "other",
  image_url: "", category: "digital",
  custom_order_description: "", delivery_days_estimate: 7,
  // 音源向け任意フィールド
  music_release_type: "", track_count: "", audio_format_label: "", artist_name: "", release_year: "",
};

const RELEASE_TYPES = [
  { value: "single", label: "Single", hint: "1曲単品の販売に向いています" },
  { value: "ep", label: "EP", hint: "複数曲をZIPでまとめて販売する場合に向いています" },
  { value: "album", label: "Album", hint: "複数曲をZIPでまとめて販売する場合に向いています" },
  { value: "sample_pack", label: "Sample Pack", hint: "BGM素材、効果音、ループ素材、ボイス素材などの販売に向いています" },
];

const AUDIO_FORMAT_OPTIONS = ["MP3", "ZIP", "MP3 + PDF", "ZIP音源パック"];

// 音源ファイル種別（mp3 / zip）は著作権確認が必要
const MUSIC_FILE_TYPES = ["mp3", "zip"];
function isMusicFile(fileType) {
  return MUSIC_FILE_TYPES.includes(fileType);
}

// 音源販売対象カテゴリ判定（prop の isMusician は canSellAudio の意味で使用）
const AUDIO_SELLER_SERVICE_CATS = ["musician", "idol", "singer", "voice_actor", "voice_creator"];
const AUDIO_SELLER_CAT_IDS = ["music", "idol", "voice"];

export default function ProductManagePanel({ channel, isMusician = false }) {
  // isMusician prop は親から canSellAudio として渡されるが、念のちゃんと channel でも再判定
  const isAudioSeller = isMusician || !!(channel && (
    AUDIO_SELLER_SERVICE_CATS.includes(channel.service_category) ||
    AUDIO_SELLER_CAT_IDS.includes(channel.category_id)
  ));
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

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
    } catch { toast.error("画像アップロード失敗"); }
    finally { setUploadingImage(false); }
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
    } catch { toast.error("ファイルアップロード失敗"); }
    finally { setUploadingFile(false); }
  };

  const handleSave = async () => {
    if (!form.title || !form.price) { toast.error("タイトルと価格は必須です"); return; }
    if (form.is_digital && form.delivery_mode === "instant" && !form.file_url) {
      toast.error("即時配信モードではファイルのアップロードが必要です"); return;
    }
    // 音源販売対象チャンネルで音源ファイルの場合のみ権利確認チェックが必須
    if (isAudioSeller && isMusicFile(form.file_type) && !rightsConfirmed) {
      toast.error("音源の権利確認チェックボックスにチェックを入れてください");
      return;
    }
    setSaving(true);
    try {
      // 音源向け任意フィールドを整理（空文字は undefined にして保存しない）
      const musicFields = isAudioSeller ? {
        ...(form.music_release_type ? { music_release_type: form.music_release_type } : {}),
        ...(form.track_count ? { track_count: Number(form.track_count) } : {}),
        ...(form.audio_format_label ? { audio_format_label: form.audio_format_label } : {}),
        ...(form.artist_name ? { artist_name: form.artist_name } : {}),
        ...(form.release_year ? { release_year: Number(form.release_year) } : {}),
      } : {};
      const extraFields = isAudioSeller && isMusicFile(form.file_type) ? {
        rights_confirmed: true,
        rights_confirmation_type: "original_music_only",
        rights_confirmed_at: new Date().toISOString(),
        rights_confirmed_by: channel.owner_email,
      } : {};
      await base44.entities.Product.create({
        ...form,
        ...musicFields,
        ...extraFields,
        is_digital: true,
        channel_id: channel.id,
        channel_name: channel.name,
        owner_email: channel.owner_email,
        category: "digital",
        sold_count: 0,
        is_active: true,
      });
      qc.invalidateQueries(["products", channel.id]);
      toast.success("商品を登録しました");
      setShowForm(false);
      setForm(EMPTY_FORM);
      setRightsConfirmed(false);
    } catch { toast.error("保存に失敗しました"); }
    finally { setSaving(false); }
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

  const isCustomOrder = form.is_digital && form.delivery_mode === "custom_order";
  const isInstant = form.is_digital && form.delivery_mode === "instant";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          {isAudioSeller ? "楽曲・音源販売" : "デジタルコンテンツ販売"}
        </h3>
        <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-2">
          <Plus className="w-4 h-4" />{isAudioSeller ? "作品を追加" : "新規登録"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">

          {/* デジタル商品のみ対応（物理グッズは将来候補・現在非公開） */}
          {/* 配信モード選択 */}
          {(
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, delivery_mode: "instant" }))}
                className={`rounded-lg border p-3 text-left transition-colors ${form.delivery_mode === "instant" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-4 h-4 ${form.delivery_mode === "instant" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">即時配信</span>
                </div>
                <p className="text-xs text-muted-foreground">事前にファイルをアップ。購入と同時に自動でDL付与（PDF・音声・資料販売）</p>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, delivery_mode: "custom_order" }))}
                className={`rounded-lg border p-3 text-left transition-colors ${form.delivery_mode === "custom_order" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className={`w-4 h-4 ${form.delivery_mode === "custom_order" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">オーダーメイド納品</span>
                </div>
                <p className="text-xs text-muted-foreground">注文後に個別作成して手動アップ・納品（占い師向け鑑定書）</p>
              </button>
            </div>
          )}

          {/* 共通フィールド */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">{isAudioSeller ? "作品タイトル *" : "タイトル *"}</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={isAudioSeller ? "例：星の帰り道" : "商品名"} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">{isAudioSeller ? "作品説明" : "説明"}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={isAudioSeller ? "楽曲の雰囲気、収録内容、使用用途などを記載してください" : "商品の説明"} rows={2} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">販売価格（円）*</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} min={0}
                placeholder="例：500" />
              {/* 音源販売対象チャンネル × 音源ファイルの組み合わせのみ手数料表示 */}
              {form.price > 0 && isAudioSeller && isMusicFile(form.file_type) && (
                <div className="mt-2 bg-secondary/60 rounded-lg p-2.5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>運営手数料 10%</span>
                    <span>−¥{Math.floor(form.price * 0.10).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>決済手数料 3.6%</span>
                    <span>−¥{Math.floor(form.price * 0.036).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary border-t border-border pt-1 mt-1">
                    <span>受取予定額</span>
                    <span>¥{(form.price - Math.floor(form.price * 0.10) - Math.floor(form.price * 0.036)).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-0.5">音源販売の運営手数料は10%です。決済手数料3.6%は売上から差し引かれます。購入者に表示される価格は販売価格のみです。</p>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">在庫数（-1=無制限）</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
          </div>

          {/* 音源販売対象向け追加項目 */}
          {isAudioSeller && (
            <div className="space-y-3 p-3 bg-card rounded-xl border border-border">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">🎵 音源情報（任意）</p>

              {/* 作品タイプ */}
              <div>
                <Label className="text-xs">作品タイプ</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {RELEASE_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, music_release_type: f.music_release_type === rt.value ? "" : rt.value }))}
                      className={`text-left rounded-lg border p-2 transition-colors ${form.music_release_type === rt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                    >
                      <p className="text-xs font-bold">{rt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{rt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* アーティスト名 */}
                <div>
                  <Label className="text-xs">アーティスト名</Label>
                  <Input value={form.artist_name} onChange={e => setForm(f => ({ ...f, artist_name: e.target.value }))}
                    placeholder={channel?.name || "アーティスト名"} className="text-xs" />
                </div>
                {/* 収録曲数 */}
                <div>
                  <Label className="text-xs">収録曲数</Label>
                  <Input type="number" min={1} value={form.track_count} onChange={e => setForm(f => ({ ...f, track_count: e.target.value }))}
                    placeholder="例：4" className="text-xs" />
                </div>
                {/* リリース年 */}
                <div>
                  <Label className="text-xs">リリース年</Label>
                  <Input type="number" min={2000} max={2099} value={form.release_year} onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))}
                    placeholder={String(new Date().getFullYear())} className="text-xs" />
                </div>
                {/* 音源形式 */}
                <div>
                  <Label className="text-xs">音源形式</Label>
                  <select
                    value={form.audio_format_label}
                    onChange={e => setForm(f => ({ ...f, audio_format_label: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">選択してください</option>
                    {AUDIO_FORMAT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* サムネイル */}
          <div>
            <Label className="text-xs">{isAudioSeller ? "ジャケット画像" : "サムネイル画像"}</Label>
            {isAudioSeller && <p className="text-[10px] text-muted-foreground mb-1">正方形のジャケット画像を設定すると、アルバムのように表示されます</p>}
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

          {/* 即時配信：ファイルアップロード */}
          {isInstant && (
            <div className="space-y-2">
              <Label className="text-xs">{isAudioSeller ? "音源ファイル（MP3 / ZIP など）*" : "販売ファイル（PDF / MP3 / ZIP など）*"}</Label>
              {isAudioSeller && <p className="text-[10px] text-muted-foreground -mt-1">MP3、ZIPなどの音源ファイルをアップロードできます</p>}
              <div className="flex items-center gap-2 mt-1">
                {form.file_name && <span className="text-xs text-primary bg-primary/10 rounded px-2 py-1">{form.file_name}</span>}
                <label className="cursor-pointer">
                  <input type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingFile} asChild>
                    <span>{uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}　ファイル選択</span>
                  </Button>
                </label>
              </div>

              {/* 音源ファイルの場合のみ著作権注意表示（音源販売対象チャンネルのみ） */}
              {isAudioSeller && isMusicFile(form.file_type) && (
                <div className="space-y-3 mt-3">
                  {/* 注意バナー */}
                  <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-amber-300">音源販売に関する重要事項</p>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      販売できる音源は、ご自身が権利を持つ完全オリジナル音源に限ります。他人の楽曲のカバー、歌ってみた、演奏してみた、既存曲のアレンジ、カラオケ音源を使用した録音、権利者の許可が不明確な音源の販売は禁止されています。
                    </p>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-amber-400">📋 販売禁止の音源（例）</p>
                      <ul className="text-[10px] text-amber-200/70 space-y-0.5">
                        <li>✗ 他人の楽曲のカバー音源 / 歌ってみた / 演奏してみた</li>
                        <li>✗ 既存曲のアレンジ・カラオケ音源使用録音</li>
                        <li>✗ 市販楽曲・配信楽曲・CD音源を含むもの</li>
                        <li>✗ 権利関係が不明確なAI生成音源</li>
                      </ul>
                    </div>
                    <p className="text-[10px] text-amber-300/60">カバー曲や歌ってみた音源は、たとえ自分で歌唱・演奏していても、Chat Market上での販売対象外です。</p>
                  </div>

                  {/* 必須チェックボックス */}
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${rightsConfirmed ? "border-green-500/60 bg-green-500/10" : "border-border bg-card hover:border-amber-500/40"}`}>
                    <input
                      type="checkbox"
                      checked={rightsConfirmed}
                      onChange={e => setRightsConfirmed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 shrink-0 accent-green-500"
                    />
                    <span className="text-xs leading-relaxed text-foreground/90">
                      私は、この音源が自分または所属先が販売権利を持つオリジナル音源であり、他人の楽曲のカバー・歌ってみた・演奏してみた・既存曲のアレンジではないことを確認しました。
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* オーダーメイド：設定フィールド */}
          {isCustomOrder && (
            <div className="space-y-3 p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-primary font-semibold">📋 オーダーメイド設定</p>
              <div>
                <Label className="text-xs">購入者への案内文（注意事項・納品内容の説明）</Label>
                <Textarea
                  value={form.custom_order_description}
                  onChange={e => setForm(f => ({ ...f, custom_order_description: e.target.value }))}
                  placeholder="例：ご購入後、3〜7日以内にPDF形式の個別鑑定書をお届けします。"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">納品目安日数</Label>
                <Input
                  type="number"
                  value={form.delivery_days_estimate}
                  onChange={e => setForm(f => ({ ...f, delivery_days_estimate: Number(e.target.value) }))}
                  min={1} max={60}
                  className="w-32"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setRightsConfirmed(false); }}>キャンセル</Button>
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
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground text-sm truncate">{product.title}</p>
                  {product.is_digital && (
                    <Badge className={`text-xs shrink-0 ${product.delivery_mode === "custom_order" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"}`}>
                      {product.delivery_mode === "custom_order" ? "オーダーメイド" : "即時配信"}
                    </Badge>
                  )}
                  {/* 物理グッズバッジは非表示（将来候補） */}
                </div>
                <p className="text-sm text-muted-foreground">¥{product.price?.toLocaleString()} · {product.sold_count || 0}件販売</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(product)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={product.is_active ? "販売中（クリックで停止）" : "停止中（クリックで再開）"}
                >
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