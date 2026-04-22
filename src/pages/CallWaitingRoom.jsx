import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CallWaitingWidget from "../components/dashboard/CallWaitingWidget";
import AcceptedCallsList from "../components/dashboard/AcceptedCallsList";
import { PhoneCall, Info } from "lucide-react";

export default function CallWaitingRoom() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["waiting-room-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <PhoneCall className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black">通話待機画面</h1>
        <p className="text-sm text-muted-foreground">
          この画面を開いたまま待機してください。申込が届くと着信ポップアップが表示されます。
        </p>
      </div>

      {/* 案内 */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3 text-sm">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-muted-foreground">
          <p>① 下の <span className="font-bold text-primary">「待機開始」</span> ボタンを押す</p>
          <p>② この画面を開いたまま待つ（他のタブは開いてOK）</p>
          <p>③ 申込が来ると全画面着信ポップアップが自動で表示される</p>
          <p>④ 「承諾」を押すと即座に通話ルームへ移動</p>
        </div>
      </div>

      {/* 待機ウィジェット */}
      <CallWaitingWidget user={user} channel={channel} />

      {/* 承認済み通話入室ボタン */}
      <AcceptedCallsList userEmail={user?.email} />
    </div>
  );
}