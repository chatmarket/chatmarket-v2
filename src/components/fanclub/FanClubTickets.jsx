import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin, Users, CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ---- Owner form ----
function FanClubEventForm({ channel, onCreated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event_name: "", description: "", event_date: "", location: "",
    ticket_types: [{ type: "fanclub", name: "会員限定席", price: 5000, capacity: 50 }]
  });

  const addTier = () => setForm(f => ({ ...f, ticket_types: [...f.ticket_types, { type: "fanclub_vip", name: "最前列VIP", price: 15000, capacity: 10 }] }));
  const removeTier = (i) => setForm(f => ({ ...f, ticket_types: f.ticket_types.filter((_, idx) => idx !== i) }));
  const updateTier = (i, key, val) => setForm(f => ({ ...f, ticket_types: f.ticket_types.map((t, idx) => idx === i ? { ...t, [key]: val } : t) }));

  const handleSave = async () => {
    if (!form.event_name || !form.event_date) { toast.error("イベント名と日時は必須です"); return; }
    setSaving(true);
    await base44.entities.TicketEvent.create({
      ...form,
      sale_type: "fanclub",
      channel_id: channel.id,
      channel_name: channel.name,
      channel_owner_email: channel.owner_email,
      ticket_types: form.ticket_types.map(t => ({ ...t, sold: 0 })),
      status: "on_sale",
    });
    toast.success("会員限定イベントを作成しました");
    setSaving(false);
    setOpen(false);
    onCreated();
  };

  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-yellow-400">
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> 会員限定イベントを作成</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="space-y-3 pt-2 border-t border-yellow-500/20">
          <input className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none" placeholder="イベント名*" value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
          <textarea className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none resize-none" rows={2} placeholder="説明" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" className="bg-secondary rounded-lg px-3 py-2 text-sm outline-none" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            <input className="bg-secondary rounded-lg px-3 py-2 text-sm outline-none" placeholder="会場" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">チケット種別</p>
            {form.ticket_types.map((tier, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                <input className="col-span-2 bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="種別名" value={tier.name} onChange={e => updateTier(i, "name", e.target.value)} />
                <input type="number" className="bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="価格" value={tier.price} onChange={e => updateTier(i, "price", Number(e.target.value))} />
                <div className="flex items-center gap-1">
                  <input type="number" className="flex-1 bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="上限" value={tier.capacity} onChange={e => updateTier(i, "capacity", Number(e.target.value))} />
                  <button onClick={() => removeTier(i)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={addTier} className="text-xs text-yellow-400 hover:underline">+ 種別を追加</button>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">{saving ? "作成中..." : "作成する"}</Button>
        </div>
      )}
    </div>
  );
}

// ---- Purchase Modal ----
function BuyModal({ event, tier, user, onClose, onPurchased }) {
  const [purchasing, setPurchasing] = useState(false);
  const [done, setDone] = useState(false);

  const handleBuy = async () => {
    setPurchasing(true);
    await base44.entities.DigitalTicket.create({
      owner_email: user.email,
      owner_name: user.full_name || user.email,
      event_id: event.id,
      event_name: event.event_name,
      event_date: event.event_date,
      event_location: event.location || "",
      ticket_type: tier.type,
      channel_id: event.channel_id,
      channel_name: event.channel_name,
      price: tier.price,
      status: "valid",
      ticket_number: `FC-${Date.now().toString(36).toUpperCase()}`,
      thumbnail_url: event.thumbnail_url || "",
    });
    const updated = event.ticket_types.map(t => t.name === tier.name ? { ...t, sold: (t.sold || 0) + 1 } : t);
    await base44.entities.TicketEvent.update(event.id, { ticket_types: updated });
    setDone(true);
    setPurchasing(false);
    setTimeout(() => { onPurchased(); onClose(); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <p className="font-bold text-xl">購入完了！</p>
            <p className="text-sm text-muted-foreground">マイチケットに追加されました</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-yellow-400 font-bold">
              <Ticket className="w-5 h-5" /> 会員限定チケット購入
            </div>
            <div className="bg-secondary rounded-xl p-4 space-y-1 text-sm">
              <p className="font-semibold">{event.event_name}</p>
              <p className="text-muted-foreground">{tier.name}</p>
              <p className="text-2xl font-black text-yellow-400 mt-2">¥{tier.price.toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">※ モック決済 — 実際の請求は発生しません</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>キャンセル</Button>
              <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={purchasing} onClick={handleBuy}>
                {purchasing ? "処理中..." : "購入する"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Main Export ----
export default function FanClubTickets({ channel, user, isMember }) {
  const queryClient = useQueryClient();
  const [buyTarget, setBuyTarget] = useState(null);
  const isOwner = user && channel && user.email === channel.owner_email;

  const { data: events = [], refetch } = useQuery({
    queryKey: ["fanclub-ticket-events", channel?.id],
    queryFn: () => base44.entities.TicketEvent.filter({ channel_id: channel.id, sale_type: "fanclub", status: "on_sale" }, "event_date"),
    enabled: !!channel?.id,
  });

  const { data: myTicketIds = [] } = useQuery({
    queryKey: ["my-fanclub-ticket-ids", user?.email],
    queryFn: async () => {
      const tickets = await base44.entities.DigitalTicket.filter({ owner_email: user.email });
      return tickets.map(t => t.event_id + "_" + t.ticket_type);
    },
    enabled: !!user,
  });

  if (!isOwner && events.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base flex items-center gap-2 text-yellow-400">
        <Ticket className="w-4 h-4" /> 会員限定イベント
      </h2>

      {isOwner && <FanClubEventForm channel={channel} onCreated={refetch} />}

      {events.length === 0 && isOwner && (
        <p className="text-xs text-muted-foreground text-center py-4">まだ会員限定イベントはありません</p>
      )}

      {events.map(event => (
        <div key={event.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-bold text-sm">{event.event_name}</p>
            {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
              {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(event.event_date), "yyyy/MM/dd HH:mm")}</span>}
              {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
            </div>
          </div>
          {(event.ticket_types || []).map((tier, i) => {
            const remaining = tier.capacity - (tier.sold || 0);
            const owned = myTicketIds.includes(event.id + "_" + tier.type);
            return (
              <div key={i} className="flex items-center justify-between bg-secondary/60 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold">{tier.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> 残り {remaining} 枚</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold text-sm">¥{tier.price.toLocaleString()}</p>
                  {owned ? (
                    <span className="text-[11px] text-green-400 flex items-center gap-0.5 justify-end mt-1"><CheckCircle2 className="w-3 h-3" /> 購入済み</span>
                  ) : !isMember ? (
                    <span className="text-[11px] text-muted-foreground">会員限定</span>
                  ) : remaining <= 0 ? (
                    <span className="text-[11px] text-muted-foreground">SOLD OUT</span>
                  ) : (
                    <Button size="sm" className="h-7 text-xs px-3 mt-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                      onClick={() => { if (!user) { base44.auth.redirectToLogin(); return; } setBuyTarget({ event, tier }); }}>
                      購入する
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {buyTarget && (
        <BuyModal
          event={buyTarget.event}
          tier={buyTarget.tier}
          user={user}
          onClose={() => setBuyTarget(null)}
          onPurchased={() => {
            queryClient.invalidateQueries({ queryKey: ["my-fanclub-ticket-ids"] });
            queryClient.invalidateQueries({ queryKey: ["fanclub-ticket-events"] });
          }}
        />
      )}
    </div>
  );
}