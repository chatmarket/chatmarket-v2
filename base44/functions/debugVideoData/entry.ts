import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 最新100件の動画を全取得
    const videos = await base44.asServiceRole.entities.Video.list("-created_date", 100);
    
    console.log(`[debugVideoData] 🎬 Total videos: ${videos.length}`);
    
    if (videos.length === 0) {
      return new Response(JSON.stringify({ error: "No videos in DB" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 最初の5件のデータ構造を詳細に出力
    const sample = videos.slice(0, 5).map((v, i) => ({
      index: i,
      id: v.id,
      title: v.title,
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url,
      is_free: v.is_free,
      price: v.price,
      view_count: v.view_count,
      category: v.category,
      moderation_status: v.moderation_status,
      channel_id: v.channel_id,
      channel_name: v.channel_name,
    }));

    console.log("[debugVideoData] 📋 First 5 videos:", JSON.stringify(sample, null, 2));

    // URLの重複チェック
    const urlCounts = {};
    videos.forEach(v => {
      if (v.video_url) {
        urlCounts[v.video_url] = (urlCounts[v.video_url] || 0) + 1;
      }
    });
    const duplicateUrls = Object.entries(urlCounts).filter(([_, count]) => count > 1);
    
    console.log(`[debugVideoData] 🔍 Duplicate URLs: ${JSON.stringify(duplicateUrls.slice(0, 5))}`);

    // タイトルの重複チェック
    const titleCounts = {};
    videos.forEach(v => {
      titleCounts[v.title] = (titleCounts[v.title] || 0) + 1;
    });
    const duplicateTitles = Object.entries(titleCounts).filter(([_, count]) => count > 1);
    
    console.log(`[debugVideoData] 📝 Duplicate titles: ${JSON.stringify(duplicateTitles.slice(0, 5))}`);

    // カテゴリ別集計
    const categoryCounts = {};
    videos.forEach(v => {
      const cat = v.category || 'undefined';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    console.log("[debugVideoData] 📊 Videos by category:", categoryCounts);

    // 無料動画数
    const freeCount = videos.filter(v => v.is_free).length;
    const paidCount = videos.filter(v => !v.is_free && v.price > 0).length;
    console.log(`[debugVideoData] 💰 Free: ${freeCount}, Paid: ${paidCount}`);

    return new Response(JSON.stringify({
      total: videos.length,
      sample: sample,
      stats: {
        duplicateUrls: duplicateUrls.length,
        duplicateTitles: duplicateTitles.length,
        categoryDistribution: categoryCounts,
        freeVideos: freeCount,
        paidVideos: paidCount,
      },
      warning: duplicateUrls.length > 0 || duplicateTitles.length > 0 
        ? "⚠️ 重複データを検出しました" 
        : "✅ データは正常です",
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[debugVideoData] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});