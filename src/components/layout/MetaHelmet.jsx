import { useEffect } from 'react';
import { getMeta, GLOBAL_META } from '@/lib/i18n';

/**
 * MetaHelmet コンポーネント
 * document.titleとmeta descriptionを直接操作（react-helmet-async不要）
 */
export default function MetaHelmet({ 
  page = 'home', 
  lang = 'ja',
  title,
  description,
  image,
  noindex = false,
}) {
  const meta = getMeta(page, lang);
  const finalTitle = title || meta.title || GLOBAL_META.siteName;
  const finalDescription = description || meta.description || '';
  const finalImage = image || GLOBAL_META.image;

  useEffect(() => {
    // title
    document.title = finalTitle;

    // robots (noindex制御)
    const setRobots = (content) => {
      let el = document.querySelector('meta[name="robots"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', 'robots');
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    if (noindex) {
      setRobots('noindex, nofollow');
    }

    // description
    let descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', finalDescription);

    // OG tags
    const setMeta = (property, content, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('og:title', finalTitle);
    setMeta('og:description', finalDescription);
    setMeta('og:image', finalImage);
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDescription);
    setMeta('twitter:image', finalImage);
  }, [finalTitle, finalDescription, finalImage, noindex]);

  return null;
}