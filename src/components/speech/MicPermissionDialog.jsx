import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Mic, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * マイク許可のワンクッションUI
 * Props:
 *   open: boolean
 *   onAllow: (stream: MediaStream) => void  — 許可&取得成功時
 *   onDismiss: () => void                   — 「あとで」または失敗時
 */
export default function MicPermissionDialog({ open, onAllow, onDismiss }) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onAllow(stream);
      toast.success("マイクへのアクセスを許可しました");
    } catch (err) {
      toast.error("マイクへのアクセスが拒否されました。ブラウザの設定をご確認ください。");
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        {/* アイコン */}
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-7 h-7 text-primary" />
          </div>
        </div>

        <AlertDialogHeader className="text-center">
          <AlertDialogTitle>マイクへのアクセスを許可しますか？</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            チャンネル内の治安を守るため、音声解析による
            <span className="font-semibold text-foreground">NGワード検知</span>
            をオンにしますか？
            <br />
            <span className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              音声データ自体は保存されません
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-2 sm:flex-row">
          <AlertDialogCancel
            onClick={onDismiss}
            disabled={loading}
            className="flex-1"
          >
            あとで
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                確認中...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                許可する
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}