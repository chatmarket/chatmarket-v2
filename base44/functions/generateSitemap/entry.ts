import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * サイトマップXML生成エンドポイント
 * Google Search Console用のサイトマップを動的に生成
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 基本ページ
    const staticPages = [
      { url: '/', changefreq: 'daily', priority: '1.0' },
      { url: '/recruit', changefreq: 'weekly', priority: '0.9' },
      // LP ページ（高優先度・新機能対応済み）
      { url: '/idol-lp', changefreq: 'weekly', priority: '0.95' },
      { url: '/fortune-lp', changefreq: 'weekly', priority: '0.9' },
      { url: '/musician', changefreq: 'weekly', priority: '0.85' },
      { url: '/lp/tutor', changefreq: 'weekly', priority: '0.85' },
      { url: '/lp/expert', changefreq: 'weekly', priority: '0.85' },
      { url: '/lp/fitness', changefreq: 'weekly', priority: '0.85' },
      { url: '/lp/career', changefreq: 'weekly', priority: '0.85' },
      { url: '/lp/english', changefreq: 'weekly', priority: '0.85' },
      { url: '/lp/coach', changefreq: 'weekly', priority: '0.85' },
      { url: '/info', changefreq: 'monthly', priority: '0.8' },
      { url: '/blog', changefreq: 'weekly', priority: '0.7' },
      { url: '/terms', changefreq: 'monthly', priority: '0.5' },
      { url: '/privacy', changefreq: 'monthly', priority: '0.5' },
      { url: '/company', changefreq: 'monthly', priority: '0.6' },
    ];

    // 動的ページ: チャンネル一覧
    let channels = [];
    try {
      channels = await base44.asServiceRole.entities.Channel.list('-created_date', 100);
    } catch (e) {
      console.log('Failed to fetch channels for sitemap:', e.message);
    }

    // 動的ページ: 動画一覧
    let videos = [];
    try {
      videos = await base44.asServiceRole.entities.Video.list('-created_date', 100);
    } catch (e) {
      console.log('Failed to fetch videos for sitemap:', e.message);
    }

    // サイトマップXML生成（マルチリンガル対応）
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const xmlnsDeclaration = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    const urlsetOpen = `<urlset ${xmlnsDeclaration}>\n`;
    const urlsetClose = '</urlset>';

    let xmlContent = xmlHeader + urlsetOpen;

    // 静的ページ（hreflang付き）
    staticPages.forEach(page => {
      const lastmod = new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://live-chat-market.com${page.url}</loc>\n`;
      
      // hreflang ブロック（日本語版と英語版）
      xmlContent += `    <xhtml:link rel="alternate" hreflang="ja" href="https://live-chat-market.com${page.url}" />\n`;
      if (page.url === '/') {
        xmlContent += `    <xhtml:link rel="alternate" hreflang="en" href="https://live-chat-market.com/en/" />\n`;
      } else {
        xmlContent += `    <xhtml:link rel="alternate" hreflang="en" href="https://live-chat-market.com/en${page.url}" />\n`;
      }
      xmlContent += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://live-chat-market.com${page.url}" />\n`;
      
      xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
      xmlContent += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xmlContent += `    <priority>${page.priority}</priority>\n`;
      xmlContent += `    <mobile:mobile/>\n`;
      xmlContent += `  </url>\n`;
    });

    // チャンネルページ（hreflang付き）
    channels.forEach(channel => {
      if (!channel.id) return;
      const lastmod = channel.updated_date 
        ? new Date(channel.updated_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://live-chat-market.com/channel/${channel.id}</loc>\n`;
      
      // hreflang ブロック
      xmlContent += `    <xhtml:link rel="alternate" hreflang="ja" href="https://live-chat-market.com/channel/${channel.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="en" href="https://live-chat-market.com/en/channel/${channel.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://live-chat-market.com/channel/${channel.id}" />\n`;
      
      xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
      xmlContent += `    <changefreq>weekly</changefreq>\n`;
      xmlContent += `    <priority>0.7</priority>\n`;
      xmlContent += `    <mobile:mobile/>\n`;
      xmlContent += `  </url>\n`;
    });

    // 動画ページ（hreflang付き）
    videos.forEach(video => {
      if (!video.id) return;
      const lastmod = video.updated_date 
        ? new Date(video.updated_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://live-chat-market.com/watch/${video.id}</loc>\n`;
      
      // hreflang ブロック
      xmlContent += `    <xhtml:link rel="alternate" hreflang="ja" href="https://live-chat-market.com/watch/${video.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="en" href="https://live-chat-market.com/en/watch/${video.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://live-chat-market.com/watch/${video.id}" />\n`;
      
      if (video.thumbnail_url) {
        xmlContent += `    <image:image>\n`;
        xmlContent += `      <image:loc>${video.thumbnail_url.replace(/&/g, '&amp;')}</image:loc>\n`;
        xmlContent += `      <image:title>${(video.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>\n`;
        xmlContent += `    </image:image>\n`;
      }
      xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
      xmlContent += `    <changefreq>monthly</changefreq>\n`;
      xmlContent += `    <priority>0.6</priority>\n`;
      xmlContent += `    <mobile:mobile/>\n`;
      xmlContent += `  </url>\n`;
    });

    xmlContent += urlsetClose;

    return new Response(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
});