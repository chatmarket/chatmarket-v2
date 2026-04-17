import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getMeta, GLOBAL_META } from '@/lib/i18n';

/**
 * MetaHelmet コンポーネント
 * ページごとにメタデータを自動で設定
 * 
 * 使用方法:
 * <MetaHelmet page="home" lang="ja" />
 */
export default function MetaHelmet({ 
  page = 'home', 
  lang = 'ja',
  title,      // カスタムタイトル（オプション）
  description, // カスタム説明（オプション）
  image       // カスタム画像（オプション）
}) {
  const meta = getMeta(page, lang);
  const finalTitle = title || meta.title || GLOBAL_META.siteName;
  const finalDescription = description || meta.description || '';
  const finalImage = image || GLOBAL_META.image;
  
  return (
    <Helmet>
      {/* 基本メタタグ */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {meta.keywords && <meta name="keywords" content={meta.keywords} />}
      
      {/* HTML lang 属性 */}
      <html lang={lang} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={GLOBAL_META.siteName} />
      <meta property="og:url" content={`${GLOBAL_META.siteUrl}`} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
    </Helmet>
  );
}