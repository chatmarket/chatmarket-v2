import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import MetaHelmet from '@/components/layout/MetaHelmet';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function VideoModeration() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      base44.auth.me().then((u) => {
        setUser(u);
        setIsAdmin(u?.role === 'admin');
        setAuthLoading(false);
      });
    });
  }, []);

  const { data: pendingVideos = [], isLoading } = useQuery({
    queryKey: ['pending-videos'],
    queryFn: () => base44.entities.Video.filter({ moderation_status: 'pending' }, '-created_date'),
    enabled: isAdmin,
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ videoId, status }) =>
      base44.entities.Video.update(videoId, { moderation_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-videos'] });
    },
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">アクセス拒否</h1>
        <p className="text-muted-foreground">管理者のみがアクセス可能です</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <MetaHelmet page="admin" noindex={true} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
          動画審査
        </h1>
        <p className="text-muted-foreground mt-2">
          {pendingVideos.length} 件の審査待ち動画
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : pendingVideos.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border/50">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-muted-foreground">審査待ちの動画はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingVideos.map((video) => (
            <div
              key={video.id}
              className="bg-card rounded-xl border border-border/50 p-4 flex gap-4 items-start hover:border-border transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-4xl">🎥</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-1 truncate">{video.title}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{video.description}</p>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {video.channel_name}
                  </Badge>
                  {video.is_free ? (
                    <Badge className="bg-green-500/20 text-green-400 text-xs border-0">FREE</Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs border-0">
                      ¥{video.price?.toLocaleString()}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {video.category}
                  </Badge>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  アップロード: {format(new Date(video.created_date), 'yyyy/MM/dd HH:mm')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateVideoMutation.mutate({ videoId: video.id, status: 'approved' });
                    toast.success(`「${video.title}」を承認しました`);
                  }}
                  disabled={updateVideoMutation.isPending}
                  className="gap-1 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateVideoMutation.mutate({ videoId: video.id, status: 'rejected' });
                    toast.success(`「${video.title}」を却下しました`);
                  }}
                  disabled={updateVideoMutation.isPending}
                  className="gap-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  却下
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}