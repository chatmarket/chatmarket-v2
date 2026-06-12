/**
 * ChatReadingMenuPanel
 * 占い師のMyChannel / チャンネル設定でチャット鑑定メニューを管理するパネル
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { title: "", description: "", price_yen: 3000, estimated_reply_hours: 24, is_active: true };

function MenuForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("メニュータイトルを入力してください"); return; }
    if (!form.price_yen || form.price_yen < 500 || form.price_yen > 50000) {
      toast.error("価格は500〜50,000円の範囲で入力してください");
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="bg-purple-900/20 border border-purple-500/40 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-black text-purple-300">
        {initial?.id ? "メニューを編集" : "新しいメニューを作成"}
      </p>
      <div className="space-y-1.5">
        <label className="text-xs font-bold">メニュータイトル *</label>
        <input
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="例：恋愛相談チャット鑑定"
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold">説明</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value.slice(0, 500) })}
          placeholder="どんな相談に向いているか、鑑定スタイルなどを書いてください"
          rows={3}
          className="w-full resize-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="text-[10px] text-right text-muted-foreground">{(form.description || "").length}/500</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold">価格（円）*</label>
          <input
            type="number"
            min={500}
            max={50000}
            step={100}
            value={form.price_yen}
            onChange={e => setForm({ ...form, price_yen: parseInt(e.target.value) || 0 })}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <p className="text-[10px] text-muted-foreground">500〜50,000円</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">返信目安（時間）</label>
          <input
            type="number"
            min={1}
            max={72}
            value={form.estimated_reply_hours}
            onChange={e => setForm({ ...form, estimated_reply_hours: parseInt(e.target.value) || 24 })}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={form.is_active}
          onCheckedChange={v => setForm({ ...form, is_active: v })}
        />
        <span className="text-sm">{form.is_active ? "公開中" : "非公開"}</span>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-purple-600 hover:bg-purple-500 gap-2">
          {saving ? "保存中..." : "保存"}
        </Button>
        <Button onClick={onCancel} size="sm" variant="ghost">キャンセル</Button>
      </div>
    </div>
  );
}

export default function ChatReadingMenuPanel({ channel, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["chat-reading-menus", channel?.id],
    queryFn: () => base44.entities.ChatReadingMenu.filter({ channel_id: channel.id, creator_email: user.email }, "sort_order"),
    enabled: !!channel?.id,
  });

  const handleCreate = async (form) => {
    await base44.entities.ChatReadingMenu.create({
      ...form,
      creator_email: user.email,
      channel_id: channel.id,
      channel_name: channel.name || "",
    });
    queryClient.invalidateQueries({ queryKey: ["chat-reading-menus", channel.id] });
    setShowForm(false);
    toast.success("メニューを作成しました");
  };

  const handleUpdate = async (form) => {
    await base44.entities.ChatReadingMenu.update(editingMenu.id, form);
    queryClient.invalidateQueries({ queryKey: ["chat-reading-menus", channel.id] });
    setEditingMenu(null);
    toast.success("メニューを更新しました");
  };

  const handleToggleActive = async (menu) => {
    await base44.entities.ChatReadingMenu.update(menu.id, { is_active: !menu.is_active });
    queryClient.invalidateQueries({ queryKey: ["chat-reading-menus", channel.id] });
  };

  const handleDelete = async (menu) => {
    if (!confirm(`「${menu.title}」を削除しますか？`)) return;
    await base44.entities.ChatReadingMenu.delete(menu.id);
    queryClient.invalidateQueries({ queryKey: ["chat-reading-menus", channel.id] });
    toast.success("削除しました");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-black text-sm">チャット鑑定メニュー</h3>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">Stripe決済</span>
        </div>
        {!showForm && !editingMenu && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> メニューを追加
          </Button>
        )}
      </div>

      {showForm && (
        <MenuForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
      ) : menus.length === 0 && !showForm ? (
        <div className="text-center py-10 bg-secondary/30 rounded-2xl border border-border/50">
          <p className="text-3xl mb-2">🔮</p>
          <p className="text-sm text-muted-foreground">チャット鑑定メニューがまだありません</p>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="mt-3 bg-purple-600 hover:bg-purple-500 gap-2"
          >
            <Plus className="w-4 h-4" /> 最初のメニューを作成
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {menus.map(menu => (
            editingMenu?.id === menu.id ? (
              <MenuForm key={menu.id} initial={menu} onSave={handleUpdate} onCancel={() => setEditingMenu(null)} />
            ) : (
              <div key={menu.id} className={`bg-card border rounded-2xl p-4 transition-colors ${menu.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{menu.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${menu.is_active ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-secondary text-muted-foreground border-border/50"}`}>
                        {menu.is_active ? "公開中" : "非公開"}
                      </span>
                    </div>
                    {menu.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{menu.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">¥{menu.price_yen?.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{menu.estimated_reply_hours || 24}時間以内</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={menu.is_active} onCheckedChange={() => handleToggleActive(menu)} />
                    <button onClick={() => setEditingMenu(menu)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(menu)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}