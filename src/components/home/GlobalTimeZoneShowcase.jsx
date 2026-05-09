import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Globe, Clock, Coffee, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";

// タイムゾーン定義
const TIMEZONES = [
  { code: "US", country: "アメリカ", emoji: "🇺🇸", tz: "America/New_York", activity: "朝", icon: Coffee, message: "コーヒータイムで連絡します" },
  { code: "GB", country: "イギリス", emoji: "🇬🇧", tz: "Europe/London", activity: "昼", icon: Sun, message: "ランチタイムの相談" },
  { code: "JP", country: "日本", emoji: "🇯🇵", tz: "Asia/Tokyo", activity: "夜", icon: Moon, message: "深夜の熱い相談" },
  { code: "AU", country: "オーストラリア", emoji: "🇦🇺", tz: "Australia/Sydney", activity: "深夜", icon: Moon, message: "夜中の想像的セッション" },
  { code: "SG", country: "シンガポール", emoji: "🇸🇬", tz: "Asia/Singapore", activity: "夜", icon: Moon, message: "トロピカルな雰囲気で" },
];

// 現在時刻から「アクティビティレベル」を判定（6-10時=朝 10-17時=昼 17-21時=夕方 21-6時=夜）
function getActivityLevel(hour) {
  if (hour >= 6 && hour < 10) return { label: "朝", icon: Coffee, color: "#FCD34D", desc: "目覚めたばかり" };
  if (hour >= 10 && hour < 17) return { label: "昼", icon: Sun, color: "#FCA5A5", desc: "活動的" };
  if (hour >= 17 && hour < 21) return { label: "夕方", icon: Sun, color: "#FB923C", desc: "クールダウン" };
  return { label: "夜", icon: Moon, color: "#818CF8", desc: "落ち着いた雰囲気" };
}

// 各タイムゾーンの現在時刻を計算
function getLocalTime(tzName) {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: tzName }));
  const offset = tzDate - utcDate;
  const localDate = new Date(date.getTime() + offset);
  return localDate.getHours();
}

export default function GlobalTimeZoneShowcase() {
  // 各タイムゾーンのチャンネルを取得（キャッシュ短め）
  const { data: allChannels = [] } = useQuery({
    queryKey: ["global-channels-showcase"],
    queryFn: () => base44.entities.Channel.list("-subscriber_count", 50),
    staleTime: 300000, // 5分キャッシュ
  });

  // タイムゾーン別にチャンネルをグループ化
  const timezoneChannels = useMemo(() => {
    return TIMEZONES.map((tz) => {
      const localHour = getLocalTime(tz.tz);
      const activity = getActivityLevel(localHour);
      const channels = allChannels
        .filter((ch) => ch.resident_country === tz.code)
        .slice(0, 3);

      return { ...tz, activity, localHour, channels };
    });
  }, [allChannels]);

  return (
    <section className="px-4 sm:px-6 mb-12 space-y-6">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-black text-foreground">今、この国と繋がる</h2>
        </div>
        <p className="text-xs text-muted-foreground">世界中のライバー・専門家と時差を逆手に「ライブに近い」雰囲気で相談できます</p>
      </motion.div>

      {/* タイムゾーンカード（スクロール） */}
      <div className="overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex gap-3 min-w-min">
          {timezoneChannels.map((tz, i) => {
            const ActivityIcon = tz.activity.icon;
            return (
              <motion.div
                key={tz.code}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 w-72 rounded-2xl border border-border/30 p-4 space-y-3 hover:border-primary/50 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${tz.activity.color}15, ${tz.activity.color}05)`,
                }}
              >
                {/* ヘッダー */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-black">{tz.emoji} {tz.country}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {String(tz.localHour).padStart(2, "0")}:00
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${tz.activity.color}20`, color: tz.activity.color }}>
                    <ActivityIcon className="w-3 h-3" />
                    {tz.activity.label}
                  </div>
                </div>

                {/* アクティビティメッセージ */}
                <p className="text-xs text-foreground/70 leading-relaxed">
                  {tz.message}
                </p>

                {/* チャンネル表示 */}
                {tz.channels.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {tz.channels.map((ch) => (
                      <Link
                        key={ch.id}
                        to={`/call-profile/${ch.id}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-xs"
                      >
                        {ch.avatar_url ? (
                          <img src={ch.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                            {ch.name?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground/80 truncate font-semibold">{ch.name}</p>
                          {ch.call_theme && (
                            <p className="text-muted-foreground text-[10px] truncate">{ch.call_theme}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/60 py-2">
                    この地域のライバーはまだ待機していません
                  </p>
                )}

                {/* CTA */}
                <Link
                  to={`/search?country=${tz.code}`}
                  className="block w-full py-2 rounded-lg text-xs font-bold text-center transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: tz.activity.color,
                    color: "#000",
                  }}
                >
                  {tz.country}のアドバイザーを見つける →
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* グローバルアクティビティ概要 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-center space-y-2"
      >
        <p className="text-xs font-bold text-blue-400">🌍 グローバルネットワーク</p>
        <p className="text-sm text-foreground/70">
          全世界に{allChannels.length}人以上のアドバイザー。時差を味方に、24時間どこかでLIVEが続いています。
        </p>
      </motion.div>
    </section>
  );
}