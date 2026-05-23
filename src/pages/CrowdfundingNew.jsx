import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Loader2, Image, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function CrowdfundingNew() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [imageFiles, setImageFiles] = useState([null, null, null]);
  const [certFile, setCertFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    organization_type: "",
    organization_name: "",
    representative_name: "",
    contact_name: "",
    address: "",
    phone: "",
    hp_url: "",
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const handleImageChange = (index, file) => {
    const updated = [...imageFiles];
    updated[index] = file;
    setImageFiles(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.organization_type || !form.organization_name || !form.representative_name || !form.contact_name || !form.address || !form.phone) {
      toast.error("必須項目をすべて入力してください");
      return;
    }
    setSubmitting(true);

    const uploadedImages = [];
    for (const file of imageFiles) {
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        uploadedImages.push(res.file_url);
      } else {
        uploadedImages.push(null);
      }
    }

    let certificate_url = null;
    if (certFile) {
      const res = await base44.integrations.Core.UploadFile({ file: certFile });
      certificate_url = res.file_url;
    }

    const { data: channels = [] } = { data: await base44.entities.Channel.filter({ owner_email: user.email }) };
    const channel = channels[0];

    await base44.entities.CrowdfundingProject.create({
      ...form,
      owner_email: user.email,
      channel_id: channel?.id || "",
      channel_name: channel?.name || user.full_name,
      image_url_1: uploadedImages[0] || null,
      image_url_2: uploadedImages[1] || null,
      image_url_3: uploadedImages[2] || null,
      certificate_url,
      status: "pending",
      total_raised: 0,
      supporter_count: 0,
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold">申請を受け付けました</h2>
      <p className="text-muted-foreground text-sm">チャットマーケットが内容を審査し、電話にてご確認の上、審査結果をご連絡いたします。審査には数営業日かかる場合があります。</p>
      <Button onClick={() => navigate("/crowdfunding")} className="bg-primary hover:bg-primary/90">一覧に戻る</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-red-400" />
        <h1 className="text-2xl font-bold">クラウドファンディング登録申請</h1>
      </div>

      {/* Review notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8 text-sm text-blue-200 space-y-2">
        <p className="font-semibold">📋 審査について</p>
        <ul className="space-y-1 list-disc list-inside text-blue-200/80">
          <li>対象：正式なNPO団体のみ</li>
          <li>各種証明書類の提出が必要です</li>
          <li>チャットマーケットが独自審査を行います</li>
          <li>審査後、代表者・担当者に電話にてご確認いたします</li>
          <li>承認後にプロジェクトが公開されます</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Type */}
        <div className="space-y-2">
          <Label>団体種別 <span className="text-red-400">*</span></Label>
          <Select value={form.organization_type} onValueChange={(v) => setForm({ ...form, organization_type: v })}>
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="npo">正式なNPO法人</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Organization Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>正式団体名 <span className="text-red-400">*</span></Label>
            <Input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} className="bg-secondary border-0" placeholder="例：特定非営利活動法人〇〇" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>代表者氏名 <span className="text-red-400">*</span></Label>
              <Input value={form.representative_name} onChange={(e) => setForm({ ...form, representative_name: e.target.value })} className="bg-secondary border-0" placeholder="山田 太郎" />
            </div>
            <div className="space-y-2">
              <Label>担当者氏名 <span className="text-red-400">*</span></Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="bg-secondary border-0" placeholder="鈴木 花子" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>住所 <span className="text-red-400">*</span></Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary border-0" placeholder="東京都〇〇区〇〇1-2-3" />
          </div>
          <div className="space-y-2">
            <Label>電話番号 <span className="text-red-400">*</span></Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary border-0" placeholder="03-XXXX-XXXX" />
          </div>
          <div className="space-y-2">
            <Label>公式HP URL</Label>
            <Input value={form.hp_url} onChange={(e) => setForm({ ...form, hp_url: e.target.value })} className="bg-secondary border-0" placeholder="https://example.org" />
          </div>
        </div>

        {/* Certificate */}
        <div className="space-y-2">
          <Label>各種証明書類（登記簿謄本・設立認証書など）</Label>
          <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setCertFile(e.target.files[0])} />
            {certFile ? (
              <span className="text-sm text-primary font-medium">{certFile.name}</span>
            ) : (
              <span className="text-xs text-muted-foreground">証明書類をアップロード（PDF・画像）</span>
            )}
          </label>
        </div>

        {/* Project Info */}
        <div className="space-y-2">
          <Label>プロジェクトタイトル <span className="text-red-400">*</span></Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-secondary border-0" placeholder="プロジェクトタイトル" />
        </div>

        <div className="space-y-2">
          <Label>プロジェクト説明（最大10,000文字）</Label>
          <Textarea
            value={form.description}
            onChange={(e) => {
              if (e.target.value.length <= 10000) setForm({ ...form, description: e.target.value });
            }}
            className="bg-secondary border-0 resize-none"
            rows={8}
            placeholder="活動内容・支援の使い道・目標などを詳しく記載してください"
          />
          <p className="text-xs text-muted-foreground text-right">{form.description.length} / 10,000文字</p>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <Label>プロジェクト画像（最大3枚）</Label>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <label key={i} className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50 overflow-hidden">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(i, e.target.files[0])} />
                {imageFiles[i] ? (
                  <img src={URL.createObjectURL(imageFiles[i])} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Image className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">画像{i + 1}</span>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-12 bg-primary hover:bg-primary/90 text-base gap-2">
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />送信中...</> : <><Heart className="w-5 h-5" />審査申請を送信する</>}
        </Button>
      </form>
    </div>
  );
}