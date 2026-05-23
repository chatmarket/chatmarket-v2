import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Upload, Phone, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

const ORG_TYPES = [
  { value: "npo", label: "NPO法人 / 一般社団法人 / 公益法人" },
  { value: "public", label: "市民活動・ボランティア団体（任意団体）" },
  { value: "company", label: "一般企業・その他" },
];

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold flex items-center gap-1">
        {label}
        {required && <span className="text-destructive text-xs">*必須</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-border/40 mb-6">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="font-black text-base">{title}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CrowdfundingApply() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  const [form, setForm] = useState({
    organization_type: "",
    organization_name: "",
    corporate_number: "",
    representative_name: "",
    contact_name: "",
    contact_phone: "",
    address_postal: "",
    address: "",
    address_building: "",
    hp_url: "",
    title: "",
    description: "",
    goal_amount: "",
    certificate_url: "",

  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleFileUpload = async (e, field, setLoading) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field, file_url);
    setLoading(false);
    toast.success("ファイルをアップロードしました");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ["organization_type", "organization_name", "representative_name", "contact_name", "contact_phone", "address", "title"];
    for (const k of required) {
      if (!form[k]) { toast.error("必須項目をすべて入力してください"); return; }
    }
    setSubmitting(true);
    await base44.entities.CrowdfundingProject.create({
      ...form,
      goal_amount: Number(form.goal_amount) || 0,
      status: "pending",
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black">申請を受け付けました</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ご入力いただいた担当者電話番号へ、<strong className="text-foreground">平日10〜18時の間に確認のお電話</strong>をさしあげます。<br /><br />
          審査完了（通常3〜5営業日）後、ご登録のメールアドレスへ結果をお知らせします。
        </p>
        <Button onClick={() => navigate("/crowdfunding")} className="w-full">
          掲載プロジェクト一覧へ
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-primary/30 bg-primary/10 text-primary mb-2">
          <FileText className="w-3.5 h-3.5" />
          クラウドファンディング 審査申請フォーム
        </div>
        <h1 className="text-2xl font-black">掲載審査のお申し込み</h1>
        <p className="text-sm text-muted-foreground">
          すべての情報を正確にご入力ください。審査後、<br />
          <strong className="text-foreground">担当者より電話確認のご連絡</strong>をさしあげます。
        </p>
      </div>

      {/* 注意事項 */}
      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-200">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>虚偽申告が判明した場合は即時掲載停止・法的措置の対象となる場合があります。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── セクション1: 団体情報 ── */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
          <SectionTitle icon={FileText} title="団体基本情報" sub="法的に登録された正式名称をご記入ください" />

          <Field label="団体種別" required>
            <select
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.organization_type}
              onChange={e => set("organization_type", e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="団体正式名称" required hint="登記・届出の正式名称をご記入ください">
            <Input value={form.organization_name} onChange={e => set("organization_name", e.target.value)} placeholder="例：特定非営利活動法人〇〇の会" required />
          </Field>

          <Field label="法人番号" hint="国税庁が付番した13桁の法人番号（法人の場合）">
            <Input value={form.corporate_number} onChange={e => set("corporate_number", e.target.value)} placeholder="例：1234567890123" maxLength={13} />
          </Field>

          <Field label="代表者氏名" required>
            <Input value={form.representative_name} onChange={e => set("representative_name", e.target.value)} placeholder="例：山田 太郎" required />
          </Field>

          <Field label="公式HPのURL">
            <Input value={form.hp_url} onChange={e => set("hp_url", e.target.value)} placeholder="https://example.org" type="url" />
          </Field>
        </div>

        {/* ── セクション2: 担当者・連絡先 ── */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
          <SectionTitle icon={Phone} title="担当者・連絡先情報" sub="審査後、担当者へ確認のお電話をさしあげます（平日10〜18時）" />

          <Field label="担当者氏名" required hint="審査の電話連絡の窓口となる担当者のお名前">
            <Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="例：鈴木 花子" required />
          </Field>

          <Field label="担当者電話番号" required hint="⚠️ 審査後、こちらの番号へ確認のお電話をさしあげます。必ず日中に繋がる番号をご記入ください。">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={form.contact_phone}
                onChange={e => set("contact_phone", e.target.value)}
                placeholder="例：03-1234-5678"
                required
              />
            </div>
            <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" />
              審査担当者より後日、ご入力の電話番号へ確認のお電話をさしあげます。
            </p>
          </Field>
        </div>

        {/* ── セクション3: 住所 ── */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
          <SectionTitle icon={FileText} title="所在地" sub="団体の登記・活動拠点の住所" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="郵便番号">
              <Input value={form.address_postal} onChange={e => set("address_postal", e.target.value)} placeholder="例：123-4567" maxLength={8} />
            </Field>
          </div>

          <Field label="住所（都道府県・市区町村・番地）" required>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="例：東京都千代田区〇〇1-2-3" required />
          </Field>

          <Field label="建物名・部屋番号">
            <Input value={form.address_building} onChange={e => set("address_building", e.target.value)} placeholder="例：〇〇ビル5F" />
          </Field>
        </div>

        {/* ── セクション4: 書類アップロード ── */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
          <SectionTitle icon={Shield} title="証明書類のアップロード" sub="PDF・JPEG・PNG形式。審査に利用します。" />

          <Field label="登記証明書・認証状・法人証明書類" hint="NPO法人：都道府県知事認証状 / 一般社団法人：登記事項証明書">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border/60 hover:border-primary/50 cursor-pointer bg-secondary/50 text-sm font-medium transition-colors w-full">
                <Upload className="w-4 h-4 text-muted-foreground" />
                {uploadingCert ? "アップロード中..." : form.certificate_url ? "✅ アップロード済み" : "ファイルを選択"}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => handleFileUpload(e, "certificate_url", setUploadingCert)} />
              </label>
            </div>
          </Field>


        </div>

        {/* ── セクション5: プロジェクト内容 ── */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
          <SectionTitle icon={FileText} title="プロジェクト情報" sub="掲載ページに表示される内容です" />

          <Field label="プロジェクトタイトル" required>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="例：〇〇市の子ども食堂を全地区に広げたい" required />
          </Field>

          <Field label="プロジェクト説明" hint="活動内容・資金の使途・目指すビジョンを詳しく記載してください">
            <Textarea
              className="h-36"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="活動の背景、現状の課題、集まった資金の使い道などを具体的にご記入ください..."
            />
          </Field>

          <Field label="目標金額（円）" hint="0の場合は目標額なしとなります">
            <Input
              type="number"
              min={0}
              value={form.goal_amount}
              onChange={e => set("goal_amount", e.target.value)}
              placeholder="例：1000000"
            />
          </Field>
        </div>

        {/* 送信 */}
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground p-4 bg-secondary/50 rounded-xl">
            <Shield className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p>申請内容はすべて審査担当者が確認します。<strong className="text-foreground">審査後、ご入力の担当者電話番号へ確認のお電話をさしあげます</strong>（平日10〜18時）。ご不在の場合は折り返しご連絡ください。</p>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-black bg-primary hover:bg-primary/90"
          >
            {submitting ? "送信中..." : "審査申請を送信する"}
          </Button>
        </div>
      </form>
    </div>
  );
}