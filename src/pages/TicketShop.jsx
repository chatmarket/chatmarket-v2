import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, MapPin, Calendar, Users, CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ---- Owner: Event Create Form ----
function EventCreateForm({ channel, onCreated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event_name: "", description: "", event_date: "", location: "",
    is_members_only: false, status: "on_sale",
    ticket_types: [{ type: "general", name: "一般", price: 3000, capacity: 100 }]
  });

  const addTier = () =>
    setForm(f => ({ ...f, ticket_types: [...f.ticket_types, { type: "vip", name: "VIP", price: 10000, capacity: 20 }] }));
  const removeTier = (i) =>
    setForm(f => ({ ...f, ticket_types: f.ticket_types.filter((_, idx) => idx !== i) }));
  const updateTier = (i, key, val) =>
    setForm(f => ({ ...f, ticket_types: f.ticket_types.map((t, idx) => idx === i ? { ...t, [key]: val } : t) }));

  const handleSave = async () => {
    if (!form.event_name || !form.event_date) { toast.error("イベント名と日時は必須です"); return; }
    setSaving(true);
    await base44.entities.TicketEvent.create({
      ...form,
      channel_id: channel.id,
      channel_name: channel.name,
      channel_owner_email: channel.owner_email,
      ticket_types: form.ticket_types.map(t => ({ ...t, sold: 0 })),
    });
    toast.success("イベントを作成しました");
    setSaving(false);
    setOpen(false);
    onCreated();
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> 新しいイベントを作成</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="space-y-3 pt-2 border-t border-border/30">
          <input className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none" placeholder="イベント名*" value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
          <textarea className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none resize-none" rows={2} placeholder="イベント説明" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" className="bg-secondary rounded-lg px-3 py-2 text-sm outline-none" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            <input className="bg-secondary rounded-lg px-3 py-2 text-sm outline-none" placeholder="会場" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={form.is_members_only} onChange={e => setForm(f => ({ ...f, is_members_only: e.target.checked }))} className="accent-primary" />
            ファンクラブ会員限定
          </label>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">チケット種別</p>
            {form.ticket_types.map((tier, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                <input className="col-span-2 bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="種別名" value={tier.name} onChange={e => updateTier(i, "name", e.target.value)} />
                <input type="number" className="bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="価格" value={tier.price} onChange={e => updateTier(i, "price", Number(e.target.value))} />
                <div className="flex items-center gap-1">
                  <input type="number" className="flex-1 bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="上限" value={tier.capacity} onChange={e => updateTier(i, "capacity", Number(e.target.value))} />
                  <button onClick={() => removeTier(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={addTier} className="text-xs text-primary hover:underline">+ 種別を追加</button>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "作成中..." : "イベントを公開"}</Button>
        </div>
      )}
    </div>
  );
}

// ---- Ticket Purchase Modal ----
function PurchaseModal({ event, tier, user, onClose, onPurchased }) {
  const [purchasing, setPurchasing] = useState(false);
  const [done, setDone] = useState(false);

  const handleBuy = async () => {
    setPurchasing(true);
    const ticketNumber = `T-${Date.now().toString(36).toUpperCase()}`;
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
      ticket_number: ticketNumber,
      thumbnail_url: event.thumbnail_url || "",
    });
    // 売上カウントを更新（sold+1）
    const updated = event.ticket_types.map(t =>
      t.name === tier.name ? { ...t, sold: (t.sold || 0) + 1 } : t
    );
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
            <h3 className="font-bold text-lg">{event.event_name}</h3>
            <div className="bg-secondary rounded-xl p-4 space-y-1 text-sm">
              <p className="text-muted-foreground">チケット種別</p>
              <p className="font-semibold">{tier.name}</p>
              <p className="text-2xl font-black text-primary mt-2">¥{tier.price.toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              ※ モック決済です。実際の請求は発生しません。
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>キャンセル</Button>
              <Button className="flex-1" disabled={purchasing} onClick={handleBuy}>
                {purchasing ? "処理中..." : "購入する（モック）"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function TicketShop() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [buyTarget, setBuyTarget] = useState(null); // { event, tier }
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => base44.entities.Channel.filter({ id: channelId }).then(r => r[0]),
    enabled: !!channelId,
  });

  const { data: events = [], refetch } = useQuery({
    queryKey: ["ticket-events", channelId],
    queryFn: () => base44.entities.TicketEvent.filter({ channel_id: channelId, status: "on_sale" }, "event_date"),
  });

  const { data: myTicketIds = [] } = useQuery({
    queryKey: ["my-ticket-event-ids", user?.email],
    queryFn: async () => {
      const tickets = await base44.entities.DigitalTicket.filter({ owner_email: user.email });
      return tickets.map(t => t.event_id + "_" + t.ticket_type);
    },
    enabled: !!user,
  });

  const isOwner = user && channel && user.email === channel.owner_email;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {channel && (
        <div className="flex items-center gap-3">
          {channel.avatar_url ? (
            <img src={channel.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-lg">
              {channel.name?.[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              {channel.name} チケット
            </h1>
            <p className="text-xs text-muted-foreground">イベントチケット購入</p>
          </div>
        </div>
      )}

      {/* Owner: create form */}
      {isOwner && channel && <EventCreateForm channel={channel} onCreated={refetch} />}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">現在販売中のイベントはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              {event.thumbnail_url && (
                <img src={event.thumbnail_url} className="w-full h-40 object-cover" alt="" />
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-base">{event.event_name}</h2>
                  {event.is_members_only && (
                    <Badge className="shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">会員限定</Badge>
                  )}
                </div>
                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {event.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(event.event_date), "yyyy/MM/dd HH:mm")}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {event.location}
                    </span>
                  )}
                </div>

                {/* Ticket tiers */}
                <div className="space-y-2">
                  {(event.ticket_types || []).map((tier, i) => {
                    const remaining = tier.capacity - (tier.sold || 0);
                    const alreadyOwned = myTicketIds.includes(event.id + "_" + tier.type);
                    return (
                      <div key={i} className="flex items-center justify-between bg-secondary/60 rounded-xl px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold">{tier.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> 残り {remaining} 枚
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-bold text-sm">¥{tier.price.toLocaleString()}</p>
                          {alreadyOwned ? (
                            <button
                              onClick={() => navigate("/my-tickets")}
                              className="text-[11px] text-green-400 flex items-center gap-0.5 mt-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> 購入済み
                            </button>
                          ) : remaining <= 0 ? (
                            <span className="text-[11px] text-muted-foreground">SOLD OUT</span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs px-3 mt-1"
                              onClick={() => {
                                if (!user) { base44.auth.redirectToLogin(); return; }
                                setBuyTarget({ event, tier });
                              }}
                            >
                              購入する
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {buyTarget && (
        <PurchaseModal
          event={buyTarget.event}
          tier={buyTarget.tier}
          user={user}
          onClose={() => setBuyTarget(null)}
          onPurchased={() => {
            queryClient.invalidateQueries({ queryKey: ["my-ticket-event-ids"] });
            queryClient.invalidateQueries({ queryKey: ["ticket-events"] });
          }}
        />
      )}
    </div>
  );
}