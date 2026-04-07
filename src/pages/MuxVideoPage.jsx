import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Loader2, CheckCircle2, AlertCircle, Clock, Film } from 'lucide-react';
import { toast } from 'sonner';
import MuxVideoPlayer from '../components/mux/MuxVideoPlayer';
import MuxUploadForm from '../components/mux/MuxUploadForm';

export default function MuxVideoPage() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['mux-videos'],
    queryFn: () => base44.entities.MuxVideo.list('-created_date', 50),
    refetchInterval: 5000,
  });

  const statusConfig = {
    waiting: { label: 'アップロード待ち', color: 'secondary', icon: Clock },
    preparing: { label: '処理中', color: 'default', icon: Loader2 },
    ready: { label: '視聴可能', color: 'default', icon: CheckCircle2 },
    errored: { label: 'エラー', color: 'destructive', icon: AlertCircle },
  };

  const readyVideos = videos.filter(v => v.status === 'ready');
  const processingVideos = videos.filter(v => v.status !== 'ready');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Film className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Mux動画プラットフォーム</h1>
      </div>

      {/* Upload Form */}
      <MuxUploadForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ['mux-videos'] })} />

      {/* Video Player */}
      {selectedVideo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{selectedVideo.title}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedVideo(null)}>✕ 閉じる</Button>
          </div>
          <MuxVideoPlayer playbackId={selectedVideo.mux_playback_id} />
          {selectedVideo.description && (
            <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
          )}
        </div>
      )}

      {/* Video List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">動画一覧</h2>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> 読み込み中...
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>動画がまだありません。上のフォームからアップロードしてください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => {
              const cfg = statusConfig[video.status] || statusConfig.waiting;
              const Icon = cfg.icon;
              const isReady = video.status === 'ready';

              return (
                <div
                  key={video.id}
                  className={`bg-card rounded-2xl border border-border/50 overflow-hidden transition-all ${isReady ? 'hover:border-primary/40 cursor-pointer' : 'opacity-70'}`}
                  onClick={() => isReady && setSelectedVideo(video)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-secondary flex items-center justify-center relative overflow-hidden">
                    {isReady && video.mux_playback_id ? (
                      <>
                        <img
                          src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="w-12 h-12 text-white" fill="white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Icon className={`w-8 h-8 ${video.status === 'preparing' ? 'animate-spin' : ''}`} />
                        <span className="text-xs">{cfg.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                      <Badge variant={cfg.color} className="shrink-0 text-xs">
                        {cfg.label}
                      </Badge>
                    </div>
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                    )}
                    {video.duration && (
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}