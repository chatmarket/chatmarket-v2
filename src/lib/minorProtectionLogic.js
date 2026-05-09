/**
 * 未成年保護ロジック
 * - 家庭教師カテゴリの生徒が未成年の場合、保護者同意確認を必須化
 * - NGキーワード検知
 * - 年齢確認ルール
 */

export const TUTOR_MIN_AGE = 18;

export const MINOR_PROTECTION_KEYWORDS = [
  "援助交際",
  "援交",
  "売春",
  "児童虐待",
  "いじめ",
  "体罰",
  "人身売買",
  "児童労働",
  "搾取",
  "脅迫",
  "強要",
];

/**
 * 保護者同意確認の必要性を判定
 * @param {string} category - カテゴリ（"tutor" など）
 * @param {number} studentAge - 生徒の年齢
 * @returns {boolean} 保護者同意が必要かどうか
 */
export function requiresParentalConsent(category, studentAge) {
  if (category === "tutor" && studentAge < TUTOR_MIN_AGE) {
    return true;
  }
  return false;
}

/**
 * 未成年者関連の危険キーワードを検知
 * @param {string} text - チェック対象テキスト
 * @returns {string|null} マッチしたキーワード、なければnull
 */
export function detectMinorProtectionKeyword(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const keyword of MINOR_PROTECTION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

/**
 * 保護者の同意情報を構築
 * @param {string} studentEmail - 生徒メール
 * @param {number} studentAge - 生徒年齢
 * @param {string} parentName - 保護者名
 * @param {string} parentEmail - 保護者メール
 * @returns {object} 保護者同意記録
 */
export function createParentalConsentRecord(studentEmail, studentAge, parentName, parentEmail) {
  return {
    student_email: studentEmail,
    student_age: studentAge,
    parent_name: parentName,
    parent_email: parentEmail,
    consent_given: false,
    consent_timestamp: null,
    consent_ip: null,
  };
}

/**
 * 保護者同意を確認済みにマーク
 * @param {object} consentRecord - 同意記録
 * @param {string} ip - 同意時のIP
 * @returns {object} 更新された同意記録
 */
export function markParentalConsentGiven(consentRecord, ip = "") {
  return {
    ...consentRecord,
    consent_given: true,
    consent_timestamp: new Date().toISOString(),
    consent_ip: ip,
  };
}