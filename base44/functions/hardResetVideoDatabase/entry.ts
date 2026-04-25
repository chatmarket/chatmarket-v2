import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ========== STEP 1: DB に今入っているデータを確認 ==========
    console.log("[hardReset] 🔍 CHECKING CURRENT DB DATA...");
    const before = await base44.asServiceRole.entities.Video.list("", 1000);
    console.log(`[hardReset] 📊 Currently in DB: ${before.length} videos`);
    
    if (before.length > 0) {
      const titles = before.map(v => v.title);
      const uniqueTitles = new Set(titles);
      const ids = before.map(v => v.id);
      const uniqueIds = new Set(ids);
      
      console.log(`[hardReset] ⚠️ BEFORE STATE:`);
      console.log(`  - Unique IDs: ${uniqueIds.size}/${before.length}`);
      console.log(`  - Unique Titles: ${uniqueTitles.size}/${before.length}`);
      console.log(`[hardReset] Sample titles: ${titles.slice(0, 3).join(', ')}`);
    }

    // ========== STEP 2: 全削除（強制） ==========
    console.log(`[hardReset] 🗑️ FORCE DELETING ALL VIDEOS...`);
    let deleteCount = 0;
    for (const v of before) {
      try {
        await base44.asServiceRole.entities.Video.delete(v.id);
        deleteCount++;
      } catch (e) {
        console.warn(`[hardReset] ⚠️ Failed to delete ${v.id}: ${e.message}`);
      }
    }
    console.log(`[hardReset] ✅ Deleted: ${deleteCount} videos`);

    // ========== STEP 3: 新規データ挿入（完全にユニーク） ==========
    const videoUrls = [
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerJlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerMeltdowns.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/SubaruOutbackOnStreetAndDirt.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/TearsOfSteel.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/VolleyballShortFilm.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-library/sample/WhatCarCanYouGetForAGrand.mp4",
      "https://vimeo.com/648359395/download/a8fc88fa-3925-49cd-9c4b-bc1d23f65f84/master.json",
      "https://test-streams.mux.dev/x36xhzz/x3iu7z32.m3u8",
      "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
      "https://www.learningcontainer.com/download/sample-mp4-video-file-download-for-testing/",
      "https://media.w3.org/2010/05/sintel/trailer.mp4",
    ];

    const newVideos = [
      { 
        title: "JavaScript 完全ガイド",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 2500,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop"
      },
      {
        title: "React Hook 完全マスター",
        category: "教育",
        is_free: false,
        price: 150,
        view_count: 1800,
        thumbnail_url: "https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=400&h=225&fit=crop"
      },
      {
        title: "Vue 3.0 フレームワーク解説",
        category: "技術",
        is_free: true,
        price: 0,
        view_count: 980,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712645-2f3c256a1101?w=400&h=225&fit=crop"
      },
      {
        title: "Svelte 最新フレームワーク",
        category: "技術",
        is_free: false,
        price: 200,
        view_count: 1200,
        thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06fe8c50e9b?w=400&h=225&fit=crop"
      },
      {
        title: "Python データサイエンス",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 3400,
        thumbnail_url: "https://images.unsplash.com/photo-1551523164-0de305d12537?w=400&h=225&fit=crop"
      },
      {
        title: "Go 言語入門",
        category: "技術",
        is_free: false,
        price: 180,
        view_count: 1100,
        thumbnail_url: "https://images.unsplash.com/photo-1542393881-24ac4a6d9ecf?w=400&h=225&fit=crop"
      },
      {
        title: "Rust システムプログラミング",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 2100,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712642-f4a0be2b1d18?w=400&h=225&fit=crop"
      },
      {
        title: "TypeScript 型システム",
        category: "技術",
        is_free: false,
        price: 220,
        view_count: 1450,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop"
      },
      {
        title: "Docker コンテナ化技術",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 2800,
        thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06fe8c50e9b?w=400&h=225&fit=crop"
      },
      {
        title: "Kubernetes デプロイメント",
        category: "技術",
        is_free: false,
        price: 250,
        view_count: 1650,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712645-2f3c256a1101?w=400&h=225&fit=crop"
      },
      {
        title: "GraphQL API 設計",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 2300,
        thumbnail_url: "https://images.unsplash.com/photo-1533241749318-6b8da08a523e?w=400&h=225&fit=crop"
      },
      {
        title: "データベース最適化",
        category: "技術",
        is_free: false,
        price: 200,
        view_count: 1750,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop"
      },
      {
        title: "Web セキュリティ基礎",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 2650,
        thumbnail_url: "https://images.unsplash.com/photo-1530268729831-4ca8ffd4d14d?w=400&h=225&fit=crop"
      },
      {
        title: "CI/CD パイプライン構築",
        category: "技術",
        is_free: false,
        price: 280,
        view_count: 1320,
        thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06fe8c50e9b?w=400&h=225&fit=crop"
      },
      {
        title: "マイクロサービス設計",
        category: "教育",
        is_free: true,
        price: 0,
        view_count: 1890,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop"
      },
    ];

    const channels = await base44.asServiceRole.entities.Channel.list("", 5);
    let targetChannel = channels[0];
    if (!targetChannel) {
      targetChannel = await base44.asServiceRole.entities.Channel.create({
        name: "ChatMarket Official",
        owner_email: "system@chatmarket.local",
        subscriber_count: 10000,
      });
    }

    console.log(`[hardReset] 📥 INSERTING ${newVideos.length} NEW UNIQUE VIDEOS...`);
    const inserted = await base44.asServiceRole.entities.Video.bulkCreate(
      newVideos.map((v, i) => ({
        title: v.title,
        description: `${v.title} - 高品質なビデオコンテンツです。${v.is_free ? '無料' : 'プレミアム'}視聴可能。`,
        video_url: videoUrls[i % videoUrls.length],
        thumbnail_url: v.thumbnail_url,
        mux_playback_id: `mux-demo-${i + 1}`,
        channel_id: targetChannel.id,
        channel_name: targetChannel.name,
        channel_avatar: targetChannel.avatar_url || "",
        price: v.price,
        is_free: v.is_free,
        view_count: v.view_count,
        duration: 600 + (i * 120),
        category: v.category,
        moderation_status: "approved",
      }))
    );

    // ========== STEP 4: 検証 ==========
    console.log(`[hardReset] ✅ INSERTED: ${inserted.length} videos`);
    
    const ids = inserted.map(v => v.id);
    const uniqueIds = new Set(ids);
    const titles = inserted.map(v => v.title);
    const uniqueTitles = new Set(titles);
    const urls = inserted.map(v => v.video_url);
    const uniqueUrls = new Set(urls);

    const allUnique = uniqueIds.size === inserted.length && uniqueTitles.size === inserted.length && uniqueUrls.size === inserted.length;

    console.log(`[hardReset] 📊 AFTER STATE:`);
    console.log(`  - Unique IDs: ${uniqueIds.size}/${inserted.length} ${uniqueIds.size === inserted.length ? '✓' : '✗'}`);
    console.log(`  - Unique Titles: ${uniqueTitles.size}/${inserted.length} ${uniqueTitles.size === inserted.length ? '✓' : '✗'}`);
    console.log(`  - Unique URLs: ${uniqueUrls.size}/${inserted.length} ${uniqueUrls.size === inserted.length ? '✓' : '✗'}`);
    
    if (allUnique) {
      console.log(`[hardReset] 🎉 ALL DATA IS NOW 100% UNIQUE!`);
    } else {
      console.error(`[hardReset] 🚨 DUPLICATE DETECTED - DATA IS BROKEN`);
    }

    // ========== STEP 5: 最終確認 ==========
    const final = await base44.asServiceRole.entities.Video.list("-created_date", 20);
    const finalTitles = final.map(v => v.title);
    console.log(`[hardReset] 🔎 FINAL DB CHECK (latest 5): ${finalTitles.slice(0, 5).join(' | ')}`);

    return new Response(JSON.stringify({
      success: allUnique,
      message: allUnique ? "✅ DB HARD RESET COMPLETE - All data is 100% unique" : "❌ Data still has duplicates",
      stats: {
        deletedCount: deleteCount,
        insertedCount: inserted.length,
        uniqueIds: uniqueIds.size,
        uniqueTitles: uniqueTitles.size,
        uniqueUrls: uniqueUrls.size,
        allUnique: allUnique,
      },
      samples: inserted.slice(0, 3).map(v => ({
        id: v.id,
        title: v.title,
        video_url: v.video_url,
      })),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[hardReset] ❌ FATAL ERROR:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});