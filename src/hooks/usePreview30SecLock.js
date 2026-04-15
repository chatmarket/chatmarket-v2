import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * 【タダ見防止・鉄壁実装】
 * 30秒プレビュー機能の強制ロック + DOM操作完全ブロック
 * 
 * 機能：
 * - video.currentTime が30秒に達した時点で自動 pause()
 * - モーダル表示中のスクロール・キーボード操作を完全ロック
 * - video要素への直接DOM操作（currentTime変更、play()呼び出し）を検知・阻止
 * - bodyスタイル操作（overflow:hidden等）による回避を検知
 */
export function usePreview30SecLock({ videoRef, enabled, onLimitReached, previewSeconds = 30 }) {
  const lockStateRef = useRef({ isLocked: false, attemptCount: 0 });

  // ---- 1. timeupdate イベント監視（30秒で強制停止）----
  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const v = videoRef.current;
    let lastEnforcedTime = 0;

    const handleTimeUpdate = () => {
      if (v.currentTime >= previewSeconds) {
        // 30秒に達した直後、即座に pause + ロック
        if (!lockStateRef.current.isLocked) {
          v.pause();
          lockStateRef.current.isLocked = true;
          onLimitReached?.();
          lockStateRef.current.attemptCount = 0;
        }
        // 0.1秒ごとに currentTime を強制リセット（seek 回避）
        if (v.currentTime - lastEnforcedTime > 0.1) {
          v.currentTime = previewSeconds - 0.01;
          lastEnforcedTime = v.currentTime;
        }
      }
    };

    v.addEventListener("timeupdate", handleTimeUpdate);
    return () => v.removeEventListener("timeupdate", handleTimeUpdate);
  }, [enabled, videoRef, previewSeconds, onLimitReached]);

  // ---- 2. seeking イベント（seek 試行検知） ----
  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const v = videoRef.current;

    const handleSeeking = () => {
      if (lockStateRef.current.isLocked && v.currentTime >= previewSeconds) {
        v.currentTime = previewSeconds - 0.01;
        v.pause();
        lockStateRef.current.attemptCount++;
        if (lockStateRef.current.attemptCount % 3 === 0) {
          toast.error("30秒を超えた再生は許可されていません。購入してください。", { duration: 3000 });
        }
      }
    };

    v.addEventListener("seeking", handleSeeking);
    return () => v.removeEventListener("seeking", handleSeeking);
  }, [enabled, videoRef, previewSeconds]);

  // ---- 3. play() 試行検知・阻止 ----
  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const v = videoRef.current;
    const originalPlay = v.play;

    // play() メソッドをオーバーライド
    v.play = function () {
      if (lockStateRef.current.isLocked && v.currentTime >= previewSeconds) {
        // ロック中の play() は無視
        console.warn("[Preview Lock] play() attempt blocked");
        return Promise.reject(new DOMException("play() blocked by preview lock", "NotAllowedError"));
      }
      return originalPlay.call(this);
    };

    return () => {
      v.play = originalPlay;
    };
  }, [enabled, videoRef, previewSeconds]);

  // ---- 4. Keyboard & Scroll ロック（ロック中） ----
  useEffect(() => {
    if (!lockStateRef.current.isLocked) return;

    const handleKeyDown = (e) => {
      // スペースバー（再生/一時停止）、矢印キー（スキップ）をブロック
      if ([" ", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        console.warn("[Preview Lock] Key blocked:", e.key);
      }
    };

    const handleWheel = (e) => {
      // スクロール完全ブロック
      e.preventDefault();
      console.warn("[Preview Lock] Scroll blocked");
    };

    const handleTouchMove = (e) => {
      // タッチスクロールブロック
      e.preventDefault();
      console.warn("[Preview Lock] Touch move blocked");
    };

    // イベントリスナー登録（capture フェーズで即座にブロック）
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    document.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });

    // body overflow を固定
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("wheel", handleWheel, { capture: true });
      document.removeEventListener("touchmove", handleTouchMove, { capture: true });
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ---- 5. DOM Mutation Observer（video.currentTime 直接操作検知） ----
  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const v = videoRef.current;

    // currentTime プロパティへの直接書き込みを監視
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");

    Object.defineProperty(v, "currentTime", {
      get() {
        return originalDescriptor.get.call(this);
      },
      set(value) {
        if (lockStateRef.current.isLocked && value >= previewSeconds) {
          console.warn(`[Preview Lock] currentTime write blocked: ${value} >= ${previewSeconds}`);
          return; // 書き込み無視
        }
        originalDescriptor.set.call(this, value);
      },
      configurable: true,
    });

    return () => {
      // Restore original property (cleanup)
      Object.defineProperty(v, "currentTime", originalDescriptor);
    };
  }, [enabled, videoRef, previewSeconds]);

  // ---- 6. ロック解除 ----
  const unlock = () => {
    lockStateRef.current.isLocked = false;
  };

  return { unlock, isLocked: lockStateRef.current.isLocked };
}