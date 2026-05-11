/**
 * === StreamingSetupModal ===
 * ログイン後の初心者向けOBS/PRISM設定ガイド
 * ステップバイステップで配信準備を完了させる
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  Check, 
  X, 
  Download, 
  Smartphone, 
  Monitor, 
  Zap,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    id: "choose",
    title: "配信方法を選択",
    description: "PCで配信しますか？それともスマホですか？",
    type: "choice",
    options: [
      { 
        value: "obs", 
        label: "🖥️ PC配信（OBS Studio）", 
        desc: "高画質・フル機能配信",
        icon: Monitor
      },
      { 
        value: "prism", 
        label: "📱 スマホ配信（Prism Live）", 
        desc: "美顔フィルター・手軽配信",
        icon: Smartphone
      },
    ],
  },
  {
    id: "download",
    title: "アプリをダウンロード",
    description: "配信アプリをインストールしましょう",
    type: "download",
    links: {
      obs: "https://obsproject.com/download",
      prism_ios: "https://apps.apple.com/app/prism-live-studio/id1486655309",
      prism_android: "https://play.google.com/store/apps/details?id=com.prism.livestudio",
    },
  },
  {
    id: "setup",
    title: "配信設定を完了",
    description: "『配信スタート』ボタンでストリームキーを取得し、アプリに入力する",
    type: "action",
    action: "go-live",
  },
  {
    id: "start",
    title: "配信を開始！",
    description: "アプリの『配信開始』ボタンを押すと、Chat Market に『ON AIR』表示されます",
    type: "info",
  },
];

export default function StreamingSetupModal({ isOpen, onClose, hasChannel }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    handleNext();
  };

  const handleGoLive = () => {
    onClose();
    navigate("/go-live");
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* ヘッダー */}
            <div className="sticky top-0 bg-gradient-to-r from-primary/15 to-primary/5 border-b border-zinc-700 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-widest">🚀 配信スタートガイド</p>
                <h2 className="text-2xl font-black text-white mt-1">
                  {step.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-8 space-y-8">
              {/* ステップ進捗表示 */}
              <div className="flex gap-1">
                {STEPS.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      idx <= currentStep ? "bg-primary" : "bg-zinc-700"
                    }`}
                    animate={{ opacity: idx <= currentStep ? 1 : 0.4 }}
                  />
                ))}
              </div>

              {/* ステップ説明 */}
              <div>
                <p className="text-sm text-zinc-400 mb-2">
                  ステップ {currentStep + 1} / {STEPS.length}
                </p>
                <p className="text-base text-zinc-300 leading-relaxed">{step.description}</p>
              </div>

              {/* ステップ固有のコンテンツ */}
              <AnimatePresence mode="wait">
                {step.type === "choice" && (
                  <motion.div
                    key="choice"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3"
                  >
                    {step.options.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleMethodSelect(opt.value)}
                          className="w-full text-left p-4 rounded-xl border-2 border-zinc-700 hover:border-primary/60 bg-zinc-800/60 hover:bg-primary/5 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-black text-white text-sm">{opt.label}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{opt.desc}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {step.type === "download" && (
                  <motion.div
                    key="download"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3"
                  >
                    {selectedMethod === "obs" && (
                      <a
                        href={step.links.obs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 hover:border-primary/60 transition-all group">
                          <div className="flex items-center gap-3">
                            <Download className="w-5 h-5 text-primary" />
                            <div className="text-left">
                              <p className="font-black text-white text-sm">OBS Studio をダウンロード</p>
                              <p className="text-xs text-zinc-400 mt-0.5">obsproject.com（無料）</p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                        </button>
                      </a>
                    )}

                    {selectedMethod === "prism" && (
                      <div className="space-y-2">
                        <a
                          href={step.links.prism_ios}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-500/10 border border-blue-500/40 hover:border-blue-500/60 transition-all group">
                            <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-blue-400" />
                              <div className="text-left">
                                <p className="font-black text-white text-sm">Prism Live Studio (iOS)</p>
                                <p className="text-xs text-zinc-400 mt-0.5">App Store</p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </a>
                        <a
                          href={step.links.prism_android}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/40 hover:border-green-500/60 transition-all group">
                            <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-green-400" />
                              <div className="text-left">
                                <p className="font-black text-white text-sm">Prism Live Studio (Android)</p>
                                <p className="text-xs text-zinc-400 mt-0.5">Google Play</p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </a>
                      </div>
                    )}

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-4">
                      <p className="text-xs text-blue-300 font-semibold">💡 Tip: インストール後『次へ』をタップしてください</p>
                    </div>
                  </motion.div>
                )}

                {step.type === "action" && (
                  <motion.div
                    key="action"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/40 rounded-xl p-6 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white text-sm">配信枠を作成</p>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          下のボタンから『配信スタート』画面へ移動。
                          <br />
                          タイトルと価格を設定すると、ストリームキーが自動生成されます。
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step.type === "info" && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/40 rounded-xl p-6 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white text-sm">準備完了！</p>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          ストリームキーはアカウント専用で永久有効です。<br />
                          毎回同じ設定で何度でも配信できます。
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <a
                        href="/streaming-manual"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold underline underline-offset-2"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        配信マニュアル（詳しい手順）
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* フッターボタン */}
            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-700 px-8 py-4 flex gap-3">
              {currentStep > 0 && step.type !== "choice" && (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  variant="outline"
                  className="flex-1"
                >
                  ← 戻る
                </Button>
              )}
              {step.type === "action" ? (
                <Button
                  onClick={handleGoLive}
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                >
                  <Zap className="w-4 h-4" />
                  配信スタート画面へ
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                >
                  {isLastStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      完了
                    </>
                  ) : (
                    <>
                      次へ
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}