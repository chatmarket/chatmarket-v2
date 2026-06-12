import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const GENRES = ["恋愛・婚活", "仕事・転職", "人間関係", "家族・育児", "健康・体調", "お金・投資", "将来・進路", "その他"];

export default function ChatReadingApplyModal({ menu, channel, user, onClose }) {
  const [form, setForm] = useState({
    buyer_name: user?.full_name || "",
    consultation_genre: GENRES[0],
    consultation_text: "",
    birth_info: "",
    partner_info: "",
    additional_info: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.consultation_text.trim()) {
      toast.error("相談内容を入力してください");
      return;
    }
    if (!form.buyer_name.trim()) {
      toast.error("お名前（ニックネーム可）を入力してください");
      return;
    }
    if (!user) { base44.auth.redirectToLogin(); return; }

    setLoading(true);
    try {
      const res = await base44.functions.invoke("createChatReadingCheckout", {
        menu_id: menu.id,
        buyer_name: form.buyer_name,
        consultation_genre: form.consultation_genre,
        consultation_text: form.consultation_text,
        birth_info: form.birth_info,
        partner_info: form.partner_info,
        additional_info: form.additional_info,
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error(res.data?.error || "決済画面を開けませんでした");
      }
    } catch (e) {
      toast.error(e.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-card border border-purple-500/40 rounded-2xl w-full max-w-lg shadow-2xl" style={{ boxShadow: "0 0 40px rgba(168,85,247,0.2)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <p className="font-black text-sm">チャット鑑定を申し込む</p>
              <p className="text-xs text-muted-foreground">{channel?.name} — {menu.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 価格・返信目安 */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-400 font-bold">料金</p>
              <p className="text-xl font-black text-white">¥{menu.price_yen?.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-400 font-bold">返信目安</p>
              <p className="text-sm font-bold">{menu.estimated_reply_hours || 24}時間以内</p>
            </div>
          </div>

          {/* 注意文 */}
          <div className="flex items-start gap-2 bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p>入力いただいた内容は、鑑定対応のために占い師へ共有されます。住所・電話番号などの個人情報は入力しないでください。</p>
          </div>

          {/* お名前 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">お名前 / ニックネーム <span className="text-destructive">*</span></label>
            <input
              value={form.buyer_name}
              onChange={e => setForm({ ...form, buyer_name: e.target.value })}
              placeholder="例：さくら（ニックネーム可）"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>

          {/* 相談ジャンル */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">相談ジャンル <span className="text-destructive">*</span></label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, consultation_genre: g })}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    form.consultation_genre === g
                      ? "bg-purple-500 border-purple-500 text-white"
                      : "border-border text-muted-foreground hover:border-purple-400"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 相談内容 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">相談内容 <span className="text-destructive">*</span></label>
            <textarea
              value={form.consultation_text}
              onChange={e => setForm({ ...form, consultation_text: e.target.value.slice(0, 2000) })}
              placeholder="占い師に相談したいことを具体的に書いてください。状況や背景なども含めて書くと、より丁寧な鑑定が受けられます。"
              rows={5}
              className="w-full resize-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
            <p className="text-[10px] text-right text-muted-foreground">{form.consultation_text.length}/2000</p>
          </div>

          {/* 生年月日（任意） */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">生年月日 <span className="text-muted-foreground font-normal">（任意）</span></label>
            <input
              value={form.birth_info}
              onChange={e => setForm({ ...form, birth_info: e.target.value })}
              placeholder="例：1990年5月3日"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>

          {/* 相手の情報（任意） */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">相手の情報 <span className="text-muted-foreground font-normal">（任意）</span></label>
            <input
              value={form.partner_info}
              onChange={e => setForm({ ...form, partner_info: e.target.value })}
              placeholder="例：30代男性、AB型"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>

          {/* 補足（任意） */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">補足情報 <span className="text-muted-foreground font-normal">（任意）</span></label>
            <textarea
              value={form.additional_info}
              onChange={e => setForm({ ...form, additional_info: e.target.value.slice(0, 500) })}
              placeholder="その他、伝えたいことがあれば"
              rows={2}
              className="w-full resize-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/50 space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.consultation_text.trim() || !form.buyer_name.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black h-12 gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "決済画面を準備中..." : `¥${menu.price_yen?.toLocaleString()} で決済へ進む`}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">Stripeの安全な決済ページに移動します</p>
        </div>
      </div>
    </div>
  );
}