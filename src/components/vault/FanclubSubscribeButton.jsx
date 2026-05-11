import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * FanclubSubscribeButton
 * Handles Stripe Checkout for fanclub tier subscriptions and Customer Portal access.
 *
 * Props:
 *   tier         - "standard" | "premium" | "diamond"
 *   channelId    - string
 *   isCurrentTier - bool (already subscribed to this tier)
 *   hasAnyTier   - bool (subscribed to some tier in this sanctum)
 *   disabled     - bool
 */
export default function FanclubSubscribeButton({ tier, channelId, isCurrentTier, hasAnyTier, disabled, label }) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createFanclubCheckout', {
        tier,
        channelId,
        successUrl: `${window.location.origin}/channel/${channelId}?tab=sanctum&subscribed=1`,
        cancelUrl: window.location.href,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || '決済の開始に失敗しました');
      }
    } catch (err) {
      toast.error('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke('createFanclubPortal', {
        returnUrl: window.location.href,
      });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error(res.data?.error || 'ポータルの開始に失敗しました');
      }
    } catch (err) {
      toast.error('エラーが発生しました: ' + err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (isCurrentTier) {
    return (
      <div className="space-y-2">
        <div className="w-full py-2 rounded-lg text-center text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30">
          ✓ 加入中
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground gap-1"
          onClick={handlePortal}
          disabled={portalLoading}
        >
          {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
          プラン変更・解約
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleSubscribe}
      disabled={disabled || loading}
      className="w-full gap-2 font-bold"
      size="sm"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ExternalLink className="w-4 h-4" />
      )}
      {loading ? '処理中...' : label || (hasAnyTier ? 'プランを変更する' : '加入する（Stripe）')}
    </Button>
  );
}