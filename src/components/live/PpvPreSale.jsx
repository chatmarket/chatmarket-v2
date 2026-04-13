import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Ticket, CheckCircle2, Users, Zap } from "lucide-react";
import { toast } from "sonner";

// PPV事前チケット販売 — LiveViewページに埋め込む
export default function PpvPreSale({ stream, user }) {
  const queryClient = useQueryClient();
  const [buyTarget, setBuyTarget] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [done, setDone] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["ppv-ticket-events", stream?.id],
    queryFn: () => base44.entities.TicketEvent.filter({ livestream_id: stream.id, sale_type: "ppv", status: "on_sale" }, "event_date"),
    enabled: !!stream?.id,
  });

  const { data: myTicketIds = [] } = useQuery({
    queryKey: ["my-ppv-ticket-ids", user?.email, stream?.id],
    queryFn: async () => {
      const tickets = await base44.entities.DigitalTicket.filter({ owner_email: user.email, event_id: events[0]?.id });
      return tickets.map(t => t.event_id + "_" + t.ticket_type);
    },
    enabled: !!user && events.length > 0,
  });

  if (events.length === 0) return null;
  const event = events[0];

  const handleBuy = async (tier) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setPurchasing(true);
    setBuyTarget(tier);
    await base44.entities.DigitalTicket.create({
      owner_email: user.email,
      owner_name: user.full_name || user.email,
      event_id: event.id,
      event_name: event.event_name,
      event_date: event.event_date,
      event_location: event.location || "オンライン",
      ticket_type: tier.type,
      channel_id: event.channel_id,
      channel_name: event.channel_name,
      price: tier.price,
      status: "valid",
      ticket_number: `PPV-${Date.now().toString(36).toUpperCase()}`,
      thumbnail_url: stream.thumbnail_url || "",
    });
    const updated = event.ticket_types.map(t => t.name === tier.name ? { ...t, sold: (t.sold || 0) + 1 } : t);
    await base44.entities.TicketEvent.update(event.id, { ticket_types: updated });
    queryClient.invalidateQueries({ queryKey: ["my-ppv-ticket-ids"] });
    queryClient.invalidateQueries({ queryKey: ["ppv-ticket-events"] });
    setDone(true);
    setPurchasing(false);
    toast.success("PPVチケットを購入しました！");
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-400" />
        <p className="font-bold text-sm text-blue-300">PPV事前チケット販売中</p>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">PRE-SALE</span>
      </div>
      <p className="text-xs text-muted-foreground">{event.event_name}</p>

      {done && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <p className="text-sm text-green-300 font-semibold">購入完了！マイチケットに追加されました</p>
        </div>
      )}

      <div className="space-y-2">
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
                <p className="text-blue-400 font-bold text-sm">¥{tier.price.toLocaleString()}</p>
                {owned ? (
                  <span className="text-[11px] text-green-400 flex items-center gap-0.5 justify-end mt-1"><CheckCircle2 className="w-3 h-3" /> 購入済み</span>
                ) : remaining <= 0 ? (
                  <span className="text-[11px] text-muted-foreground">SOLD OUT</span>
                ) : (
                  <Button size="sm" className="h-7 text-xs px-3 mt-1 bg-blue-500 hover:bg-blue-600"
                    disabled={purchasing && buyTarget?.name === tier.name}
                    onClick={() => handleBuy(tier)}>
                    {purchasing && buyTarget?.name === tier.name ? "処理中..." : "購入する"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">※ モック決済 — 実際の請求は発生しません</p>
    </div>
  );
}