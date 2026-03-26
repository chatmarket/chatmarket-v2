import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, Film } from "lucide-react";
import { toast } from "sonner";

export default function ContentModeration() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState({});
  const [processing, setProcessing] = useState(null);

  const { data: pendingVideos = [], refetch } = useQuery({
    queryKey: ["admin-pending-videos"],
    queryFn: () => base44.entities.Video.filter({ moderation_status: "pending" }, "-created_date", 50),
  });

  const handleModerate = async (videoId, action) => {
    setProcessing(videoId + action);
    try {
      await base44.functions.invoke("moderateContent", {
        video_id: videoId,
        action,
        note: notes[videoId] || "",
      });
      toast.success(action === "approve" ? "承認しました" : "却下しました");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-all-videos"] });
    } catch (err) {
      toast.error("処理に失敗しました");
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-yellow-400" />
        <h3 className="font-bold text-lg">審査待ちコンテンツ</h3>
        <span className="text-xs bg-yellow-500/20 text-yellow-300 rounded-full px-2 py-0.5">
          {pendingVideos.length}件
        </span>
      </div>

      {pendingVideos.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-muted-foreground">審査待ちのコンテンツはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingVideos.map((video) => (
            <div key={video.id} className="bg-card border border-yellow-500/30 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-4">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-24 h-16 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-24 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold line-clamp-2">{video.title}</p>
                  <p className="text-xs text-muted-foreground">投稿者: {video.created_by}</p>
                  <p className="text-xs text-muted-foreground">チャンネル: {video.channel_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {video.is_free ? "無料" : `¥${(video.price || 0).toLocaleString()}`} ・
                    カテゴリ: {video.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    投稿日: {new Date(video.created_date).toLocaleString("ja-JP")}
                  </p>
                </div>
                {video.video_url && (
                  <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="shrink-0">プレビュー</Button>
                  </a>
                )}
              </div>

              {video.description && (
                <p className="text-sm text-muted-foreground bg-secondary rounded-lg p-3 line-clamp-3">
                  {video.description}
                </p>
              )}

              <Textarea
                placeholder="却下する場合はその理由を入力（任意）"
                value={notes[video.id] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [video.id]: e.target.value }))}
                className="bg-secondary border-0 resize-none text-sm"
                rows={2}
              />

              <div className="flex gap-3">
                <Button
                  onClick={() => handleModerate(video.id, "approve")}
                  disabled={!!processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {processing === video.id + "approve" ? "処理中..." : "承認"}
                </Button>
                <Button
                  onClick={() => handleModerate(video.id, "reject")}
                  disabled={!!processing}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {processing === video.id + "reject" ? "処理中..." : "却下"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}