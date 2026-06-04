import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getMeta, GLOBAL_META, getLang } from '@/lib/i18n';

const BASE_URL = 'https://live-chat-market.com';

/**
 * MetaHelmet コンポーネント
 * document.title / meta description / OGP / hreflang / canonical を管理
 */
export default function MetaHelmet({ 
  page = 'home', 
  lang,
  title,
  description,
  keywords,
  image,
  noindex = false,
}) {
  const location = useLocation();
  const currentLang = lang || getLang() || 'ja';
  const meta = getMeta(page, currentLang);

  const finalTitle = title || meta.title || `Chat Market`;
  const finalDescription = description || meta.description || '';
  const finalImage = image || GLOBAL_META.image;
  const canonical = `${BASE_URL}${location.pathname}`;

  useEffect(() => {
    // title
    document.title = finalTitle;

    // html lang 属性
    document.documentElement.setAttribute('lang', currentLang);

    // robots
    const setMeta = (nameOrProp, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, nameOrProp);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (noindex) {
      setMeta('robots', 'noindex, nofollow');
    }

    // description
    setMeta('description', finalDescription);

    // keywords
    if (meta.keywords || keywords) {
      setMeta('keywords', keywords || meta.keywords);
    }

    // OG tags
    setMeta('og:title', finalTitle, 'property');
    setMeta('og:description', finalDescription, 'property');
    setMeta('og:image', finalImage, 'property');
    setMeta('og:url', canonical, 'property');
    setMeta('og:locale', currentLang === 'ja' ? 'ja_JP' : currentLang === 'ko' ? 'ko_KR' : currentLang === 'zh' ? 'zh_CN' : 'en_US', 'property');
    setMeta('og:site_name', 'Chat Market', 'property');

    // Twitter Card
    setMeta('twitter:title', finalTitle, 'name');
    setMeta('twitter:description', finalDescription, 'name');
    setMeta('twitter:image', finalImage, 'name');

    // Canonical URL
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

    // hreflang — remove old ones first
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    const hrefLangs = [
      { lang: 'ja', href: `${BASE_URL}${location.pathname}` },
      { lang: 'en', href: `${BASE_URL}${location.pathname}` },
      { lang: 'x-default', href: `${BASE_URL}${location.pathname}` },
    ];
    hrefLangs.forEach(({ lang: l, href }) => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'alternate');
      el.setAttribute('hreflang', l);
      el.setAttribute('href', href);
      document.head.appendChild(el);
    });

  }, [finalTitle, finalDescription, finalImage, noindex, currentLang, canonical, location.pathname]);

  return null;
}