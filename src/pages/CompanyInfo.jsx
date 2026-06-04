import React from "react";
import { Link } from "react-router-dom";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { Building2, User, Calendar, Banknote, Landmark, Hash, Briefcase, MapPin, Phone, ArrowLeft } from "lucide-react";

const INFO_ITEMS = [
  { icon: Building2, label: "商号", value: "株式会社 ONE STEP" },
  { icon: User, label: "代表取締役", value: "小野　貴志" },
  { icon: Calendar, label: "設立", value: "2025年4月15日" },
  { icon: Banknote, label: "資本金", value: "990万円" },
  { icon: Landmark, label: "主要取引銀行", value: "武蔵野銀行　南浦和支店" },
  { icon: Hash, label: "法人番号", value: "9030001166052" },
  { icon: Briefcase, label: "業務内容", value: "ITプラットホーム開発運営、写真撮影業務全般" },
  { icon: MapPin, label: "所在地", value: "〒101-0024\n東京都千代田区神田和泉町1番地6-16\nヤマトビル405" },
  { icon: Phone, label: "TEL", value: "03-6821-6715" },
];

export default function CompanyInfo() {
  return (
    <div className="min-h-screen bg-background">
      <MetaHelmet page="company" />
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16 space-y-8">
        {/* 戻るリンク */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          トップへ戻る
        </Link>

        {/* ヘッダー */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">企業情報</h1>
          <div className="w-12 h-1 rounded-full bg-primary" />
        </div>

        {/* 情報テーブル */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {INFO_ITEMS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-4 px-5 py-4 sm:px-6 sm:py-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-medium text-foreground whitespace-pre-line leading-relaxed">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          © {new Date().getFullYear()} 株式会社 ONE STEP. All rights reserved.
        </p>
      </div>
    </div>
  );
}