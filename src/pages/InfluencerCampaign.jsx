import React, { useState } from "react";
import { Zap, Users, Target, Globe } from "lucide-react";
import CSVUploader from "../components/influencer/CSVUploader";
import InfluencerListTable from "../components/influencer/InfluencerListTable";

export default function InfluencerCampaign() {
  const [influencers, setInfluencers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleDataLoaded = (data) => {
    setInfluencers(data);
    setIsLoaded(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pt-24 space-y-8">
      {/* ヘッダー */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-black">インフルエンサー爆撃キャンペーン</h1>
        </div>
        <p className="text-muted-foreground">
          CSVをアップロード → 多言語テンプレートで一括送信 → トラッキングコード付きURLで登録を追跡
        </p>
      </div>

      {/* 特徴 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <p className="font-bold text-sm">一括管理</p>
          </div>
          <p className="text-xs text-muted-foreground">CSVで最大1,000人のリストを管理</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <p className="font-bold text-sm">多言語</p>
          </div>
          <p className="text-xs text-muted-foreground">日本語・英語・韓国語のテンプレート</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <p className="font-bold text-sm">トラッキング</p>
          </div>
          <p className="text-xs text-muted-foreground">招待コード付きURLで登録経路を追跡</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="space-y-6">
        <CSVUploader onDataLoaded={handleDataLoaded} />

        {isLoaded && influencers.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
            <InfluencerListTable influencers={influencers} />
          </div>
        )}

        {isLoaded && influencers.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border border-border/50">
            <p className="text-muted-foreground">データが見つかりません</p>
          </div>
        )}
      </div>

      {/* ガイド */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-4">
        <p className="font-bold text-blue-400">📋 CSVフォーマット</p>
        <pre className="bg-black/20 p-3 rounded text-xs text-muted-foreground overflow-x-auto">
{`Name,Country,SNS_URL,Contact
田中太郎,JP,https://youtube.com/@tanaka,https://instagram.com/dm/tanaka
Katie Fang,US,https://tiktok.com/@katiefang,katiefang@gmail.com
박미경,KR,https://youtube.com/@parkmikyung,https://kakao.com/message`}
        </pre>
        <ul className="text-xs text-blue-300 space-y-1 list-disc list-inside">
          <li><strong>Country</strong>: JP（日本）/ US, UK, EN（英語圏）/ KR（韓国）</li>
          <li><strong>Contact</strong>: DMリンク or メールアドレス</li>
          <li><strong>SNS_URL</strong>: YouTubeやTikTokのプロフィールURL</li>
        </ul>
      </div>
    </div>
  );
}