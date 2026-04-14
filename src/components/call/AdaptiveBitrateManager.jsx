import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

// ビットレート設定（遅延とのマッピング）
const BITRATE_CONFIG = {
  "1080p": { maxRTT: 30, label: "1080p（フルHD）" },
  "720p": { maxRTT: 60, label: "720p（HD）" },
  "480p": { maxRTT: 120, label: "480p（標準）" },
  "360p": { maxRTT: Infinity, label: "360p（省データ）" },
};

// ビットレート切り替え履歴（チラチラ防止用のヒステリシス）
const HYSTERESIS_THRESHOLD = 10; // 遅延が10ms以上改善したら上位にアップグレード
const HYSTERESIS_DOWNGRADE_THRESHOLD = 15; // 遅延が15ms以上悪化したらダウングレード

export default function AdaptiveBitrateManager({
  enabled = true,
  currentQuality,
  onQualityChange,
  measureInterval = 3000, // 3秒ごとに測定
}) {
  const lastRTTRef = useRef(null);
  const lastQualityRef = useRef(currentQuality);
  const monitoringRef = useRef(null);

  // RTT（往復遅延時間）を測定
  const measureRTT = useCallback(async () => {
    const startTime = performance.now();
    try {
      // サーバーへpingを送信（小さいデータ）
      const response = await fetch("/api/ping", {
        method: "POST",
        body: JSON.stringify({ timestamp: startTime }),
      }).catch(() => null);

      if (!response) return null;
      const endTime = performance.now();
      const rtt = Math.round(endTime - startTime);
      return rtt;
    } catch (err) {
      return null;
    }
  }, []);

  // RTTに基づいて最適な品質を決定
  const determineOptimalQuality = useCallback((rtt) => {
    const qualityOrder = ["1080p", "720p", "480p", "360p"];

    for (const quality of qualityOrder) {
      if (rtt <= BITRATE_CONFIG[quality].maxRTT) {
        return quality;
      }
    }
    return "360p";
  }, []);

  // 品質を切り替えるべきか判定（ヒステリシス適用）
  const shouldChangeQuality = useCallback(
    (newQuality, oldQuality, currentRTT, lastRTT) => {
      if (newQuality === oldQuality) return false;

      const qualityOrder = ["1080p", "720p", "480p", "360p"];
      const newIndex = qualityOrder.indexOf(newQuality);
      const oldIndex = qualityOrder.indexOf(oldQuality);

      // アップグレードの場合：遅延が充分改善したか確認
      if (newIndex < oldIndex) {
        return lastRTT - currentRTT >= HYSTERESIS_THRESHOLD;
      }

      // ダウングレードの場合：遅延が充分悪化したか確認
      if (newIndex > oldIndex) {
        return currentRTT - lastRTT >= HYSTERESIS_DOWNGRADE_THRESHOLD;
      }

      return false;
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      if (monitoringRef.current) clearInterval(monitoringRef.current);
      return;
    }

    monitoringRef.current = setInterval(async () => {
      const rtt = await measureRTT();
      if (rtt === null) return;

      lastRTTRef.current = rtt;
      const optimalQuality = determineOptimalQuality(rtt);

      if (
        shouldChangeQuality(
          optimalQuality,
          lastQualityRef.current,
          rtt,
          lastRTTRef.current
        )
      ) {
        lastQualityRef.current = optimalQuality;
        onQualityChange(optimalQuality);
        toast.info(`📡 ネットワーク最適化: ${BITRATE_CONFIG[optimalQuality].label} に自動切り替え（RTT: ${rtt}ms）`, {
          duration: 3000,
        });
      }
    }, measureInterval);

    return () => {
      if (monitoringRef.current) clearInterval(monitoringRef.current);
    };
  }, [enabled, measureRTT, determineOptimalQuality, shouldChangeQuality, onQualityChange, measureInterval]);

  return null; // UIを持たないコンポーネント
}