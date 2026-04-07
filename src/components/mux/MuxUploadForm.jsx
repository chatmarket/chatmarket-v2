import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['エンタメ', '音楽', 'ゲーム', '教育', 'スポーツ', 'テクノロジー', 'ニュース', 'その他'];

export default function MuxUploadForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('その他');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(500);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [channel, setChannel] = useState(null);
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) return;
      base44.auth.me().then(async (u) => {
        setUser(u);
        const channels = await base44.entities.Channel.filter({ owner_email: u.email });
        if (channels.length > 0) {
          setChannel(channels[0]);
        } else {
          // チャンネルがなければ自動作成
          const newChannel = await base44.entities.Channel.create({
            name: u.full_name + 'のチャンネル',
            owner_email: u.email,
          });
          setChannel(newChannel);
        }
      });
    });
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setProgress(0);

    // 1. バックエンドからMux Direct Upload URLを取得 + VideoエンティティをDB作成
    const res = await base44.functions.invoke('createMuxUploadUrl', {
      title,
      description,
      channel_id: channel?.id || '',
      channel_name: channel?.name || '',
      channel_avatar: channel?.avatar_url || '',
      price: isFree ? 0 : price,
      is_free: isFree,
      category,
    });
    const { uploadUrl } = res.data;

    if (!uploadUrl) {
      toast.error('アップロードURLの取得に失敗しました');
      setUploading(false);
      return;
    }

    // 2. Muxに直接PUTアップロード（XHRで進捗を取得）
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });

    setDone(true);
    setUploading(false);
    toast.success('アップロード完了！Muxで処理中です。処理完了後に動画が公開されます（数分かかる場合があります）');
    setTitle('');
    setDescription('');
    setFile(null);
    setCategory('その他');
    setIsFree(true);
    setPrice(500);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setDone(false), 3000);
    onSuccess?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" /> 動画をアップロード（Mux）
      </h2>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="space-y-1.5">
          <Label>動画タイトル *</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="動画のタイトルを入力"
            className="bg-secondary border-0"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>説明文</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="動画の説明（任意）"
            className="bg-secondary border-0 resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label>カテゴリー</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 bg-secondary/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>無料で公開</Label>
              <p className="text-xs text-muted-foreground mt-0.5">オフにすると有料動画になります</p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>
          {!isFree && (
            <div className="space-y-1.5">
              <Label>価格（円）</Label>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={e => setPrice(parseInt(e.target.value) || 0)}
                className="bg-secondary border-0"
                placeholder="500"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>動画ファイル *</Label>
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => setFile(e.target.files[0])}
            />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-primary">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">クリックして動画を選択</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI など対応</p>
              </div>
            )}
          </label>
        </div>

        {channel && (
          <p className="text-xs text-muted-foreground">チャンネル: <span className="text-foreground font-medium">{channel.name}</span></p>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muxにアップロード中...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={!file || !title || uploading}
          className="w-full gap-2"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> アップロード中... {progress}%</>
          ) : done ? (
            <><CheckCircle2 className="w-4 h-4" /> 完了！</>
          ) : (
            <><Upload className="w-4 h-4" /> Muxにアップロード</>
          )}
        </Button>
      </form>
    </div>
  );
}