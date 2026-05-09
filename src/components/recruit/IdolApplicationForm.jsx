import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function IdolApplicationForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    sns_accounts: {
      twitter: "",
      instagram: "",
      tiktok: "",
      youtube: "",
    },
    bio: "",
    experience: "",
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPhotoPreview(event.target?.result || "");
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("sns_")) {
      const platform = name.replace("sns_", "");
      setForm((prev) => ({
        ...prev,
        sns_accounts: { ...prev.sns_accounts, [platform]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone) {
      toast.error("必須項目を入力してください");
      return;
    }
    if (!photoFile) {
      toast.error("写真をアップロードしてください");
      return;
    }

    setLoading(true);
    try {
      // 写真アップロード
      const uploadRes = await base44.integrations.Core.UploadFile({ file: photoFile });
      const photoUrl = uploadRes.file_url;

      // 応募情報を保存
      await base44.entities.IdolApplication.create({
        ...form,
        photo_url: photoUrl,
        submitted_at: new Date().toISOString(),
        status: "pending",
      });

      setSubmitted(true);
      toast.success("応募ありがとうございます！確認メールをお送りします。");
      
      // 3秒後にフォームをリセット
      setTimeout(() => {
        setForm({
          full_name: "",
          email: "",
          phone: "",
          sns_accounts: { twitter: "", instagram: "", tiktok: "", youtube: "" },
          bio: "",
          experience: "",
        });
        setPhotoFile(null);
        setPhotoPreview("");
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      toast.error("送信に失敗しました: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h3 className="text-2xl font-bold text-white">応募ありがとうございます！</h3>
        <p className="text-muted-foreground max-w-md">
          ご応募いただいた情報を確認させていただきます。<br />
          審査結果をメールでお知らせします。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* 写真 */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">プロフィール写真 *</Label>
        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-primary/40 rounded-2xl cursor-pointer hover:border-primary/70 transition-colors bg-primary/5">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-sm text-muted-foreground">クリックして写真をアップロード</span>
            </div>
          )}
        </label>
      </div>

      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-bold">
            お名前 *
          </Label>
          <Input
            id="full_name"
            name="full_name"
            value={form.full_name}
            onChange={handleInputChange}
            placeholder="山田太郎"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-bold">
            メールアドレス *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleInputChange}
            placeholder="example@mail.com"
            required
          />
        </div>
      </div>

      {/* 電話番号 */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-bold">
          電話番号 *
        </Label>
        <Input
          id="phone"
          name="phone"
          value={form.phone}
          onChange={handleInputChange}
          placeholder="090-1234-5678"
          required
        />
      </div>

      {/* SNSアカウント */}
      <div className="space-y-3 bg-secondary/40 rounded-xl p-4 border border-border/50">
        <p className="text-sm font-bold text-muted-foreground">SNSアカウント</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "twitter", label: "X (Twitter)", placeholder: "@username" },
            { key: "instagram", label: "Instagram", placeholder: "@username" },
            { key: "tiktok", label: "TikTok", placeholder: "@username" },
            { key: "youtube", label: "YouTube", placeholder: "チャンネルURL" },
          ].map((sns) => (
            <Input
              key={sns.key}
              name={`sns_${sns.key}`}
              value={form.sns_accounts[sns.key]}
              onChange={handleInputChange}
              placeholder={sns.placeholder}
              className="text-xs"
            />
          ))}
        </div>
      </div>

      {/* 自己紹介 */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-bold">
          自己紹介・アピールポイント
        </Label>
        <Textarea
          id="bio"
          name="bio"
          value={form.bio}
          onChange={handleInputChange}
          placeholder="あなたの魅力や特徴をお教えください"
          className="h-24"
        />
      </div>

      {/* 活動経歴 */}
      <div className="space-y-2">
        <Label htmlFor="experience" className="text-sm font-bold">
          活動経歴・実績
        </Label>
        <Textarea
          id="experience"
          name="experience"
          value={form.experience}
          onChange={handleInputChange}
          placeholder="これまでの活動経歴や実績があればお教えください"
          className="h-24"
        />
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex gap-2 text-xs text-yellow-200">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          ご応募いただいた情報は、スカウト業務のみに使用させていただきます。
        </p>
      </div>

      {/* 送信ボタン */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 gap-2 h-12 font-bold"
      >
        <Send className="w-4 h-4" />
        {loading ? "応募中..." : "応募を送信"}
      </Button>
    </form>
  );
}