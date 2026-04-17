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
      { url: '/info', changefreq: 'monthly', priority: '0.8' },
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

    // サイトマップXML生成
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">\n';
    const urlsetClose = '</urlset>';

    let xmlContent = xmlHeader + urlsetOpen;

    // 静的ページ
    staticPages.forEach(page => {
      const lastmod = new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://chatmarket.info${page.url}</loc>\n`;
      xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
      xmlContent += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xmlContent += `    <priority>${page.priority}</priority>\n`;
      xmlContent += `    <mobile:mobile/>\n`;
      xmlContent += `  </url>\n`;
    });

    // チャンネルページ
    channels.forEach(channel => {
      if (!channel.id) return;
      const lastmod = channel.updated_date 
        ? new Date(channel.updated_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://chatmarket.info/channel/${channel.id}</loc>\n`;
      xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
      xmlContent += `    <changefreq>weekly</changefreq>\n`;
      xmlContent += `    <priority>0.7</priority>\n`;
      xmlContent += `    <mobile:mobile/>\n`;
      xmlContent += `  </url>\n`;
    });

    // 動画ページ
    videos.forEach(video => {
      if (!video.id) return;
      const lastmod = video.updated_date 
        ? new Date(video.updated_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://chatmarket.info/watch/${video.id}</loc>\n`;
      xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
      xmlContent += `    <changefreq>monthly</changefreq>\n`;
      xmlContent += `    <priority>0.6</priority>\n`;
      if (video.thumbnail_url) {
        xmlContent += `    <image:image>\n`;
        xmlContent += `      <image:loc>${video.thumbnail_url}</image:loc>\n`;
        xmlContent += `      <image:title>${(video.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>\n`;
        xmlContent += `    </image:image>\n`;
      }
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