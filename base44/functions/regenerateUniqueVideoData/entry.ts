import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 既存の全動画を削除
    const existing = await base44.asServiceRole.entities.Video.list("", 1000);
    console.log(`[regenerate] 🗑️ Deleting ${existing.length} existing videos...`);
    for (const v of existing) {
      try {
        await base44.asServiceRole.entities.Video.delete(v.id);
      } catch (_) {}
    }

    // ユニークなサンプルデータ生成
    const sampleVideos = [
      { title: "JavaScript 初級チュートリアル", category: "教育", is_free: true, price: 0, view_count: 1500 },
      { title: "React Hook 深掘り解説", category: "教育", is_free: false, price: 150, view_count: 2300 },
      { title: "CSS グリッドレイアウト完全ガイド", category: "教育", is_free: true, price: 0, view_count: 980 },
      { title: "Node.js のバックエンド開発", category: "教育", is_free: false, price: 200, view_count: 3100 },
      { title: "Tailwind CSS で高速デザイン", category: "技術", is_free: true, price: 0, view_count: 1200 },
      { title: "TypeScript 型システムマスター", category: "教育", is_free: false, price: 180, view_count: 2800 },
      { title: "Figma で UI デザイン実践", category: "デザイン", is_free: false, price: 220, view_count: 1600 },
      { title: "アニメーション効果 Framer Motion", category: "技術", is_free: true, price: 0, view_count: 750 },
      { title: "データベース最適化テクニック", category: "技術", is_free: false, price: 250, view_count: 4200 },
      { title: "Web パフォーマンス計測", category: "教育", is_free: true, price: 0, view_count: 890 },
      { title: "GraphQL API 設計パターン", category: "技術", is_free: false, price: 200, view_count: 2500 },
      { title: "Docker コンテナ基礎", category: "技術", is_free: true, price: 0, view_count: 1450 },
      { title: "Kubernetes デプロイメント", category: "技術", is_free: false, price: 300, view_count: 1800 },
      { title: "CI/CD パイプライン構築", category: "技術", is_free: true, price: 0, view_count: 1100 },
      { title: "セキュリティ実装ベストプラクティス", category: "技術", is_free: false, price: 280, view_count: 2200 },
      { title: "認証認可システム完全解説", category: "教育", is_free: true, price: 0, view_count: 1650 },
      { title: "マイクロサービス アーキテクチャ", category: "技術", is_free: false, price: 320, view_count: 2900 },
      { title: "クラウド AWS 実践ガイド", category: "技術", is_free: true, price: 0, view_count: 2100 },
      { title: "テスト駆動開発 TDD のススメ", category: "教育", is_free: false, price: 190, view_count: 1350 },
      { title: "マシンラーニング入門", category: "教育", is_free: true, price: 0, view_count: 3200 },
    ];

    // チャンネル取得（なければ作成）
    const channels = await base44.asServiceRole.entities.Channel.list("", 5);
    let targetChannel = channels[0];
    if (!targetChannel) {
      console.log("[regenerate] 📺 Creating default channel...");
      targetChannel = await base44.asServiceRole.entities.Channel.create({
        name: "ChatMarket Sample Channel",
        owner_email: "admin@chatmarket.example",
        subscriber_count: 5000,
      });
    }

    // サンプル動画を生成して挿入
    const videos = sampleVideos.map((v, i) => ({
      title: v.title,
      description: `${v.title} - 高品質なビデオコンテンツです。${v.is_free ? '無料' : 'プレミアム'}視聴可能。`,
      video_url: `https://example.com/videos/${i + 1}/video.mp4`,
      thumbnail_url: `https://picsum.photos/seed/${i + 1}/480/270?random=${i}`,
      mux_playback_id: `mux-playback-${i + 1}`,
      channel_id: targetChannel.id,
      channel_name: targetChannel.name,
      channel_avatar: targetChannel.avatar_url || "https://via.placeholder.com/100",
      price: v.price,
      is_free: v.is_free,
      view_count: v.view_count,
      duration: 600 + (i * 60),
      category: v.category,
      moderation_status: "approved",
    }));

    console.log(`[regenerate] 📥 Inserting ${videos.length} new unique videos...`);
    const created = await base44.asServiceRole.entities.Video.bulkCreate(videos);

    // ID ユニーク性検証
    const ids = created.map(v => v.id);
    const uniqueIds = new Set(ids);
    const titles = created.map(v => v.title);
    const uniqueTitles = new Set(titles);
    const urls = created.map(v => v.video_url);
    const uniqueUrls = new Set(urls);

    console.log("[regenerate] ✅ DATA VERIFICATION:");
    console.log(`  - Total videos: ${created.length}`);
    console.log(`  - Unique IDs: ${uniqueIds.size}/${created.length} ${uniqueIds.size === created.length ? '✓' : '✗'}`);
    console.log(`  - Unique Titles: ${uniqueTitles.size}/${created.length} ${uniqueTitles.size === created.length ? '✓' : '✗'}`);
    console.log(`  - Unique URLs: ${uniqueUrls.size}/${created.length} ${uniqueUrls.size === created.length ? '✓' : '✗'}`);

    return new Response(JSON.stringify({
      success: true,
      message: `✅ DB regenerated with ${created.length} unique videos`,
      stats: {
        totalVideos: created.length,
        uniqueIds: uniqueIds.size,
        uniqueTitles: uniqueTitles.size,
        uniqueUrls: uniqueUrls.size,
        allUnique: uniqueIds.size === created.length && uniqueTitles.size === created.length && uniqueUrls.size === created.length,
      },
      sample: created.slice(0, 3).map(v => ({ id: v.id, title: v.title, video_url: v.video_url })),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[regenerate] ❌ Error:", error.message);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});