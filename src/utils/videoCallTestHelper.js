/**
 * VideoCall テスト検証ヘルパー
 * ミリオネア・チャレンジ期間における通話フロー（15分固定ロック）の検証
 */

export const MILLIONAIRE_PERIOD = {
  START: new Date("2026-04-01"),
  END: new Date("2026-06-30"),
};

export const CALL_CONFIG = {
  MILLIONAIRE_DURATION_MIN: 15, // ミリオネア期間は全員15分固定
  WARNING_3MIN_SEC: 180, // 3分前
  WARNING_1MIN_SEC: 60,  // 1分前
  EXTEND_BANNER_SEC: 30, // 30秒前に延長提案
};

/**
 * ミリオネア期間チェック
 */
export function isInMillionairePeriod(date = new Date()) {
  return date >= MILLIONAIRE_PERIOD.START && date <= MILLIONAIRE_PERIOD.END;
}

/**
 * テスト用: 通話時間の優先順位ロジック検証
 * 優先順: ① ミリオネア期間 → 15分固定 ② ライバー設定 ③ プラン別デフォルト
 */
export function getEffectiveDurationForTest(channel, user, isMillionaireActive = true) {
  // 1. ミリオネア・チャレンジ期間中は全員15分ロック
  if (isMillionaireActive) {
    return 15;
  }

  // 2. ライバー個別設定があれば使用
  if (channel?.default_call_duration_minutes && channel.default_call_duration_minutes > 0) {
    return channel.default_call_duration_minutes;
  }

  // 3. プラン別デフォルト値を使用
  const planDefaults = {
    free: 15,
    basic: 15,
    "call-anser": 15,
  };

  const userPlan = user?.plan || "free";
  return planDefaults[userPlan] || 15;
}

/**
 * テスト用: Agoraシグナリング送信シミュレーション
 */
export async function simulateAgoraSignaling(callId, eventType) {
  const signals = {
    "3min_warning": {
      type: "CALL_ENDING_SOON",
      remaining_seconds: 180,
      message: "あと3分で通話が終了します",
    },
    "1min_warning": {
      type: "CALL_ENDING_IMMINENT",
      remaining_seconds: 60,
      message: "あと1分で通話が終了します",
    },
    "extend_prompt": {
      type: "EXTEND_PROMPT",
      remaining_seconds: 30,
      message: "この通話を延長しますか？",
    },
  };

  const signal = signals[eventType];
  if (!signal) {
    console.warn(`Unknown signal type: ${eventType}`);
    return null;
  }

  console.log(`🔔 [Agora Signal] Call ${callId}: ${JSON.stringify(signal)}`);
  return signal;
}

/**
 * テスト用: 課金ロジック検証（Basicプラン用）
 */
export function validateBillingMath(callDurationMin, planRate = 0.85) {
  const unitCount = Math.ceil(callDurationMin / 15);
  const coinPerUnit = 150; // Basic: 150コイン/15分

  const totalCoins = unitCount * coinPerUnit;
  const creatorCoins = Math.floor(totalCoins * planRate);
  const platformCoins = totalCoins - creatorCoins;

  return {
    call_duration_minutes: callDurationMin,
    billing_units: unitCount,
    total_coins: totalCoins,
    creator_coins: creatorCoins,
    platform_coins: platformCoins,
    creator_rate: (planRate * 100).toFixed(0) + "%",
    platform_rate: ((1 - planRate) * 100).toFixed(0) + "%",
  };
}

/**
 * テスト用: 通話フローシミュレーション
 */
export function simulateCallFlow(durationMin) {
  const flow = [];
  const timeline = [
    { sec: 0, event: "call_start", msg: "📞 通話開始" },
    { sec: Math.max(1, durationMin * 60 - 180), event: "3min_warning", msg: "🔔 Agora Signal: 3分前" },
    { sec: Math.max(1, durationMin * 60 - 60), event: "1min_warning", msg: "⚠️ Agora Signal: 1分前" },
    { sec: Math.max(1, durationMin * 60 - 30), event: "extend_prompt", msg: "💰 延長提案バナー表示" },
    { sec: durationMin * 60, event: "call_end", msg: "🏁 通話終了" },
  ];

  timeline.forEach(({ sec, event, msg }) => {
    flow.push({
      elapsed_seconds: sec,
      elapsed_time: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`,
      event,
      message: msg,
    });
  });

  return flow;
}

/**
 * テスト用: コンソール出力フォーマッター
 */
export function logTestResult(testName, result, passed) {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.group(`${status} ${testName}`);
  console.table(result);
  console.groupEnd();
}

export default {
  isInMillionairePeriod,
  getEffectiveDurationForTest,
  simulateAgoraSignaling,
  validateBillingMath,
  simulateCallFlow,
  logTestResult,
};