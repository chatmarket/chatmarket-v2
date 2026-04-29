/**
 * lib/userPlan.js
 * ユーザーのプラン・権限を一元管理するユーティリティ
 *
 * 優先順位:
 *   1. user.role === 'admin'  → 全機能開放（メールアドレス依存なし）
 *   2. CampaignLiveGrantee    → 期間付き全機能開放（個別ID・期間はDBで管理）
 *   3. PlanSubscription(active) → 購読プランに応じた機能
 *   4. その他                 → free
 *
 * 使い方:
 *   import { resolveUserPlan, hasFeature } from '@/lib/userPlan';
 *   const planInfo = await resolveUserPlan(user);
 *   if (hasFeature(planInfo, 'video_call')) { ... }
 */

import { base44 } from '@/api/base44Client';

// 各プランで利用できる機能セット
const PLAN_FEATURES = {
  free: [
    'video_call',        // 有料1対1通話（収益率70%）
    'yell_coin',         // エールコイン受取
    'channel',           // チャンネルページ
    'community',         // コミュニティ閲覧
  ],
  basic: [
    'video_call',        // 有料1対1通話（収益率85%）
    'yell_coin',
    'channel',
    'community',
    'community_post',    // コミュニティ投稿
    'fan_community',     // ファンコミュニティ
    'progressive_rate',  // プログレッシブ・インセンティブ
  ],
  'call-anser': [
    'video_call',
    'free_call_daily',   // 1日60分の無料通話枠
    'yell_coin',
    'channel',
    'community',
    'community_post',
    'fan_community',
    'progressive_rate',
  ],
  vod: [
    'vod_upload',        // 動画販売
    'vod_archive',       // アーカイブ販売
    'recording',         // 録画オプション
    'yell_coin',
    'channel',
    'community',
    'community_post',
    'fan_community',
  ],
  ppv: [
    'live_ppv',          // 有料ライブ配信
    'yell_coin',
    'channel',
    'community',
    'community_post',
    'fan_community',
    'progressive_rate',
  ],
};

// 全機能（admin・キャンペーン用）
const ALL_FEATURES = [
  'video_call', 'free_call_daily', 'yell_coin', 'channel', 'community',
  'community_post', 'fan_community', 'progressive_rate', 'vod_upload',
  'vod_archive', 'recording', 'live_ppv',
];

/**
 * ユーザーのプラン情報を解決する
 * @param {object} user - base44.auth.me() の結果
 * @returns {object} planInfo
 *   - plans: string[]          有効なプランIDリスト
 *   - features: string[]       利用可能な機能リスト
 *   - isAdmin: boolean
 *   - isCampaign: boolean      キャンペーン適用中
 *   - campaignExpiresAt: Date|null
 *   - revenueRate: number      収益率（0.70〜0.95）
 *   - coinPer15min: number     15分あたり最低コイン
 */
export async function resolveUserPlan(user) {
  if (!user) {
    return { plans: ['free'], features: PLAN_FEATURES.free, isAdmin: false, isCampaign: false, campaignExpiresAt: null, revenueRate: 0.70, coinPer15min: 200 };
  }

  // 1. Admin → 全機能開放
  if (user.role === 'admin') {
    return {
      plans: ['basic', 'call-anser', 'vod', 'ppv'],
      features: ALL_FEATURES,
      isAdmin: true,
      isCampaign: false,
      campaignExpiresAt: null,
      revenueRate: 0.85,
      coinPer15min: 150,
    };
  }

  // 2. キャンペーン対象者チェック（DBで期間管理）
  try {
    const now = new Date().toISOString();
    const grants = await base44.entities.CampaignLiveGrantee.filter({ email: user.email });
    const activeGrant = grants.find(g => g.expires_at && new Date(g.expires_at) > new Date());
    if (activeGrant) {
      return {
        plans: ['basic', 'call-anser', 'vod', 'ppv'],
        features: ALL_FEATURES,
        isAdmin: false,
        isCampaign: true,
        campaignExpiresAt: new Date(activeGrant.expires_at),
        revenueRate: 0.85,
        coinPer15min: 150,
      };
    }
  } catch (e) {
    // フォールバック：エラー時はスキップ
    console.warn('[userPlan] CampaignLiveGrantee check failed:', e);
  }

  // 3. 購読プランチェック
  try {
    const subscriptions = await base44.entities.PlanSubscription.filter({ user_email: user.email, status: 'active' });
    const activePlanIds = subscriptions.map(s => s.plan_id);

    if (activePlanIds.length > 0) {
      // 全プランの機能を合算
      const featureSet = new Set();
      activePlanIds.forEach(pid => {
        (PLAN_FEATURES[pid] || []).forEach(f => featureSet.add(f));
      });

      // 収益率：basic or call-anser があれば85%
      const hasBasicOrCallAnser = activePlanIds.includes('basic') || activePlanIds.includes('call-anser');
      return {
        plans: activePlanIds,
        features: [...featureSet],
        isAdmin: false,
        isCampaign: false,
        campaignExpiresAt: null,
        revenueRate: hasBasicOrCallAnser ? 0.85 : 0.70,
        coinPer15min: hasBasicOrCallAnser ? 150 : 200,
      };
    }
  } catch (e) {
    console.warn('[userPlan] PlanSubscription check failed:', e);
  }

  // 4. Free
  return {
    plans: ['free'],
    features: PLAN_FEATURES.free,
    isAdmin: false,
    isCampaign: false,
    campaignExpiresAt: null,
    revenueRate: 0.70,
    coinPer15min: 200,
  };
}

/**
 * planInfo が特定の機能を持つか確認
 */
export function hasFeature(planInfo, feature) {
  return planInfo?.features?.includes(feature) ?? false;
}

/**
 * planInfo からプライマリプランID（表示用）を返す
 */
export function getPrimaryPlanId(planInfo) {
  if (planInfo.isAdmin || planInfo.isCampaign) return 'call-anser';
  if (planInfo.plans.includes('call-anser')) return 'call-anser';
  if (planInfo.plans.includes('basic')) return 'basic';
  if (planInfo.plans.includes('vod')) return 'vod';
  if (planInfo.plans.includes('ppv')) return 'ppv';
  return 'free';
}