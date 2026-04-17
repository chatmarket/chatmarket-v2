import React from "react";
import { Film, TrendingUp, Moon, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function ArchiveAssetCard({ videos = [], purchases = [] }) {
  // アーカイブ動画の収益合計
  const archiveRevenue = purchases
    .filter(p => p.item_type === "video")
    .reduce((s, p) => s + (p.amount || 0) * 0.85, 0);

  const paidVideos = videos.filter(v => !v.is_free && v.price > 0);
  const freeVideos = videos.filter(v => v.is_free || !v.price);
  const totalViews = videos.reduce((s, v) => s + (v.view_count || 0), 0);

  // 月間平均収益（最大24ヶ月で均す）
  const monthlyAvg = videos.length > 0 ? Math.round(archiveRevenue / Math.max(1, videos.length)) : 0;

  return (
    <div className="rounded-2xl border border-amber-500/30 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))" }}>

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-amber-400" />
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">アーカイブ不労所得</p>
        </div>
        <Link to="/upload" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> 動画を追加
        </Link>
      </div>

      {/* メインメッセージ */}
      <div className="rounded-xl p-4 space-y-1"
        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
        <p className="text-sm font-black text-amber-300">💤 寝ている間もあなたのスキルが稼いでくれます</p>
        <p className="text-xs text-amber-200/70 leading-relaxed">
          1対1の通話で培ったノウハウを動画として積み上げ、「企業に依存しない不労所得基盤」を作りましょう。
          これが真の自立です。
        </p>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background/50 rounded-xl p-3 text-center space-y-1">
          <Film className="w-4 h-4 text-amber-400 mx-auto" />
          <p className="text-xl font-black text-amber-400">{paidVideos.length}</p>
          <p className="text-[10px] text-muted-foreground">有料動画</p>
        </div>
        <div className="bg-background/50 rounded-xl p-3 text-center space-y-1">
          <TrendingUp className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xl font-black text-primary">{totalViews.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">累計再生数</p>
        </div>
        <div className="bg-background/50 rounded-xl p-3 text-center space-y-1">
          <span className="text-lg">💰</span>
          <p className="text-xl font-black text-amber-400">¥{archiveRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">動画収益累計</p>
        </div>
      </div>

      {/* 動画がない場合の促進メッセージ */}
      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/40 p-4 text-center space-y-2">
          <p className="text-sm font-bold text-amber-400">📹 まだアーカイブ動画がありません</p>
          <p className="text-xs text-muted-foreground">次の配信後、録画をアーカイブとして販売しましょう。一度作れば永久に稼ぎ続けます。</p>
          <Link to="/upload">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline">
              最初の動画をアップロード <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      ) : paidVideos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/30 p-3 text-center">
          <p className="text-xs text-amber-300/80">💡 {freeVideos.length}本の無料動画があります。有料設定に変えるだけで収益化できます。</p>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground text-center">
          月平均 <span className="text-amber-400 font-bold">¥{monthlyAvg.toLocaleString()}</span> の動画収益（動画1本あたり）
        </div>
      )}
    </div>
  );
}