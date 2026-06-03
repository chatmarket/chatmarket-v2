/**
 * ClassRoomCreate — クラス配信ルーム作成ページ
 * 講師がルームを作成して招待コードを発行する
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Copy, Video, BookOpen } from "lucide-react";

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function ClassRoomCreate() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (!authed) { base44.auth.redirectToLogin(); return; }
      base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const handleCreate = async () => {
    if (!roomName.trim()) { toast.error("クラス名を入力してください"); return; }
    if (!user) return;
    setCreating(true);

    try {
      const inviteCode = generateInviteCode();
      const room = await base44.entities.ClassRoom.create({
        room_name: roomName.trim(),
        description: description.trim(),
        host_user_id: user.id,
        host_email: user.email,
        host_name: user.full_name || user.email,
        status: "waiting",
        max_participants: 10,
        current_participants_count: 0,
        is_muted_all: false,
        muted_participant_emails: [],
        participants: [],
        invite_code: inviteCode,
      });
      setCreatedRoom({ ...room, invite_code: inviteCode });
      toast.success("クラスルームを作成しました！");
    } catch (e) {
      toast.error("ルームの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInvite = () => {
    if (!createdRoom) return;
    const url = `${window.location.origin}/classroom/${createdRoom.id}?code=${createdRoom.invite_code}`;
    navigator.clipboard.writeText(url);
    toast.success("招待リンクをコピーしました");
  };

  const handleStart = () => {
    navigate(`/classroom/${createdRoom.id}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">クラス配信を作成</h1>
          <p className="text-muted-foreground text-sm">1対9のグループビデオ授業</p>
        </div>

        {!createdRoom ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <Label>クラス名 *</Label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="例: 英語基礎クラス・占いレッスン"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>クラスの説明（任意）</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="クラスの内容や注意事項を書いてください..."
                rows={3}
                maxLength={300}
              />
            </div>

            {/* スペック表示 */}
            <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-foreground">クラス配信スペック</p>
              <div className="space-y-1 text-muted-foreground text-xs">
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>講師映像: 720p HD / 最大1.5Mbps（高画質）</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>生徒映像: 360p / 300kbps（低帯域最適化）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary text-xs">👥</span>
                  <span>最大参加者: 講師1名 + 生徒9名 = 計10名</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || !roomName.trim()}
              className="w-full gap-2"
            >
              {creating ? "作成中..." : "クラスルームを作成"}
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-primary font-bold text-lg">✅ ルーム作成完了！</p>
              <p className="text-muted-foreground text-sm">{createdRoom.room_name}</p>
            </div>

            {/* 招待コード */}
            <div className="bg-secondary rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-bold">招待コード</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-black text-foreground tracking-widest flex-1">
                  {createdRoom.invite_code}
                </p>
              </div>
            </div>

            {/* 招待リンク */}
            <div className="bg-secondary rounded-xl p-3 space-y-2">
              <p className="text-xs text-muted-foreground font-bold">招待リンク（生徒に共有）</p>
              <p className="text-xs text-foreground break-all">
                {window.location.origin}/classroom/{createdRoom.id}?code={createdRoom.invite_code}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyInvite} className="flex-1 gap-2">
                <Copy className="w-4 h-4" /> 招待リンクをコピー
              </Button>
              <Button onClick={handleStart} className="flex-1 gap-2">
                <Video className="w-4 h-4" /> クラスを開始
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}