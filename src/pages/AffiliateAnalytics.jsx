import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ExternalLink, TrendingUp, MousePointerClick, Eye, DollarSign, RefreshCw, Copy, Check, Upload, FileText, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SUPER_ADMIN_EMAILS = ["ono@onestep-corp.com", "taktak0315@icloud.com", "unei@chatmarket.info"];
const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#6b7280"];

const AFFILIATE_LINKS = [
  { id: "obs_mic_at2020", label: "AT2020USB-X コンデンサーマイク", url: "https://amzn.to/48fAwrs", page: "OBSガイド / 機材ガイド", category: "マイク" },
  { id: "obs_cam_c920", label: "ロジクール C920n ウェブカメラ", url: "https://amzn.to/4vHSY66", page: "OBSガイド", category: "カメラ" },
  { id: "obs_light_elgato", label: "Elgato Key Light Neo", url: "https://amzn.to/4tY7Zir", page: "OBSガイド", category: "照明" },
  { id: "obs_mixer_yamaha", label: "YAMAHA AG03MK2 オーディオインターフェース", url: "https://amzn.to/4tkKBM7", page: "OBSガイド", category: "ミキサー" },
  { id: "obs_streamdeck", label: "Elgato Stream Deck MK.2", url: "https://amzn.to/4sQkoEn", page: "OBSガイド", category: "ガジェット" },
  { id: "obs_capture_elgato", label: "Elgato HD60 X キャプチャーボード", url: "https://amzn.to/4cG4Eh6", page: "OBSガイド", category: "ガジェット" },
  { id: "obs_atem", label: "Blackmagic ATEM Mini Pro", url: "https://amzn.to/4u1KqW5", page: "OBSガイド", category: "スイッチャー" },
  { id: "obs_zve10", label: "Sony ZV-E10 ミラーレス一眼", url: "https://amzn.to/4tiWulK", page: "OBSガイド", category: "カメラ" },
  { id: "coin_visagift", label: "Visaギフトカード（コインチャージ用）", url: "https://amzn.to/3QnY6Mz", page: "コインチャージ / OBSガイド", category: "決済" },
];

// Amazon CSVの列名候補（日本語・英語両対応）
function parseAmazonCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  // ヘッダー行を検索（"日付" or "Date" を含む行）
  let headerIdx = lines.findIndex(l => /日付|Date|date/i.test(l));
  if (headerIdx === -1) headerIdx = 0;
  const headers = lines[headerIdx].split(",").map(h => h.trim().replace(/^"|"$/g, ""));

  // 列インデックスを特定
  const dateIdx = headers.findIndex(h => /日付|Date/i.test(h));
  const clickIdx = headers.findIndex(h => /クリック|Click|Clicks/i.test(h));
  const orderIdx = headers.findIndex(h => /注文|Order|Orders/i.test(h));
  const revenueIdx = headers.findIndex(h => /収益|Revenue|Earnings|Earning|報酬/i.test(h));
  const pvIdx = headers.findIndex(h => /閲覧|PV|Impression|Page/i.test(h));

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2 || !cols[dateIdx]) continue;
    const dateRaw = cols[dateIdx];
    // 日付フォーマット → M/D に変換
    let dateLabel = dateRaw;
    const m = dateRaw.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) dateLabel = `${parseInt(m[2])}/${parseInt(m[3])}`;

    const clicks = clickIdx >= 0 ? parseInt(cols[clickIdx]) || 0 : 0;
    const revenue = revenueIdx >= 0 ? parseFloat(cols[revenueIdx].replace(/[¥,￥$]/g, "")) || 0 : 0;
    const pv = pvIdx >= 0 ? parseInt(cols[pvIdx]) || 0 : 0;
    const orders = orderIdx >= 0 ? parseInt(cols[orderIdx]) || 0 : 0;

    rows.push({ date: dateLabel, クリック: clicks, 収益: Math.round(revenue), PV: pv, 注文: orders });
  }
  return rows.length > 0 ? rows : null;
}

export default function AffiliateAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [sortKey, setSortKey] = useState("clicks");
  const [csvData, setCsvData] = useState(null); // インポートされた実データ
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImportedAt, setCsvImportedAt] = useState(null);
  const [showImportPanel, setShowImportPanel] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) { navigate("/"); return; }
      base44.auth.me().then((u) => {
        if (!SUPER_ADMIN_EMAILS.includes(u.email)) { navigate("/"); return; }
        setUser(u);
      });
    });
    // ローカルストレージから前回インポートデータを復元
    const saved = localStorage.getItem("affiliate_csv_data");
    const savedName = localStorage.getItem("affiliate_csv_filename");
    const savedAt = localStorage.getItem("affiliate_csv_imported_at");
    if (saved) {
      setCsvData(JSON.parse(saved));
      setCsvFileName(savedName || "");
      setCsvImportedAt(savedAt || null);
    }
  }, []);

  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseAmazonCsv(text);
      if (!parsed) {
        toast.error("CSVのパースに失敗しました。Amazon AssociatesダッシュボードからダウンロードしたCSVファイルを選択してください。");
        return;
      }
      const now = new Date().toLocaleString("ja-JP");
      setCsvData(parsed);
      setCsvFileName(file.name);
      setCsvImportedAt(now);
      localStorage.setItem("affiliate_csv_data", JSON.stringify(parsed));
      localStorage.setItem("affiliate_csv_filename", file.name);
      localStorage.setItem("affiliate_csv_imported_at", now);
      setShowImportPanel(false);
      toast.success(`✅ ${parsed.length}日分のデータをインポートしました`);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleClearData = () => {
    if (!window.confirm("インポートデータを削除しますか？")) return;
    setCsvData(null);
    setCsvFileName("");
    setCsvImportedAt(null);
    localStorage.removeItem("affiliate_csv_data");
    localStorage.removeItem("affiliate_csv_filename");
    localStorage.removeItem("affiliate_csv_imported_at");
    toast.success("データをクリアしました");
  };

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("URLをコピーしました");
  };

  const hasData = csvData && csvData.length > 0;
  const dailyData = csvData || [];

  const totalClicks = dailyData.reduce((s, d) => s + d.クリック, 0);
  const totalRevenue = dailyData.reduce((s, d) => s + d.収益, 0);
  const totalPV = dailyData.reduce((s, d) => s + d.PV, 0);
  const totalOrders = dailyData.reduce((s, d) => s + (d.注文 || 0), 0);

  // カテゴリ集計（実データがない場合は空）
  const categoryData = hasData ? (() => {
    const map = {};
    AFFILIATE_LINKS.forEach(l => { map[l.category] = (map[l.category] || 0); });
    // 実データがある場合、クリックを均等に按分（本来はリンク別データが必要）
    const total = AFFILIATE_LINKS.length;
    AFFILIATE_LINKS.forEach(l => {
      map[l.category] = (map[l.category] || 0) + Math.round(totalClicks / total);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })() : [];

  // リンク別テーブル（実データある場合は按分、なければ "-"）
  const linkStats = AFFILIATE_LINKS.map(link => ({
    ...link,
    clicks: hasData ? Math.round(totalClicks / AFFILIATE_LINKS.length) : null,
    revenue: hasData ? Math.round(totalRevenue / AFFILIATE_LINKS.length) : null,
  }));
  const sorted = [...linkStats].sort((a, b) => {
    if (!hasData) return 0;
    return (b[sortKey] || 0) - (a[sortKey] || 0);
  });

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
        <div className="flex items-center gap-2 flex-wrap">
          {hasData && (
            <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1">
              <FileText className="w-3 h-3" /> {csvFileName} ({csvImportedAt})
            </span>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImportPanel(v => !v)}>
            <Upload className="w-3.5 h-3.5" /> CSVインポート
          </Button>
          {hasData && (
            <Button size="sm" variant="outline" className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={handleClearData}>
              <X className="w-3.5 h-3.5" /> クリア
            </Button>
          )}
        </div>
      </div>

      {/* API制限の説明バナー */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-300">Amazon Associates APIについて重要なお知らせ</p>
          <p className="text-amber-200/80">Amazon PA-APIは<strong>商品データ取得専用</strong>であり、<strong>クリック数・収益レポートを自動取得するAPIは公式に存在しません</strong>。Amazonのレポートデータは「Associatesダッシュボード → レポート → CSVダウンロード」が唯一の公式手段です。</p>
          <p className="text-amber-200/60">👇 下記の手順でCSVをインポートすることで、実データをグラフに反映できます。</p>
        </div>
      </div>

      {/* CSV Import Panel */}
      {showImportPanel && (
        <div className="bg-card border border-primary/30 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Amazon Associates CSVインポート手順</h2>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li><a href="https://affiliate.amazon.co.jp/home/reports" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Amazon Associatesダッシュボード</a> にログイン</li>
            <li>「レポート」→「収益レポート」または「クリックレポート」を選択</li>
            <li>期間を指定して「CSVをダウンロード」</li>
            <li>ダウンロードしたCSVファイルを下記にアップロード</li>
          </ol>
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-primary/40 rounded-xl cursor-pointer hover:border-primary/70 hover:bg-primary/5 transition-all">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
            <FileText className="w-7 h-7 text-primary mb-2" />
            <span className="text-sm font-bold text-primary">クリックしてCSVを選択</span>
            <span className="text-xs text-muted-foreground mt-1">Amazon Associatesのレポートファイル（.csv）</span>
          </label>
          <p className="text-xs text-muted-foreground">※ データはブラウザのローカルストレージに保存されます。サーバーには送信されません。</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "総ページビュー", value: hasData ? totalPV.toLocaleString() : "—", icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
          { label: "総クリック数", value: hasData ? totalClicks.toLocaleString() : "—", icon: MousePointerClick, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
          { label: "総注文数", value: hasData ? totalOrders.toLocaleString() : "—", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
          { label: "総収益", value: hasData ? `¥${totalRevenue.toLocaleString()}` : "—", icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 space-y-2 ${kpi.bg}`}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              {kpi.label}
            </div>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            {!hasData && <p className="text-[10px] text-muted-foreground">CSVをインポートしてください</p>}
          </div>
        ))}
      </div>

      {/* Charts */}
      {hasData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-sm">日別クリック数・収益（{dailyData.length}日間）</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} />
                  <Line type="monotone" dataKey="クリック" stroke="#10b981" strokeWidth={2} dot={false} />
                  {totalPV > 0 && <Line type="monotone" dataKey="PV" stroke="#3b82f6" strokeWidth={2} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-sm">カテゴリ別クリック（推計）</h2>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-sm">日別収益（¥）</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} />
                <Bar dataKey="収益" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center space-y-4">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-medium">データがありません</p>
          <p className="text-xs text-muted-foreground">Amazon AssociatesダッシュボードからCSVをダウンロードし、上部の「CSVインポート」ボタンでアップロードしてください。</p>
          <Button onClick={() => setShowImportPanel(true)} className="gap-2">
            <Upload className="w-4 h-4" /> CSVインポートを開始
          </Button>
        </div>
      )}

      {/* Link table */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold">リンク一覧</h2>
          {hasData && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">並び替え:</span>
              {["clicks", "revenue"].map((k) => (
                <button key={k} onClick={() => setSortKey(k)}
                  className={`px-2.5 py-1 rounded-full border transition-all ${sortKey === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {k === "clicks" ? "クリック" : "収益"}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">※ リンク別の詳細数値はAmazon Associatesダッシュボードの「個別リンクレポート」でご確認ください。</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-2 px-3">商品名</th>
                <th className="text-left py-2 px-3">掲載ページ</th>
                <th className="text-left py-2 px-3">カテゴリ</th>
                <th className="text-right py-2 px-3">クリック（推計）</th>
                <th className="text-right py-2 px-3">収益（推計）</th>
                <th className="text-center py-2 px-3">リンク</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((link) => (
                <tr key={link.id} className="border-b border-border/30 hover:bg-secondary/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white max-w-[200px] truncate">{link.label}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-[11px]">{link.page}</td>
                  <td className="py-2.5 px-3"><span className="bg-secondary px-2 py-0.5 rounded-full text-[10px]">{link.category}</span></td>
                  <td className="py-2.5 px-3 text-right font-bold text-green-400">{link.clicks !== null ? link.clicks.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-yellow-400">{link.revenue !== null ? `¥${link.revenue.toLocaleString()}` : "—"}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => copyLink(link.url, link.id)} className="text-muted-foreground hover:text-primary transition-colors" title="URLをコピー">
                        {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
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

      {/* Footer note */}
      <div className="bg-secondary/50 border border-border/40 rounded-xl px-5 py-4 space-y-2 text-xs text-muted-foreground">
        <p className="font-bold text-foreground">📌 データ取得方法について</p>
        <p>Amazon PA-APIはクリック・収益レポートの取得に対応していません（商品検索専用）。実際のデータは <a href="https://affiliate.amazon.co.jp/home/reports" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Associatesダッシュボード</a> からCSVをダウンロードし、このページにインポートしてください。アソシエイトID: <span className="font-mono text-primary">chatmarket-22</span></p>
      </div>
    </div>
  );
}