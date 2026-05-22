import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 動的サイトマップ生成エンドポイント
 * チャンネル・動画URLをDBから取得してXMLで返す
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // チャンネル一覧
    let channels = [];
    try {
      channels = await base44.asServiceRole.entities.Channel.list('-created_date', 200);
    } catch (e) {
      console.log('Failed to fetch channels:', e.message);
    }

    // 動画一覧
    let videos = [];
    try {
      videos = await base44.asServiceRole.entities.Video.list('-created_date', 200);
    } catch (e) {
      console.log('Failed to fetch videos:', e.message);
    }

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    const urlsetClose = '</urlset>';

    let xmlContent = xmlHeader + urlsetOpen;

    // チャンネルページ
    channels.forEach(channel => {
      if (!channel.id) return;
      const lastmod = channel.updated_date
        ? new Date(channel.updated_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>https://live-chat-market.com/channel/${channel.id}</loc>\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="ja" href="https://live-chat-market.com/channel/${channel.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="en" href="https://live-chat-market.com/en/channel/${channel.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://live-chat-market.com/channel/${channel.id}" />\n`;
      if (channel.avatar_url) {
        xmlContent += `    <image:image>\n`;
        xmlContent += `      <image:loc>${channel.avatar_url.replace(/&/g, '&amp;')}</image:loc>\n`;
        if (channel.name) {
          xmlContent += `      <image:title>${channel.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>\n`;
        }
        xmlContent += `    </image:image>\n`;
      }
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
      xmlContent += `    <loc>https://live-chat-market.com/watch/${video.id}</loc>\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="ja" href="https://live-chat-market.com/watch/${video.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="en" href="https://live-chat-market.com/en/watch/${video.id}" />\n`;
      xmlContent += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://live-chat-market.com/watch/${video.id}" />\n`;
      if (video.thumbnail_url) {
        xmlContent += `    <image:image>\n`;
        xmlContent += `      <image:loc>${video.thumbnail_url.replace(/&/g, '&amp;')}</image:loc>\n`;
        if (video.title) {
          xmlContent += `      <image:title>${video.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>\n`;
        }
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
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Dynamic sitemap error:', error);
    return new Response('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
});