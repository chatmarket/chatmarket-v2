/**
 * forumPost - 掲示板投稿の安全処理
 * - NGワードフィルタ
 * - IP/UAログ記録
 * - 管理者メール通知（通報時）
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---- NGワードリスト（個人情報・卑猥ワード） ----
const NG_WORDS = [
  // 個人情報系
  "住所", "電話番号", "クレジットカード", "マイナンバー", "口座番号", "パスポート",
  // 卑猥・わいせつ系（ひらがな・カタカナ含む）
  "セックス", "sex", "ちんぽ", "まんこ", "おっぱい", "アナル", "フェラ", "クンニ",
  "レイプ", "強姦", "痴漢", "エロ", "ポルノ", "AV", "援交", "売春", "売買春",
  // 誹謗中傷系
  "死ね", "殺す", "ぶっ殺", "氏ね", "クズ", "ゴミ", "カス", "うざい", "きもい",
  // 差別語（代表的なもの）
  "チョン", "チャンコロ", "ニガー",
];

function containsNgWord(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const word of NG_WORDS) {
    if (lower.includes(word.toLowerCase())) return word;
  }
  return null;
}

// クライアントIPを取得（CDN/プロキシ対応）
function getClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ---- 投稿作成 ----
    if (action === "create") {
      const { title, content, tag, author_name, trip } = body;

      // NGワードチェック
      const ngInTitle = containsNgWord(title);
      const ngInContent = containsNgWord(content);
      if (ngInTitle || ngInContent) {
        return Response.json({
          error: "ng_word",
          word: ngInTitle || ngInContent,
          message: `投稿にNGワード「${ngInTitle || ngInContent}」が含まれています。修正してから投稿してください。`
        }, { status: 400 });
      }

      const ip = getClientIp(req);
      const ua = req.headers.get("user-agent") || "unknown";
      const now = new Date().toISOString();

      const post = await base44.entities.BlogPost.create({
        title: title.trim(),
        content: content.trim(),
        tag: tag || null,
        author_name: author_name || user.full_name || user.email,
        author_email: user.email,
        trip: trip || "",
        post_type: "forum",
        likes: 0,
        replies: [],
        poster_ip: ip,
        poster_ua: ua,
        posted_at_ts: now,
        report_count: 0,
        is_hidden: false,
      });

      return Response.json({ success: true, post });
    }

    // ---- 通報 ----
    if (action === "report") {
      const { post_id, reason, detail } = body;

      if (!post_id || !reason) {
        return Response.json({ error: "post_id and reason are required" }, { status: 400 });
      }

      // 投稿情報取得
      const posts = await base44.entities.BlogPost.filter({ id: post_id });
      const post = posts[0];

      // 通報レコード作成
      await base44.entities.ForumReport.create({
        post_id,
        post_title: post?.title || "",
        reporter_email: user.email,
        reason,
        detail: detail || "",
        post_author_email: post?.author_email || "",
        post_author_ip: post?.poster_ip || "",
        status: "pending",
      });

      // 通報数をインクリメント
      if (post) {
        await base44.entities.BlogPost.update(post_id, {
          report_count: (post.report_count || 0) + 1,
        });
      }

      // 管理者に通知メール
      const adminList = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      for (const admin of adminList) {
        if (!admin.email) continue;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `【要確認】掲示板通報: ${reason} — "${post?.title || post_id}"`,
          body: `
掲示板に通報が入りました。

■ 通報理由: ${reason}
■ 投稿タイトル: ${post?.title || "(不明)"}
■ 投稿者メール: ${post?.author_email || "(不明)"}
■ 投稿者IP: ${post?.poster_ip || "(不明)"}
■ 通報者: ${user.email}
■ 詳細: ${detail || "(なし)"}
■ 投稿内容（先頭200字）:
${(post?.content || "").slice(0, 200)}

管理ダッシュボードで確認してください。
          `.trim()
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});