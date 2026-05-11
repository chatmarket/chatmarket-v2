/**
 * PwaDebugWidget — 社長用PWAテストスイッチ
 * Dashboardのクリエイターモード末尾に配置
 */
import React, { useState } from "react";
import { Smartphone, RefreshCw, Trash2, Globe, Database } from "lucide-react";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { base44 } from "@/api/base44Client";
import { getLang } from "@/lib/i18n";

export default function PwaDebugWidget() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkDbTranslations = async () => {
    setChecking(true);
    try {
      const lang = getLang();
      const rows = await base44.entities.AppTranslation.filter({ lang });
      setDbStatus({ lang, count: rows.length, sample: rows.slice(0, 3) });
    } catch (e) {
      setDbStatus({ error: e.message });
    } finally {
      setChecking(false);
    }
  };

  const clearPwaStorage = () => {
    localStorage.removeItem("cm_pwa_snooze");
    localStorage.removeItem("cm_notif_dismissed");
    alert("PWA/通知スヌーズをクリアしました。リロードすると再表示されます。");
  };

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(251,191,36,0.06)",
        border: "1px dashed rgba(251,191,36,0.4)",
      }}
    >
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-amber-400" />
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest">PWA デバッグ</p>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isStandalone ? "bg-green-500/20 text-green-400" : "bg-secondary text-muted-foreground"}`}>
          {isStandalone ? "📱 スタンドアローン" : "🌐 ブラウザ"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowPrompt(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(0,255,157,0.1)", border: "1px solid rgba(0,255,157,0.3)", color: "#00ff9d" }}
        >
          <Smartphone className="w-3.5 h-3.5" />
          インストール促進テスト
        </button>
        <button
          onClick={clearPwaStorage}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          スヌーズリセット
        </button>
        <button
          onClick={checkDbTranslations}
          disabled={checking}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 col-span-2"
          style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" }}
        >
          <Database className="w-3.5 h-3.5" />
          {checking ? "確認中..." : "DB翻訳チェック"}
        </button>
      </div>

      {dbStatus && (
        <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: "rgba(0,0,0,0.3)" }}>
          {dbStatus.error ? (
            <p className="text-red-400">エラー: {dbStatus.error}</p>
          ) : (
            <>
              <p className="text-blue-300 font-bold">言語: {dbStatus.lang} / {dbStatus.count} キー登録済み</p>
              {dbStatus.count === 0 && (
                <p className="text-amber-400">⚠ DBに翻訳データがありません。AppTranslation エンティティにデータを追加してください。</p>
              )}
              {dbStatus.sample.map((r) => (
                <p key={r.id} className="text-white/50 truncate">[{r.key}] = {r.value}</p>
              ))}
            </>
          )}
        </div>
      )}

      {/* フォースショーモード */}
      {showPrompt && (
        <PwaInstallPrompt forceShow={true} />
      )}
      {showPrompt && (
        <button
          onClick={() => setShowPrompt(false)}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
        >
          プロンプトを閉じる
        </button>
      )}
    </div>
  );
}