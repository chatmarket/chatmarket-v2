/**
 * PwaInstallPrompt — スマートタイミング PWA インストール促進
 *
 * 表示ロジック（インテルのような知的判断）:
 * - 初回訪問から 45 秒後（十分コンテンツを見た後）
 * - すでにスタンドアローン（= インストール済み）なら表示しない
 * - ユーザーが「後で」を押したら 7 日間スヌーズ
 * - iOS / Android / Desktop それぞれ最適化した UI
 */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, Plus, Smartphone, Monitor } from "lucide-react";

const STORAGE_KEY = "cm_pwa_snooze";
const SNOOZE_DAYS = 7;
const TRIGGER_DELAY_MS = 45000; // 45秒後

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
function isSnoozed() {
  const ts = localStorage.getItem(STORAGE_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

export default function PwaInstallPrompt({ forceShow = false }) {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState("android"); // "ios" | "android" | "desktop"
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // beforeinstallprompt イベントをキャプチャ（Android / Desktop Chrome）
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // プラットフォーム判定
    if (isIos()) setPlatform("ios");
    else if (isAndroid()) setPlatform("android");
    else setPlatform("desktop");

    // 表示判定
    const shouldShow = () => {
      if (isStandalone()) return false;
      if (isSnoozed() && !forceShow) return false;
      return true;
    };

    if (forceShow) {
      setShow(true);
      return;
    }

    timerRef.current = setTimeout(() => {
      if (shouldShow()) setShow(true);
    }, TRIGGER_DELAY_MS);

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [forceShow]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setInstalling(false);
      if (outcome === "accepted") {
        handleDismiss(true);
      }
    }
    // iOS の場合は手順を表示するだけ（ブラウザの prompt API なし）
  };

  const handleDismiss = (permanent = false) => {
    setShow(false);
    if (!permanent) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } else {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pwa-prompt"
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-20 left-3 right-3 md:left-auto md:right-5 md:bottom-6 md:w-96 z-[60]"
        >
          {/* カード本体 */}
          <div
            className="relative overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: "linear-gradient(145deg, #0d1a12 0%, #0a1628 50%, #0d1a12 100%)",
              border: "1px solid rgba(0,255,157,0.25)",
              boxShadow: "0 0 60px rgba(0,255,157,0.15), 0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* 装飾グロー */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(0,255,157,0.2) 0%, transparent 70%)", filter: "blur(20px)" }}
            />

            {/* 上部ライン */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,157,0.6), transparent)" }}
            />

            <div className="relative z-10 p-5">
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* アプリアイコン */}
                  <div
                    className="w-12 h-12 rounded-2xl overflow-hidden shrink-0"
                    style={{ boxShadow: "0 0 16px rgba(0,255,157,0.3)" }}
                  >
                    <img
                      src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png"
                      alt="ChatMarket"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p
                      className="font-black text-base leading-tight"
                      style={{ color: "#fff" }}
                    >
                      ChatMarket
                    </p>
                    <p className="text-xs" style={{ color: "rgba(0,255,157,0.7)" }}>
                      ホーム画面に追加
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* メッセージ */}
              <div className="mb-4 space-y-1">
                <p className="text-sm font-bold text-white leading-snug">
                  アプリのように使えます ⚡
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  ホーム画面に追加すると、ライブ通知・即アクセス・オフライン対応が有効になります。
                </p>
              </div>

              {/* プラットフォーム別手順 */}
              {platform === "ios" && (
                <div
                  className="mb-4 rounded-xl p-3 space-y-2"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Safari での手順</p>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Share className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Safari の <strong className="text-white/80">共有</strong> ボタンをタップ</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Plus className="w-4 h-4 text-green-400 shrink-0" />
                    <span><strong className="text-white/80">「ホーム画面に追加」</strong> を選択</span>
                  </div>
                </div>
              )}

              {/* CTA ボタン */}
              <div className="flex gap-2">
                {platform !== "ios" ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleInstall}
                    disabled={installing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-black transition-all disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #00ff9d, #00c97a)",
                      boxShadow: "0 0 20px rgba(0,255,157,0.4)",
                    }}
                  >
                    {platform === "desktop"
                      ? <Monitor className="w-4 h-4" />
                      : <Smartphone className="w-4 h-4" />
                    }
                    {installing ? "インストール中..." : "今すぐ追加"}
                  </motion.button>
                ) : (
                  <button
                    onClick={() => handleDismiss(false)}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm text-white/70 border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    わかった
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(false)}
                  className="px-4 py-3 rounded-2xl font-semibold text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}
                >
                  後で
                </button>
              </div>

              {/* 省スペース説明 */}
              <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                インストールは無料。ブラウザと同じデータを使います。
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}