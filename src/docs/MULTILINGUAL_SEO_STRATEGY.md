# ChatMarket 多言語SEO実装戦略

## 概要
日本語（デフォルト）と英語を統一メタデータで管理し、Googleに適切な言語バージョンを認識させるための包括的な実装戦略。

---

## 1. URL構造（サブディレクトリ形式）

```
https://chatmarket.info/              ← 日本語デフォルト（hreflang: ja）
https://chatmarket.info/en/           ← 英語版（hreflang: en）
https://chatmarket.info/en/watch/123  ← 英語版の動的ページ
```

**メリット**:
- SEO効果が分散しない（言語別にドメインを分けない）
- クローラーが言語切り替えを認識しやすい
- Analytics でトラフィック追跡が容易

---

## 2. メタデータ管理戦略

### 2.1 言語別メタデータ定義（`lib/i18n.js` 拡張）

```javascript
// 言語別メタデータ
export const META_TRANSLATIONS = {
  ja: {
    title: "ChatMarket | 有料ライブ配信・動画販売・1対1ビデオ通話プラットフォーム",
    description: "ChatMarketは有料ライブ配信・動画販売・1対1有料ビデオ通話をこのプラットフォーム一つで...",
    keywords: "ライブ配信,動画販売,ビデオ通話,有料配信,クリエイター,収益化",
  },
  en: {
    title: "ChatMarket | Live Streaming, Video Sales & Video Calls Platform for Creators",
    description: "ChatMarket is the all-in-one platform for creators to monetize through live streaming, video sales, and 1-on-1 video calls.",
    keywords: "live streaming,video monetization,creator platform,streaming earnings",
  },
};

// ページ別メタデータ（日本語・英語）
export const PAGE_META = {
  home: {
    ja: { title: "ChatMarket", description: "クリエイターのための収益化プラットフォーム" },
    en: { title: "ChatMarket - Creator Platform", description: "Monetize your content effortlessly" },
  },
  recruit: {
    ja: { title: "ライバー募集 | ChatMarket", description: "全プラン無料で精鋭300名募集中" },
    en: { title: "Creator Recruitment | ChatMarket", description: "Join 300 selected creators with free premium features" },
  },
};
```

---

## 3. React ルーティング構造

### 3.1 App.jsx のルート拡張

```jsx
<Route path="/" element={<AppLayout lang="ja" />}>
  <Route path="/" element={<Home />} />
  <Route path="/watch/:id" element={<WatchVideo />} />
  {/* ...その他日本語ルート */}
</Route>

<Route path="/en" element={<AppLayout lang="en" />}>
  <Route path="" element={<Home />} />
  <Route path="watch/:id" element={<WatchVideo />} />
  {/* ...その他英語ルート */}
</Route>
```

---

## 4. hreflang タグの実装

### 4.1 動的hreflang生成（`components/layout/MultilingualHead.jsx`）

```jsx
export default function MultilingualHead({ pagePath, lang }) {
  const baseUrl = "https://chatmarket.info";
  
  return (
    <>
      {/* 現在の言語 */}
      <link rel="alternate" hreflang={lang} href={`${baseUrl}${lang === 'ja' ? '' : '/en'}${pagePath}`} />
      
      {/* 代替言語 */}
      {lang === 'ja' && (
        <link rel="alternate" hreflang="en" href={`${baseUrl}/en${pagePath}`} />
      )}
      {lang === 'en' && (
        <link rel="alternate" hreflang="ja" href={`${baseUrl}${pagePath}`} />
      )}
      
      {/* x-default（デフォルト言語） */}
      <link rel="alternate" hreflang="x-default" href={`${baseUrl}${pagePath}`} />
    </>
  );
}
```

### 4.2 sitemap.xml での hreflang

```xml
<url>
  <loc>https://chatmarket.info/</loc>
  <xhtml:link rel="alternate" hreflang="ja" href="https://chatmarket.info/" />
  <xhtml:link rel="alternate" hreflang="en" href="https://chatmarket.info/en/" />
  <xhtml:link rel="alternate" hreflang="x-default" href="https://chatmarket.info/" />
  <lastmod>2026-04-17</lastmod>
</url>
```

---

## 5. メタデータの動的切り替え

### 5.1 Helmet/react-helmet-async の活用

```jsx
import { Helmet } from 'react-helmet-async';
import { META_TRANSLATIONS, PAGE_META } from '@/lib/i18n';

export default function Page({ lang = 'ja' }) {
  const meta = PAGE_META.home[lang];
  const langMeta = META_TRANSLATIONS[lang];
  
  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={langMeta.keywords} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:locale" content={lang === 'ja' ? 'ja_JP' : 'en_US'} />
        <link rel="canonical" href={`https://chatmarket.info${lang === 'ja' ? '' : '/en'}${window.location.pathname}`} />
      </Helmet>
      
      <MultilingualHead pagePath={window.location.pathname.replace(/^\/en/, '')} lang={lang} />
    </>
  );
}
```

---

## 6. robots.txt と Sitemap での言語指定

### 6.1 robots.txt （言語別サイトマップ）

```
Sitemap: https://chatmarket.info/sitemap.xml
Sitemap: https://chatmarket.info/sitemap-ja.xml
Sitemap: https://chatmarket.info/sitemap-en.xml
```

### 6.2 サイトマップジェネレータの拡張

- `functions/generateSitemap` を拡張して、言語別サイトマップを生成
- 各URLに hreflang をブロック形式で含める

---

## 7. 実装フェーズ

### フェーズ1: メタデータ管理の統一（対応中）
- ✅ `lib/i18n.js` にメタデータ定義を追加
- ✅ `components/layout/MultilingualHead.jsx` 作成（hreflang管理）

### フェーズ2: ルーティング拡張
- App.jsx に `/en/*` ルート追加
- Language Context で言語状態を管理

### フェーズ3: Helmet 統合
- pages と components に `<Helmet>` タグを組み込み
- 言語別メタデータを動的に設定

### フェーズ4: Sitemap 拡張
- `functions/generateSitemap` をXML変更してhreflangs出力
- 言語別サイトマップ生成

### フェーズ5: Analytics & QA
- Google Search Console でカバレッジを確認
- 言語別トラフィック追跡の確認

---

## 8. Googleへの認識確認

1. **Search Console 登録**
   - https://chatmarket.info （日本語）
   - https://chatmarket.info/en/ （英語）
   - 両サイトを別別に登録、hreflang関係を明確に

2. **インスペクション実行**
   - "URL検査" で各言語ページをインスペクト
   - hreflang チェーンが正しく認識されているか確認

3. **カバレッジ確認**
   - 言語別ページが正しくインデックスされているか確認

---

## 9. 技術スタック

- **言語ライブラリ**: `lib/i18n.js` （既存、拡張予定）
- **メタタグ管理**: `react-helmet-async` （インストール必要）
- **ルーティング**: React Router v6 （既存）
- **Sitemap生成**: Deno 関数 （既存、拡張予定）

---

## 10. 注意点

- **Canonical タグ**: 言語版ごとに正しい canonical URL を指定（重要）
- **x-default**: ユーザーの言語設定が一致しない場合のデフォルト
- **Content-Language**: HTTP ヘッダーにも言語情報を含める（推奨）
- **遅延実装**: ページ数が多い場合、段階的に展開することを推奨