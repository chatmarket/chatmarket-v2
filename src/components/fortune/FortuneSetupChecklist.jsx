import React, { useMemo } from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const ITEMS = [
  { key: "avatar",  label: "プロフィール写真を設定",               check: (ch) => !!ch?.avatar_url },
  { key: "arts",    label: "占術を選択",                           check: (ch) => !!ch?.fortune_arts },
  { key: "genres",  label: "得意な相談内容を選択",                 check: (ch) => !!ch?.fortune_genres },
  { key: "style",   label: "対応方法を選択（チャット / ビデオ）",  check: (ch) => (ch?.fortune_session_types || []).length > 0 },
  { key: "menu",    label: "チャット鑑定メニューを1つ作成",        check: (_ch, menuCount) => menuCount > 0 },
  { key: "reply",   label: "返信目安を設定済みのメニューがある",   check: (_ch, _c, menus) => (menus || []).some(m => m.estimated_reply_hours > 0) },
  { key: "url",     label: "自分のページURLを確認",                check: (ch) => !!ch?.id },
];

export default function FortuneSetupChecklist({ channel, menus = [] }) {
  const checks = useMemo(() =>
    ITEMS.map(item => ({ ...item, done: item.check(channel, menus.length, menus) })),
    [channel, menus]
  );

  const doneCount = checks.filter(c => c.done).length;
  const remaining = checks.length - doneCount;
  const percent = Math.round((doneCount / checks.length) * 100);

  return (
    <div className="bg-purple-900/15 border border-purple-500/30 rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-sm text-purple-200">占い師ページ公開までのチェックリスト</p>
          {remaining > 0 ? (
            <p className="text-xs text-purple-400 mt-0.5">あと{remaining}つで鑑定ページの準備が整います</p>
          ) : (
            <p className="text-xs text-green-400 mt-0.5">✨ 鑑定ページの準備が整いました！</p>
          )}
        </div>
        <p className="text-xl font-black text-purple-300 shrink-0">{percent}%</p>
      </div>

      <div className="w-full bg-purple-900/40 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-400 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="space-y-2">
        {checks.map(item => (
          <div key={item.key} className="flex items-center gap-2.5">
            {item.done
              ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              : <Circle className="w-4 h-4 text-purple-600 shrink-0" />}
            <span className={`text-xs ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="pt-1 border-t border-purple-500/20">
          <Link to="/channel-profile-edit" className="flex items-center justify-between text-xs text-purple-300 hover:text-purple-200 transition-colors font-bold">
            <span>プロフィールを設定する</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}