import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";

export default function TestUserCreationForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error("メールアドレスと名前を入力してください");
      return;
    }

    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), "user");
      toast.success(`${email} をテストユーザーとして招待しました`);
      setEmail("");
      setFullName("");
    } catch (err) {
      toast.error(`招待エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <h3 className="font-bold text-blue-300">テストユーザー作成</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold mb-1 block text-blue-200">メールアドレス</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="bg-blue-950/30 border-blue-500/40"
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block text-blue-200">ユーザー名</label>
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="テストユーザー"
            className="bg-blue-950/30 border-blue-500/40"
            disabled={loading}
          />
        </div>

        <Button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          {loading ? "招待中..." : "テストユーザーを招待"}
        </Button>
      </div>

      <p className="text-xs text-blue-200/60">
        招待メールが送信され、ユーザーが登録できるようになります。
      </p>
    </div>
  );
}