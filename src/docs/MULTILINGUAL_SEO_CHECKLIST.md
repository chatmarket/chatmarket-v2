# 多言語SEO実装チェックリスト

## 実装完了項目

### ✅ フェーズ1: メタデータ管理の統一
- [x] `lib/i18n.js` を拡張（PAGE_META, GLOBAL_META, ヘルパー関数）
- [x] `components/layout/MultilingualHead.jsx` 作成（hreflang管理）
- [x] `components/layout/MetaHelmet.jsx` 作成（メタデータ自動適用）
- [x] `functions/generateSitemap` を拡張（hreflang ブロック形式出力）
- [x] `index.html` を英語SEO対応版に修正
- [x] `public/robots.txt` 作成（マルチリンガル対応）
- [x] `public/.htaccess` 作成（キャッシュ&セキュリティ設定）

---

## 実装予定項目（次ステップ）

### フェーズ2: ルーティング拡張（App.jsx）

**タスク**: `/en/*` ルートを追加し、言語別レイアウト構造を実装

```jsx
// App.jsx への追加例
<Route path="/" element={<AppLayout lang="ja" />}>
  <Route path="/" element={<Home />} />
  <Route path="watch/:id" element={<WatchVideo />} />
  {/* 日本語ルート */}
</Route>

<Route path="/en" element={<AppLayout lang="en" />}>
  <Route path="" element={<Home />} />
  <Route path="watch/:id" element={<WatchVideo />} />
  {/* 英語ルート */}
</Route>
```

**依存関係**: AppLayout コンポーネントに `lang` props を追加

---

### フェーズ3: Helmet 統合（各ページ）

**タスク**: ページファイルに MetaHelmet を組み込む

```jsx
// pages/Home.jsx の例
import MetaHelmet from '@/components/layout/MetaHelmet';
import MultilingualHead from '@/components/layout/MultilingualHead';

export default function Home() {
  const lang = getLang(); // lib/i18n.js から import
  
  return (
    <>
      <MetaHelmet page="home" lang={lang} />
      <MultilingualHead page="home" lang={lang} />
      {/* ページコンテンツ */}
    </>
  );
}
```

**影響範囲**: 主要ページ（Home, Recruit, Watch, Privacy, Terms等）

---

### フェーズ4: Language Switcher 実装

**タスク**: ユーザーが言語を切り替えるUI を実装

```jsx
// components/layout/LangSwitcher.jsx 拡張
<select 
  value={getLang()} 
  onChange={(e) => {
    setLang(e.target.value);
    // URL も言語版に変更
    window.location.href = `${e.target.value === 'en' ? '/en' : ''}${window.location.pathname}`;
  }}
>
  <option value="ja">日本語</option>
  <option value="en">English</option>
</select>
```

---

### フェーズ5: Google Search Console 設定

**タスク**: Google Search Console で多言語設定を検証

1. **サイト追加**
   - https://chatmarket.info （日本語）
   - https://chatmarket.info/en/ （英語）

2. **hreflang インスペクション**
   - 各ページの "URL検査" で hreflang チェーンを確認
   - エラーがないことを確認

3. **Sitemap 登録**
   - https://chatmarket.info/sitemap.xml を登録

4. **インターナショナル設定**
   - Search Console > 設定 > インターナショナル設定
   - 言語別ターゲティングを確認

---

## 実装フロー図

```
┌─────────────────────────────────────────┐
│  ユーザー訪問                              │
│  https://chatmarket.info/watch/123      │
│  または                                   │
│  https://chatmarket.info/en/watch/123   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  getLang() で言語判定  │
        │  URL から /en 判定    │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │  MetaHelmet 適用      │
        │  (タイトル・説明切替) │
        │  MultilingualHead     │
        │  (hreflang出力)       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  AppLayout lang=ja   │
        │  または lang=en      │
        │  (言語別UI)          │
        └──────────────────────┘
```

---

## テスト項目

### ローカル開発

- [ ] `npm run dev` でアプリ起動
- [ ] DevTools > Elements で hreflang タグ確認
- [ ] 各言語ページでメタデータ切り替え確認
- [ ] language Switcher が正しく動作確認

### Google Search Console

- [ ] sitemap.xml が正常に解析されるか
- [ ] hreflang チェーンが認識されるか
- [ ] インスペクション結果に警告・エラーがないか

### Lighthouse（SEO監査）

```bash
# SEO スコア 90 以上を目指す
lighthouse https://chatmarket.info/
lighthouse https://chatmarket.info/en/
```

---

## 言語ファイル一覧

| ファイル | 用途 | 状態 |
|---------|------|------|
| `lib/i18n.js` | メタデータ + UI翻訳 | ✅ 完了 |
| `components/layout/MultilingualHead.jsx` | hreflang + locale | ✅ 完了 |
| `components/layout/MetaHelmet.jsx` | メタデータ自動適用 | ✅ 完了 |
| `functions/generateSitemap` | Sitemap hreflang出力 | ✅ 完了 |
| `index.html` | OG tags + JSON-LD | ✅ 完了 |
| `public/robots.txt` | クローラー指示 | ✅ 完了 |
| `public/.htaccess` | キャッシュ + セキュリティ | ✅ 完了 |

---

## 本番運用のコツ

### 監視項目

- **Google Search Console**
  - インデックス状況（言語別）
  - カバレッジエラー
  - Core Web Vitals

- **Analytics**
  - 言語別トラフィック分析
  - 言語切り替え動作確認

- **CDN キャッシュ**
  - 言語別ヘッダー設定
  - Accept-Language 対応

### 削除・更新時の注意

- **ページ削除時**: 301リダイレクト で両言語版をリダイレクト
- **URL変更時**: hreflang チェーンが破断しないか確認
- **メタデータ更新**: robots.txt Sitemap の再生成タイミングを設定

---

## 参考資料

- [Google: hreflang について](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Search Central: 多言語SEO](https://developers.google.com/search/docs/beginner/how-search-works)
- [Moz: International SEO](https://moz.com/blog/international-seo-url-structure)