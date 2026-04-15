import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = {
  JP: {
    label: "日本語",
    content: `🎉 15分で始める新プラットフォーム「ChatMarket」

🔥限定キャンペーン：全有料プラン完全無料（初月）
- 1対1ビデオ通話：¥6,600/月 → ¥0
- ライブ配信（PPV）：¥9,900/月 → ¥0
- 動画アーカイブ販売：¥9,900/月 → ¥0
- BASIC（通話＆配信）：¥3,300/月 → ¥0

💰 報酬：最大95%還元（業界最高水準）
⏰ 無料期間：初月＋αはプログレッシブ還元で自動上昇

👉 今すぐ登録：[URL]

質問・体験希望はDMまで！`,
  },
  EN: {
    label: "English",
    content: `🎉 ChatMarket – The Creator Platform You've Been Waiting For

🔥 Limited Launch Offer: ALL Paid Plans FREE (1st Month)
- 1-on-1 Video Calls: $65/mo → Free
- Live PPV Broadcasting: $99/mo → Free
- Video Archive Sales: $99/mo → Free
- BASIC Plan (Calls + Streaming): $33/mo → Free

💰 Earn Up to 95% Revenue Share
⏰ Completely Free + Progressive Incentives

🌍 Starting 4/16 – Be an Early Adopter
Join 250+ creators. No payment method required.

👉 Sign Up: [URL]

Questions? DM me!`,
  },
  KR: {
    label: "한국어",
    content: `🎉 ChatMarket - 크리에이터를 위한 새로운 플랫폼

🔥 출시 특가: 모든 유료 플랜 1개월 무료
- 1대1 비디오 통화: ₩65,000/월 → 무료
- 라이브 PPV 배신: ₩99,000/월 → 무료
- 동영상 아카이브 판매: ₩99,000/월 → 무료
- BASIC 플랜: ₩33,000/월 → 무료

💰 최대 95% 수익 분배 (업계 최고)
⏰ 완전히 무료 + 프로그레시브 보상

🚀 2026년 4월 16일 출시
250+ 크리에이터 얼리어답터 모집

👉 가입하기: [URL]

질문은 DM으로 연락주세요!`,
  },
};

export default function TemplateModal({ open, onOpenChange, influencer, inviteCode }) {
  const [selectedLang, setSelectedLang] = useState(
    influencer?.country === "JP"
      ? "JP"
      : influencer?.country === "KR"
      ? "KR"
      : "EN"
  );

  const template = TEMPLATES[selectedLang];
  const finalText = template.content.replace("[URL]", inviteCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(finalText);
    toast.success("クリップボードにコピーしました！");
  };

  const handleOpenDM = () => {
    if (influencer?.contact?.startsWith("http")) {
      window.open(influencer.contact, "_blank");
    } else {
      toast.error("有効なDMリンクが設定されていません");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{influencer?.name} への送信</DialogTitle>
          <DialogDescription>
            言語を選択して、テンプレートをカスタマイズ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 言語選択 */}
          <div className="flex gap-2">
            {Object.entries(TEMPLATES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setSelectedLang(key)}
                className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                  selectedLang === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* テンプレート表示 */}
          <div className="bg-secondary rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed font-mono max-h-96 overflow-y-auto">
            {finalText}
          </div>

          {/* 招待コード表示 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
            <p className="font-bold mb-1">招待コード（トラッキング用）</p>
            <p className="font-mono break-all">{inviteCode}</p>
          </div>

          {/* アクション */}
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1 gap-2 bg-primary">
              <Copy className="w-4 h-4" />
              コピー
            </Button>
            <Button
              onClick={handleOpenDM}
              variant="outline"
              className="flex-1 gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              DMを開く
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 コピー後、相手のDM/メール/SNSに貼り付けてください
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}