import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCircle, MapPin } from "lucide-react";
import { toast } from "sonner";

/**
 * 登録後に必須プロフィール（ニックネーム・地域）を入力させるモーダル
 * Props:
 *   user     - 現在のユーザーオブジェクト
 *   onComplete - 保存完了後に呼ばれるコールバック
 */
export default function RequiredProfileModal({ user, onComplete }) {
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [region, setRegion] = useState(user?.region || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error("ニックネームを入力してください");
      return;
    }
    if (!region.trim()) {
      toast.error("地域を入力してください");
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({ nickname: nickname.trim(), region: region.trim(), profile_completed: true });
    toast.success("プロフィールを設定しました！");
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-black">プロフィールを設定してください</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ご利用の前に、ニックネームと地域の設定が必要です。<br />
            これらは他のユーザーに公開されます。
          </p>
        </div>

        {/* フォーム */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <UserCircle className="w-4 h-4 text-primary" />
              ニックネーム <span className="text-destructive text-xs font-bold">*必須</span>
            </Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：たろう、ゆか先生、Hana"
              className="bg-secondary border-0"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">他のユーザーに表示される名前です（最大30文字）</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              地域 <span className="text-destructive text-xs font-bold">*必須</span>
            </Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="例：東京、大阪、全国対応、海外"
              className="bg-secondary border-0"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">活動エリアや対応地域を入力してください</p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !nickname.trim() || !region.trim()}
          className="w-full gap-2 bg-primary hover:bg-primary/90 h-11 text-base font-bold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          設定して始める
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          後から設定 &gt; プロフィールで変更できます
        </p>
      </div>
    </div>
  );
}