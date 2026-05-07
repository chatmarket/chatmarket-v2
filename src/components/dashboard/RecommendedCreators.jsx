import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Radio, Phone, Video } from "lucide-react";

const CATEGORY_LABELS = {
  fortune: { label: "占い", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  chat:    { label: "雑談", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  other:   { label: "その他", color: "text-muted-foreground bg-secondary border-border/50" },
};

const AVATAR_GRADIENTS = [
  "from-pink-500 to-rose-500",
  "from-violet-500 to-purple-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-red-500 to-pink-500",
];

export default function RecommendedCreators() {
  const { data: channels = [] } = useQuery({
    queryKey: ["recommended-creators"],
    queryFn: () => base44.entities.Channel.list("-subscriber_count", 20),
    staleTime: 5 * 60 * 1000,
  });

  // 登録者数 or ライブ中でソート、最大6件
  const sorted = [...channels]
    .sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      return (b.subscriber_count || 0) - (a.subscriber_count || 0);
    })
    .slice(0, 6);

  if (sorted.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          おすすめのクリエイター
        </h2>
        <Link to="/search" className="text-xs text-primary hover:underline">すべて</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sorted.map((ch, i) => {
          const catInfo = CATEGORY_LABELS[ch.stream_category] || CATEGORY_LABELS.other;
          const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];

          return (
            <Link key={ch.id} to={`/channel/${ch.id}`}>
              <div className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-all h-full">
                {/* アバター */}
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                  {ch.avatar_url ? (
                    <img src={ch.avatar_url} alt={ch.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <span className="text-white font-black text-lg">{ch.name?.[0] || "?"}</span>
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold line-clamp-1">{ch.name}</p>

                  {/* カテゴリタグ + ライブバッジ */}
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {ch.is_live && (
                      <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-white inline-block" />
                        LIVE
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catInfo.color}`}>
                      {catInfo.label}
                    </span>
                    {/* 機能バッジ */}
                    {ch.is_live && <Radio className="w-3 h-3 text-red-400" />}
                    {ch.call_enabled && <Phone className="w-3 h-3 text-blue-400" />}
                  </div>

                  {/* フォロワー数 */}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(ch.subscriber_count || 0).toLocaleString()} フォロワー
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}