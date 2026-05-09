import React, { useState, useEffect } from "react";
import { Radio, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreatorModeToggle() {
  const [creatorMode, setCreatorMode] = useState(false);
  const [language, setLanguage] = useState("ja");

  // 初期化: localStorage から復元 + 言語検出
  useEffect(() => {
    const saved = localStorage.getItem("creatorMode") === "true";
    setCreatorMode(saved);

    // 簡易的な言語検出（ブラウザ言語またはlocaleから）
    const lang = navigator.language || navigator.userLanguage;
    setLanguage(lang.startsWith("ja") ? "ja" : "en");
  }, []);

  // 状態変更時に localStorage に保存
  const handleToggle = () => {
    const newMode = !creatorMode;
    setCreatorMode(newMode);
    localStorage.setItem("creatorMode", String(newMode));
  };

  const isJapanese = language === "ja";
  const labelText = isJapanese
    ? creatorMode ? "配信用" : "視聴用"
    : creatorMode ? "Creator" : "Discover";

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border-2 font-bold text-sm transition-all",
        creatorMode
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-secondary text-muted-foreground hover:border-secondary/80"
      )}
      title={isJapanese ? "モードを切り替え" : "Toggle mode"}
    >
      {creatorMode ? (
        <Radio className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
      <span>{labelText}</span>
    </button>
  );
}