// Digital Cheki feature is frozen / hidden for now.
// This page is preserved for future use but shows a "coming soon" message.
// To re-enable: restore the full implementation from git history and remove this placeholder.

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export default function ChekiCaptureEditor() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto border border-pink-500/20">
          <Camera className="w-10 h-10 text-pink-400/40" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black text-foreground">デジタルチェキ</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            デジタルチェキ機能は現在準備中です。<br />
            公開までしばらくお待ちください。
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
          戻る
        </Button>
      </div>
    </div>
  );
}