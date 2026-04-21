import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ExternalLink, TrendingUp, MousePointerClick, Eye, DollarSign, RefreshCw, Copy, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SUPER_ADMIN_EMAILS = ["ono@onestep-corp.com", "taktak0315@icloud.com", "unei@chatmarket.info"];

// ── アフィリエイトリンクのマスターデータ（管理者が管理）──
const AFFILIATE_LINKS = [
  {
    id: "obs_mic_at2020",
    label: "AT2020USB-X コンデンサーマイク",
    url: "https://amzn.to/48fAwrs",
    page: "OBSガイド / 機材ガイド",
    category: "マイク",
  },
  {
    id: "obs_cam_c920",
    label: "ロジクール C920n ウェブカメラ",
    url: "https://amzn.to/4vHSY66",
    page: "OBSガイド",
    category: "カメラ",
  },
  {
    id: "obs_light_elgato",
    label: "Elgato Key Light Neo",
    url: "https://amzn.to/4tY7Zir",
    page: "OBSガイド",
    category: "照明",
  },
  {
    id: "obs_mixer_yamaha",
    label: "YAMAHA AG03MK2 オーディオインターフェース",
    url: "https://amzn.to/4tkKBM7",
    page: "OBSガイド",
    category: "ミキサー",
  },
  {
    id: "obs_streamdeck",
    label: "Elgato Stream Deck MK.2",
    url: "https://amzn.to/4sQkoEn",
    page: "OBSガイド",
    category: "ガジェット",
  },
  {
    id: "obs_capture_elgato",
    label: "Elgato HD60 X キャプチャーボード",
    url: "https://amzn.to/4cG4Eh6",
    page: "OBSガイド",
    category: "ガジェット",
  },
  {
    id: "obs_atem",
    label: "Blackmagic ATEM Mini Pro",
    url: "https://amzn.to/4u1KqW5",
    page: "OBSガイド",
    category: "スイッチャー",
  },
  {
    id: "obs_zve10",
    label: "Sony ZV-E10 ミラーレス一眼",
    url: "https://amzn.to/4tiWulK",
    page: "OBSガイド",
    category: "カメラ",
  },
  {
    id: "coin_visagift",
    label: "Visaギフトカード（コインチャージ用）",
    url: "https://amzn.to/3QnY6Mz",
    page: "コインチャージ / OBSガイド",
    category: "決済",
  },
  {
    id: "equipment_obsdownload",
    label: "OBS公式ダウンロード（affiliate経由）",
    url: "https://obsproject.com/ja/download",
    page: "OBSガイド",
    category: "ソフト",
  },
];

// ── サンプル時系列データ生成（実際はAmazon Associates APIで取得）──
function generateDailyData(days = 14) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    data.push({
      date: label,
      クリック: Math.floor(Math.random() * 80 + 10),
      PV: Math.floor(Math.random() * 400 + 80),
      収益: Math.floor(Math.random() * 3000 + 200),
    });
  }
  return data;
}

const DAILY_DATA = generateDailyData(14);

// カテゴリ別クリック数（サンプル）
const CATEGORY_DATA = [
  { name: "マイク", value: 312 },
  { name: "カメラ", value: 198 },
  { name: "照明", value: 143 },
  { name: "ミキサー", value: 87 },
  { name: "ガジェット", value: 221 },
  { name: "決済", value: 156 },
  { name: "スイッチャー", value: 44 },
  { name: "ソフト", value: 33 },
];

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#6b7280"];

// ── リンク別クリックサンプルデータ ──
function getLinkStats() {
  return AFFILIATE_LINKS.map((link) => ({
    ...link,
    clicks: Math.floor(Math.random() * 200 + 10),
    revenue: Math.floor(Math.random() * 5000 + 100),
    ctr: (Math.random() * 8 + 1).toFixed(1),
  }));
}

const LINK_STATS = getLinkStats();

const TOTAL_CLICKS = LINK_STATS.reduce((s, l) => s + l.clicks, 0);
const TOTAL_REVENUE = LINK_STATS.reduce((s, l) => s + l.revenue, 0);
const TOTAL_PV = DAILY_DATA.reduce((s, d) => s + d.PV, 0);

export default function AffiliateAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [sortKey, setSortKey] = useState("clicks");

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) { navigate("/"); return; }
      base44.auth.me().then((u) => {
        if (!SUPER_ADMIN_EMAILS.includes(u.email)) { navigate("/"); return; }
        setUser(u);
      });
    });
  }, []);

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("URLをコピーしました");
  };

  const sorted = [...LINK_STATS].sort((a, b) => b[sortKey] - a[sortKey]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" /> アフィリエイト分析
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Amazonアソシエイト（chatmarket-22）のリンク管理・クリック・収益レポート</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full font-bold">
            ⚠️ 数値はサンプルデータ（Amazon Associates APIで更新予定）
          </span>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.info("Amazon Associates APIと接続後にリアルタイムデータを表示します")}>
            <RefreshCw className="w-3.5 h-3.5" /> 更新
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "総ページビュー（14日）", value: TOTAL_PV.toLocaleString(), icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
          { label: "総クリック数（14日）", value: TOTAL_CLICKS.toLocaleString(), icon: MousePointerClick, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
          { label: "平均CTR", value: `${((TOTAL_CLICKS / TOTAL_PV) * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
          { label: "推定収益（14日）", value: `¥${TOTAL_REVENUE.toLocaleString()}`, icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 space-y-2 ${kpi.bg}`}>
            <div className={`flex items-center gap-2 text-xs text-muted-foreground`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              {kpi.label}
            </div>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily clicks & revenue */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-sm">日別クリック数・推定収益（14日間）</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={DAILY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="クリック" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="PV" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-sm">カテゴリ別クリック割合</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CATEGORY_DATA} dataKey="value" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                {CATEGORY_DATA.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1">
            {CATEGORY_DATA.map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue bar */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-sm">日別推定収益（¥）</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={DAILY_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
            <YAxis tick={{ fontSize: 10, fill: "#888" }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} />
            <Bar dataKey="収益" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Link table */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold">リンク別パフォーマンス</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">並び替え:</span>
            {["clicks", "revenue", "ctr"].map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-2.5 py-1 rounded-full border transition-all ${sortKey === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                {k === "clicks" ? "クリック" : k === "revenue" ? "収益" : "CTR"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-2 px-3">商品名</th>
                <th className="text-left py-2 px-3">掲載ページ</th>
                <th className="text-left py-2 px-3">カテゴリ</th>
                <th className="text-right py-2 px-3">クリック</th>
                <th className="text-right py-2 px-3">CTR</th>
                <th className="text-right py-2 px-3">推定収益</th>
                <th className="text-center py-2 px-3">リンク</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((link) => (
                <tr key={link.id} className="border-b border-border/30 hover:bg-secondary/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white max-w-[180px] truncate">{link.label}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{link.page}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-secondary px-2 py-0.5 rounded-full text-[10px]">{link.category}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-green-400">{link.clicks.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-primary font-bold">{link.ctr}%</td>
                  <td className="py-2.5 px-3 text-right font-bold text-yellow-400">¥{link.revenue.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => copyLink(link.url, link.id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="URLをコピー"
                      >
                        {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="リンクを開く">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amazon Associates note */}
      <div className="bg-secondary/50 border border-border/40 rounded-xl px-5 py-4 space-y-2 text-xs text-muted-foreground">
        <p className="font-bold text-foreground">📌 Amazon Associatesレポートとの連携について</p>
        <p>現在表示されている数値はサンプルデータです。実際のクリック数・収益はAmazon Associatesダッシュボード（<a href="https://affiliate.amazon.co.jp/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">affiliate.amazon.co.jp</a>）でご確認ください。</p>
        <p>Amazon Associates APIを使ったリアルタイム連携は今後実装予定です。アソシエイトID: <span className="font-mono text-primary">chatmarket-22</span></p>
      </div>
    </div>
  );
}