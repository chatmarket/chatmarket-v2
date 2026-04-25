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
    const newVideos = [
      { title: "React Hook メカニズム解説", category: "教育", is_free: false, price: 150, view_count: 2500 },
      { title: "Vue.js 3.0 完全ガイド", category: "教育", is_free: true, price: 0, view_count: 1800 },
      { title: "Svelte フレームワーク入門", category: "技術", is_free: false, price: 200, view_count: 980 },
      { title: "Web Components 標準仕様", category: "技術", is_free: true, price: 0, view_count: 1200 },
      { title: "Python データ分析実践", category: "教育", is_free: false, price: 250, view_count: 3400 },
      { title: "Go 言語システムプログラミング", category: "技術", is_free: true, price: 0, view_count: 1100 },
      { title: "Rust 所有権システム深掘り", category: "教育", is_free: false, price: 280, view_count: 2100 },
      { title: "Kotlin Android 開発完全版", category: "技術", is_free: true, price: 0, view_count: 1450 },
      { title: "Swift iOS アプリ開発", category: "教育", is_free: false, price: 220, view_count: 2800 },
      { title: "C++ ゲームエンジン プログラミング", category: "技術", is_free: true, price: 0, view_count: 1650 },
      { title: "SQL データベース設計", category: "教育", is_free: false, price: 190, view_count: 2300 },
      { title: "PostgreSQL パフォーマンス最適化", category: "技術", is_free: true, price: 0, view_count: 890 },
      { title: "MongoDB NoSQL 実践", category: "教育", is_free: false, price: 210, view_count: 1750 },
      { title: "Redis キャッシング戦略", category: "技術", is_free: true, price: 0, view_count: 1320 },
      { title: "Elasticsearch 全文検索構築", category: "教育", is_free: false, price: 260, view_count: 2650 },
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
        description: `${v.title} - Professional video content`,
        video_url: `https://cdn.example.com/video-${i + 1}-${Date.now()}.mp4`,
        thumbnail_url: `https://images.example.com/thumb-${i + 1}.jpg?t=${Date.now()}`,
        mux_playback_id: `mux-${i + 1}-${Date.now()}`,
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