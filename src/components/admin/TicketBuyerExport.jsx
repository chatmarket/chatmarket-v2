import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Ticket, Users } from "lucide-react";

function exportToCSV(rows, filename) {
  const header = ["購入者名", "メールアドレス", "イベント名", "チケット種別", "価格(円)", "支払方法", "購入日時", "チャンネル名"];
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TicketBuyerExport() {
  const [selectedEventId, setSelectedEventId] = useState("all");

  // TicketEvent一覧
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["admin-ticket-events"],
    queryFn: () => base44.entities.TicketEvent.list("-created_date", 100),
  });

  // LiveStream（チケット有効なもの）
  const { data: liveStreams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ["admin-ticket-livestreams"],
    queryFn: () => base44.entities.LiveStream.filter({ is_ticket_enabled: true }, "-created_date", 100),
  });

  // DigitalTicket（TicketEventの購入者）
  const { data: digitalTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["admin-digital-tickets"],
    queryFn: () => base44.entities.DigitalTicket.list("-created_date", 1000),
  });

  const isLoading = eventsLoading || streamsLoading || ticketsLoading;

  // TicketEventの購入者行を生成
  const eventRows = digitalTickets
    .filter((t) => selectedEventId === "all" || t.event_id === selectedEventId)
    .map((t) => [
      t.owner_name || "",
      t.owner_email || "",
      t.event_name || "",
      t.ticket_type || "general",
      t.price ?? 0,
      "credit_card",
      t.created_date ? new Date(t.created_date).toLocaleString("ja-JP") : "",
      t.channel_name || "",
    ]);

  // LiveStreamのticket_purchasesから行を生成
  const liveRows = liveStreams
    .filter((s) => selectedEventId === "all" || s.id === selectedEventId)
    .flatMap((s) =>
      (s.ticket_purchases || []).map((p) => [
        p.user_name || "",
        p.user_email || "",
        s.title || "",
        "ppv_live",
        p.price_yen ?? 0,
        p.payment_method || "",
        p.purchased_at ? new Date(p.purchased_at).toLocaleString("ja-JP") : "",
        s.channel_name || "",
      ])
    );

  const allRows = [...eventRows, ...liveRows];

  // 重複メール除去カウント
  const uniqueEmails = new Set(allRows.map((r) => r[1]).filter(Boolean));

  const handleDownload = () => {
    if (allRows.length === 0) return;
    const label = selectedEventId === "all" ? "全イベント" : "選択イベント";
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(allRows, `ticket_buyers_${label}_${dateStr}.csv`);
  };

  // セレクトオプション
  const eventOptions = [
    { id: "all", label: "すべてのイベント・配信" },
    ...events.map((e) => ({ id: e.id, label: `[イベント] ${e.event_name}` })),
    ...liveStreams.map((s) => ({ id: s.id, label: `[ライブ] ${s.title}` })),
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-black text-base">チケット購入者リスト出力</h3>
          <p className="text-xs text-muted-foreground">プロモーションメール配信用CSVをダウンロード</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">対象イベント・ライブ配信</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full rounded-xl bg-secondary border-0 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          {eventOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 集計 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-primary">{isLoading ? "…" : allRows.length}</p>
          <p className="text-xs text-muted-foreground mt-1">購入総件数</p>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Users className="w-4 h-4 text-blue-400" />
            <p className="text-2xl font-black text-blue-400">{isLoading ? "…" : uniqueEmails.size}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">ユニーク購入者数</p>
        </div>
      </div>

      {/* プレビュー */}
      {allRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left py-2 px-3 font-bold">購入者名</th>
                <th className="text-left py-2 px-3 font-bold">メール</th>
                <th className="text-left py-2 px-3 font-bold">イベント名</th>
                <th className="text-right py-2 px-3 font-bold">価格</th>
                <th className="text-left py-2 px-3 font-bold">購入日</th>
              </tr>
            </thead>
            <tbody>
              {allRows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="py-2 px-3">{row[0] || "—"}</td>
                  <td className="py-2 px-3 font-mono">{row[1]}</td>
                  <td className="py-2 px-3 max-w-[120px] truncate">{row[2]}</td>
                  <td className="py-2 px-3 text-right">¥{Number(row[4]).toLocaleString()}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row[6]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {allRows.length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              他 {allRows.length - 10} 件（CSVには全件含まれます）
            </p>
          )}
        </div>
      )}

      {allRows.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">購入データがありません</p>
      )}

      <Button
        onClick={handleDownload}
        disabled={isLoading || allRows.length === 0}
        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black"
      >
        {isLoading ? (
          <><RefreshCw className="w-4 h-4 animate-spin" />読み込み中...</>
        ) : (
          <><Download className="w-4 h-4" />CSV ダウンロード（{allRows.length}件）</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        出力項目：購入者名・メール・イベント名・チケット種別・価格・支払方法・購入日時・チャンネル名
      </p>
    </div>
  );
}