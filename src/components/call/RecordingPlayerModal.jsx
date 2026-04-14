import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Play, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function RecordingPlayerModal({ call, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // 署名付きURLを取得
  const handleLoadRecording = async () => {
    if (signedUrl) return; // 既に読み込み済み

    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateSignedCloudFrontUrl', {
        s3_key: call.recording_s3_key,
        call_id: call.id,
        expires_in_seconds: 86400, // 24時間有効
      });

      if (res.data?.signed_url) {
        setSignedUrl(res.data.signed_url);
        toast.success('アーカイブをロードしました');
      }
    } catch (err) {
      console.error('Failed to generate signed URL:', err);
      toast.error('アーカイブの読み込みに失敗しました');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!signedUrl) {
      await handleLoadRecording();
      return;
    }

    try {
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `call_${call.id}_${format(new Date(call.created_date), 'yyyyMMdd_HHmm')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('ダウンロードを開始しました');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('ダウンロードに失敗しました');
    }
  };

  return (
    <Dialog open={!!call} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" /> 通話アーカイブ再生
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* ビデオプレイヤー */}
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            {signedUrl ? (
              <video
                src={signedUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/60">
                <Play className="w-12 h-12 opacity-30" />
                <p className="text-sm">クリックして再生</p>
              </div>
            )}
          </div>

          {/* 詳細情報 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">相手</p>
              <p className="font-semibold">{call.partner_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">通話日時</p>
              <p className="font-semibold">{format(new Date(call.created_date), "yyyy/MM/dd HH:mm")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">通話時間</p>
              <p className="font-semibold">{call.actual_duration_minutes}分</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">録画長</p>
              <p className="font-semibold">{Math.round(call.recording_duration_seconds / 60)}分</p>
            </div>
          </div>

          {/* セキュリティ情報 */}
          <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p>🔐 <span className="text-primary font-semibold">セキュアな配信</span></p>
            <p>• このアーカイブは暗号化された署名付きURLでのみ配信されます</p>
            <p>• 有効期限: 24時間</p>
            <p>• アクセス可能なのは通話参加者のみ</p>
          </div>

          {/* アクション */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              閉じる
            </Button>
            {!signedUrl ? (
              <Button
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                onClick={handleLoadRecording}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> 再生
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" /> ダウンロード
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}