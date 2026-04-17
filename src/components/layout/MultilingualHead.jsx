import React from 'react';
import { useLocation } from 'react-router-dom';
import { GLOBAL_META, LANG_LOCALE, getCanonicalUrl } from '@/lib/i18n';

/**
 * MultilingualHead コンポーネント
 * hreflang タグと言語別メタデータを管理
 * 
 * 使用方法:
 * <MultilingualHead page="home" lang="ja" />
 * 
 * page: ページキー（home, recruit, watch, privacy, terms等）
 * lang: 言語コード（ja, en）
 */
export default function MultilingualHead({ page, lang = 'ja' }) {
  const location = useLocation();
  const baseUrl = GLOBAL_META.siteUrl;
  
  // pathname からクエリとハッシュを削除
  const pathname = location.pathname.replace(/\/en\/?/, '/').replace(/\/$/, '') || '/';
  
  // 言語別URL構築
  const jaUrl = `${baseUrl}${pathname === '/' ? '' : pathname}`;
  const enUrl = `${baseUrl}/en${pathname === '/' ? '' : pathname}`;
  const canonicalUrl = getCanonicalUrl(pathname, lang);
  
  // locale コード取得
  const localeCode = LANG_LOCALE[lang] || 'ja_JP';
  
  return (
    <>
      {/* ========== hreflang タグ ========== */}
      
      {/* 現在の言語（self） */}
      <link
        rel="alternate"
        hreflang={lang}
        href={lang === 'ja' ? jaUrl : enUrl}
      />
      
      {/* 代替言語 */}
      {lang === 'ja' && (
        <link
          rel="alternate"
          hreflang="en"
          href={enUrl}
        />
      )}
      {lang === 'en' && (
        <link
          rel="alternate"
          hreflang="ja"
          href={jaUrl}
        />
      )}
      
      {/* x-default（デフォルト言語） */}
      <link
        rel="alternate"
        hreflang="x-default"
        href={jaUrl}
      />
      
      {/* ========== Canonical タグ ========== */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* ========== Language メタタグ ========== */}
      <meta httpEquiv="content-language" content={lang} />
      
      {/* og:locale（言語別OGタグ） */}
      <meta property="og:locale" content={localeCode} />
      {lang === 'ja' && (
        <meta property="og:locale:alternate" content="en_US" />
      )}
      {lang === 'en' && (
        <meta property="og:locale:alternate" content="ja_JP" />
      )}
      
      {/* ========== Twitter language ========== */}
      <meta name="twitter:site" content={GLOBAL_META.twitterHandle} />
    </>
  );
}