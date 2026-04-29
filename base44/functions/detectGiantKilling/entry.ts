/**
 * detectGiantKilling
 *
 * 15分以内の急激な売上増によるランキング下剋上を検知し、
 * giant_killing ブロードキャスト通知を生成する。
 * liveStreamCostTracker (5分ごと) と同タイミングで呼び出す想定。
 *
 * POST body: {} (引数不要、admin権限チェックなし・内部呼出し)
 */
import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

// 管理設定のデフォルト値（DB上の AppSettings で上書き可能）
const DEFAULT_ENABLED = true;
const DEFAULT_WINDOW_MIN = 15;   // 15分以内の急上昇を検知
const DEFAULT_THRESHOLD_COINS = 50000; // 15分で5万コイン以上増加

Deno.serve(async (req) => {
  try {
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

    // 管理設定を読み込む（なければデフォルト）
    let enabled = DEFAULT_ENABLED;
    let windowMin = DEFAULT_WINDOW_MIN;
    let thresholdCoins = DEFAULT_THRESHOLD_COINS;

    const settings = await base44.entities.Channel
      .filter({ id: "__giant_killing_settings__" })
      .catch(() => []);
    // settings はダミー；実際は Channel の special record ではなくシンプルな判定にする

    if (!enabled) return Response.json({ skipped: true, reason: 'disabled' });

    const windowMs = windowMin * 60 * 1000;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs).toISOString();

    // 直近windowMin分のコイン消費を channel_owner_email でまとめる
    const recentTxns = await base44.entities.YellCoinTransaction.filter({
      type: 'send',
    });

    const recentFiltered = recentTxns.filter(t => t.created_date >= windowStart);

    // チャンネル別の急上昇コイン数を集計
    const recentMap = {};
    recentFiltered.forEach(t => {
      const key = t.channel_owner_email;
      if (key) recentMap[key] = (recentMap[key] || 0) + (t.amount || 0);
    });

    // 全チャンネルをmonthly_revenue_coins順で取得
    const channels = await base44.entities.Channel.list('-monthly_revenue_coins', 20);
    if (channels.length < 4) return Response.json({ skipped: true, reason: 'not_enough_channels' });

    // 現在の売上ランキング（TOP5）
    const ranked = [...channels]
      .filter(c => c.monthly_revenue_coins > 0)
      .sort((a, b) => (b.monthly_revenue_coins || 0) - (a.monthly_revenue_coins || 0));

    // 直近窓で急上昇かつ4位以下→TOP3へ入ったチャンネルを検索
    let giantKillingChannel = null;
    let rankBefore = -1;
    let rankAfter = -1;

    for (let i = 3; i < ranked.length; i++) {
      const ch = ranked[i];
      const surge = recentMap[ch.owner_email] || 0;
      if (surge < thresholdCoins) continue;

      // このチャンネルが急上昇込みで何位になるか推定
      const projectedCoins = (ch.monthly_revenue_coins || 0) + surge;
      let projectedRank = ranked.findIndex(r => r.id !== ch.id && (r.monthly_revenue_coins || 0) < projectedCoins);
      if (projectedRank === -1) projectedRank = ranked.length - 1;

      if (projectedRank < 3) {
        giantKillingChannel = ch;
        rankBefore = i + 1;
        rankAfter = projectedRank + 1;
        break;
      }
    }

    // 2位→1位逆転も検知
    if (!giantKillingChannel && ranked.length >= 2) {
      const second = ranked[1];
      const surge = recentMap[second.owner_email] || 0;
      if (surge >= thresholdCoins) {
        const first = ranked[0];
        const projectedCoins = (second.monthly_revenue_coins || 0) + surge;
        if (projectedCoins > (first.monthly_revenue_coins || 0)) {
          giantKillingChannel = second;
          rankBefore = 2;
          rankAfter = 1;
        }
      }
    }

    if (!giantKillingChannel) {
      return Response.json({ detected: false });
    }

    // 直近30分以内に同チャンネルの通知がある場合はスキップ（重複防止）
    const recentNotifs = await base44.entities.Notification.filter({
      type: 'giant_killing',
      channel_id: giantKillingChannel.id,
    });
    const recentNotif = recentNotifs.find(n => {
      const age = now - new Date(n.created_date);
      return age < 30 * 60 * 1000;
    });
    if (recentNotif) return Response.json({ detected: false, reason: 'cooldown' });

    // ブロードキャスト通知を作成
    const title = `歴史が動いた！ ${giantKillingChannel.name} がTOP${rankAfter}に躍り出た！`;
    const message = `${rankBefore}位から${rankAfter}位へ！ ${windowMin}分以内に急上昇中！`;

    await base44.entities.Notification.create({
      user_email: 'broadcast',
      type: 'giant_killing',
      title,
      message,
      is_broadcast: true,
      channel_id: giantKillingChannel.id,
      channel_name: giantKillingChannel.name,
      link: `/channel/${giantKillingChannel.id}`,
      thumbnail_url: giantKillingChannel.avatar_url || '',
      rank_before: rankBefore,
      rank_after: rankAfter,
      is_read: false,
    });

    return Response.json({ detected: true, channel: giantKillingChannel.name, rankBefore, rankAfter, title });
  } catch (err) {
    console.error('detectGiantKilling error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});