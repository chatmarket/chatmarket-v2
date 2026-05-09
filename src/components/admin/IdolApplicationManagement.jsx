import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, User, Instagram, Twitter, Youtube, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_MAP = {
  pending:   { label: "未対応",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  reviewing: { label: "審査中",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  accepted:  { label: "採用",     color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected:  { label: "不採用",   color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function IdolApplicationManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["idol-applications"],
    queryFn: () => base44.entities.IdolApplication.list("-submitted_at", 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IdolApplication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idol-applications"] });
      toast.success("更新しました");
      if (selected) setSelected((prev) => ({ ...prev, ...updateMutation.variables?.data }));
    },
  });

  const filtered = applications.filter((a) => {
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchSearch =
      !search ||
      a.full_name?.includes(search) ||
      a.email?.includes(search);
    return matchStatus && matchSearch;
  });

  const handleOpenDetail = (app) => {
    setSelected(app);
    setNotes(app.notes || "");
  };

  const handleStatusChange = (newStatus) => {
    if (!selected) return;
    updateMutation.mutate({ id: selected.id, data: { status: newStatus } });
    setSelected((prev) => ({ ...prev, status: newStatus }));
  };

  const handleSaveNotes = () => {
    if (!selected) return;
    updateMutation.mutate({ id: selected.id, data: { notes } });
  };

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メールで検索"
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="pending">未対応</SelectItem>
            <SelectItem value="reviewing">審査中</SelectItem>
            <SelectItem value="accepted">採用</SelectItem>
            <SelectItem value="rejected">不採用</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          合計 <span className="font-bold text-foreground">{filtered.length}</span> 件
        </div>
      </div>

      {/* 一覧 */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">応募がありません</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const s = STATUS_MAP[app.status] || STATUS_MAP.pending;
            return (
              <div
                key={app.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => handleOpenDetail(app)}
              >
                {/* 写真 */}
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-secondary">
                  {app.photo_url ? (
                    <img src={app.photo_url} alt={app.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* 基本情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{app.full_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{app.email}</p>
                  {app.submitted_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      応募日: {format(new Date(app.submitted_at), "yyyy/MM/dd HH:mm")}
                    </p>
                  )}
                </div>

                {/* SNSアイコン */}
                <div className="flex gap-1.5 shrink-0">
                  {app.sns_accounts?.twitter && <Twitter className="w-3.5 h-3.5 text-sky-400" />}
                  {app.sns_accounts?.instagram && <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                  {app.sns_accounts?.tiktok && <span className="text-[11px] font-black text-white/60">TK</span>}
                  {app.sns_accounts?.youtube && <Youtube className="w-3.5 h-3.5 text-red-400" />}
                </div>

                <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* 詳細ダイアログ */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected?.photo_url && (
                <img
                  src={selected.photo_url}
                  alt={selected?.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              {selected?.full_name}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* ステータス変更 */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-muted-foreground">ステータス:</span>
                {Object.entries(STATUS_MAP).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                      selected.status === key ? val.color : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">メール</span><br /><span className="font-medium">{selected.email}</span></div>
                <div><span className="text-muted-foreground">電話番号</span><br /><span className="font-medium">{selected.phone}</span></div>
              </div>

              {/* SNS */}
              {selected.sns_accounts && Object.values(selected.sns_accounts).some(v => v) && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-muted-foreground">SNSアカウント</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selected.sns_accounts).filter(([,v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs bg-secondary rounded-lg px-3 py-2">
                        <span className="text-muted-foreground capitalize">{k}:</span>
                        <span className="font-medium truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 自己紹介 */}
              {selected.bio && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">自己紹介</p>
                  <p className="text-sm bg-secondary rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{selected.bio}</p>
                </div>
              )}

              {/* 活動経歴 */}
              {selected.experience && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">活動経歴</p>
                  <p className="text-sm bg-secondary rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{selected.experience}</p>
                </div>
              )}

              {/* 管理者メモ */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">管理者メモ</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="審査メモなどを入力..."
                  className="h-24"
                />
                <Button size="sm" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                  メモを保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}