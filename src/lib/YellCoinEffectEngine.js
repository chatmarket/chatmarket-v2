/**
 * === YellCoinSystem - 演出エンジン ===
 * 小野社長の6段階階級制度に基づいた演出の自動切り替え
 * 上書き・先祖返りを完全に禁止し、YellCoinSystem として独立保護
 */

import { YELL_COIN_TIERS, getYellTierFromCoins } from "./constants.js";

/**
 * 演出パラメータ（effectLevel → 派手さ）
 * Level 1: 軽い通知 (Toast style)
 * Level 2: 中程度エフェクト (Confetti + テキスト)
 * Level 3: 最高派手エフェクト (全画面爆発 + サウンド)
 */
export const EFFECT_PRESETS = {
  1: {
    duration: 2000,           // 2秒
    scale: 1.0,              // 1倍
    particleCount: 20,       // 20個
    soundVolume: 0.3,        // 30% 音量
    shake: false,            // 画面揺らし: なし
  },
  2: {
    duration: 4000,           // 4秒
    scale: 1.5,              // 1.5倍
    particleCount: 50,       // 50個
    soundVolume: 0.7,        // 70% 音量
    shake: true,             // 画面揺らし: あり
  },
  3: {
    duration: 6000,           // 6秒
    scale: 2.0,              // 2倍
    particleCount: 150,      // 150個（大量）
    soundVolume: 1.0,        // 100% 音量
    shake: true,             // 画面揺らし: あり（強烈）
    fullscreenFlash: true,   // 全画面フラッシュ
    bgmDuck: true,           // BGM音量を落とす
  },
};

/**
 * エールコイン情報から演出パラメータを決定
 * @param {number} coins - エールコイン数
 * @returns {object} - { tier, effectLevel, params }
 */
export function getEffectConfig(coins) {
  const tier = getYellTierFromCoins(coins);
  const effectLevel = tier.effectLevel;
  const params = EFFECT_PRESETS[effectLevel];

  return {
    tier,
    effectLevel,
    params,
    isHighValue: coins >= 5000, // 5000コイン以上は「ハイバリュー」
  };
}

/**
 * エール情報を正規化・保護する
 * SuperChat への先祖返り防止
 * @param {object} yellData - { user_name, amount, message, livestream_id, ... }
 * @returns {object} - 保護された正規化データ
 */
export function normalizeYellData(yellData) {
  // 必須フィールドの検証
  if (!yellData.user_name || !yellData.amount || !yellData.livestream_id) {
    throw new Error("YellCoinSystem: Required fields (user_name, amount, livestream_id) are missing");
  }

  const tier = getYellTierFromCoins(yellData.amount);

  return {
    id: yellData.id,
    user_name: yellData.user_name,
    user_email: yellData.user_email,
    amount: yellData.amount,
    message: yellData.message || "",
    livestream_id: yellData.livestream_id,
    created_at: yellData.created_at || new Date().toISOString(),
    
    // YellCoinSystem 固有フィールド
    tier,
    effectLevel: tier.effectLevel,
    isFeatured: tier.featured && yellData.amount >= 5000, // 5000コイン以上は自動ピン留め
  };
}

/**
 * ハイバリュー判定（ピン留め対象）
 * @param {number} coins - エールコイン数
 * @returns {boolean} - 5000コイン以上 = true
 */
export function isHighValueYell(coins) {
  return coins >= 5000;
}

/**
 * テスト用: ランダムエール生成
 * @param {string} streamId - ライブストリーム ID
 * @returns {object} - テスト用エールデータ
 */
export function generateTestYell(streamId) {
  const testAmounts = [50, 100, 500, 1000, 5000, 10000];
  const amount = testAmounts[Math.floor(Math.random() * testAmounts.length)];
  const tier = getYellTierFromCoins(amount);

  return {
    user_name: `テスト視聴者${Math.floor(Math.random() * 999)}`,
    amount,
    message: `${tier.emoji} ${tier.name} を送ります！`,
    livestream_id: streamId,
    created_at: new Date().toISOString(),
  };
}

export default {
  EFFECT_PRESETS,
  getEffectConfig,
  normalizeYellData,
  isHighValueYell,
  generateTestYell,
};