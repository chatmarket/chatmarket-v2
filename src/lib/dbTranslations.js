/**
 * DB-driven 多言語翻訳ユーティリティ
 *
 * AppTranslation エンティティを優先的に使い、
 * DBにキーがなければ lib/i18n.js のハードコードにフォールバック。
 *
 * 使い方:
 *   import { useTranslations } from "@/lib/dbTranslations";
 *   const { t } = useTranslations();
 *   t("pwa_install_title")  // → DBの値、なければi18n.jsの値
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getLang, translations } from "@/lib/i18n";

// シングルトンキャッシュ（ページリロードまで保持）
let _cache = null; // { lang, data: Record<string, string> }

/**
 * DB から指定言語の全翻訳を一括フェッチしてキャッシュ
 */
async function fetchDbTranslations(lang) {
  if (_cache?.lang === lang) return _cache.data;
  try {
    const rows = await base44.entities.AppTranslation.filter({ lang });
    const data = {};
    rows.forEach((r) => { data[r.key] = r.value; });
    _cache = { lang, data };
    return data;
  } catch {
    return {};
  }
}

/**
 * React Hook: DB翻訳を取得し t() 関数を返す
 * loading 中はハードコード翻訳を使う（ちらつきなし）
 */
export function useTranslations() {
  const lang = getLang();
  const [dbData, setDbData] = useState(_cache?.lang === lang ? _cache.data : {});
  const [loading, setLoading] = useState(_cache?.lang !== lang);

  useEffect(() => {
    if (_cache?.lang === lang) {
      setDbData(_cache.data);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchDbTranslations(lang).then((data) => {
      if (!cancelled) {
        setDbData(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [lang]);

  const t = (key) => {
    // DB優先 → ハードコードフォールバック
    if (dbData[key]) return dbData[key];
    return translations[lang]?.[key] || translations["ja"]?.[key] || key;
  };

  return { t, loading, lang };
}

/**
 * 非Hookバージョン（コンポーネント外で使う場合）
 * ※ DBへのアクセスは非同期なので初回は i18n.js フォールバック
 */
export function tDb(key) {
  const lang = getLang();
  const cached = _cache?.lang === lang ? _cache.data : {};
  if (cached[key]) return cached[key];
  return translations[lang]?.[key] || translations["ja"]?.[key] || key;
}

/**
 * DB翻訳プリロード（AppLayout などで呼び出すと初回ちらつき防止）
 */
export async function preloadTranslations() {
  const lang = getLang();
  await fetchDbTranslations(lang);
}