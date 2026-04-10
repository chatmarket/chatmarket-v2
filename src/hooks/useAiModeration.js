import { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * AI-based chat moderation hook.
 * - checkMessage(text): returns true if message is SAFE to post
 * - filterMessages(messages): returns messages with AI-flagged ones removed
 */
export function useAiModeration(ngWords = []) {
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const checkedIds = useRef(new Set());
  const pendingChecks = useRef(new Set());

  // Check a single message text before sending. Returns true = safe.
  const checkMessage = useCallback(async (text) => {
    // Fast local NG word check first
    const lower = text.toLowerCase();
    if (ngWords.some((w) => w && lower.includes(w.toLowerCase()))) return false;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `あなたはチャットモデレーターです。以下のメッセージが攻撃的・ハラスメント・スパム・差別的・性的に不適切・誹謗中傷であるかを判定してください。
メッセージ: "${text}"
返答は必ずJSONのみ: {"safe": true/false, "reason": "理由（日本語）"}`,
        response_json_schema: {
          type: "object",
          properties: {
            safe: { type: "boolean" },
            reason: { type: "string" },
          },
        },
      });
      return res?.safe !== false;
    } catch {
      return true; // AI失敗時は通過させる
    }
  }, [ngWords]);

  // Scan new incoming messages and hide flagged ones
  const scanMessages = useCallback(async (messages) => {
    const unchecked = messages.filter(
      (m) => m.id && !checkedIds.current.has(m.id) && !pendingChecks.current.has(m.id)
    );
    if (unchecked.length === 0) return;

    // Mark as pending
    unchecked.forEach((m) => pendingChecks.current.add(m.id));

    await Promise.all(
      unchecked.map(async (m) => {
        checkedIds.current.add(m.id);
        pendingChecks.current.delete(m.id);

        const content = m.content || m.message || "";
        if (!content) return;

        // Fast NG word check
        const lower = content.toLowerCase();
        if (ngWords.some((w) => w && lower.includes(w.toLowerCase()))) {
          setHiddenIds((prev) => new Set([...prev, m.id]));
          return;
        }

        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `チャットモデレーション: 以下のメッセージが攻撃的・ハラスメント・スパム・差別的・性的に不適切・誹謗中傷かどうか判定。
メッセージ: "${content.slice(0, 200)}"
JSON返答のみ: {"safe": true/false}`,
            response_json_schema: {
              type: "object",
              properties: { safe: { type: "boolean" } },
            },
          });
          if (res?.safe === false) {
            setHiddenIds((prev) => new Set([...prev, m.id]));
          }
        } catch {
          // AI失敗時はスキップ
        }
      })
    );
  }, [ngWords]);

  const filterMessages = useCallback(
    (messages) => messages.filter((m) => !hiddenIds.has(m.id)),
    [hiddenIds]
  );

  return { checkMessage, scanMessages, filterMessages, hiddenIds };
}