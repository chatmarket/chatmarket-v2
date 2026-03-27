import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";

const ADMIN_EMAILS = ["unei@chatmarket.info", "ono@onestep-corp.com"];
const VIEWER_EMAILS = ["kimurayasunari5@gmail.com"];

export default function AnnualFinancialStatement({
  purchases = [],
  calls = [],
  yellCoinTransactions = [],
  subscriptions = [],
  userRole = "user",
}) {
  const excludedEmails = [...ADMIN_EMAILS, ...VIEWER_EMAILS];
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 年を取得
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  // 月別集計
  const getMonthlyData = () => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      videoRevenue: 0,
      streamRevenue: 0,
      callRevenue: 0,
      yellCoinRevenue: 0,
      subscriptionRevenue: 0,
      videoFee: 0,
      streamFee: 0,
      callFee: 0,
      yellCoinFee: 0,
    }));

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear + 1, 0, 1);

    // 動画販売・ライブ配信（管理者以外は除外）
    purchases
      .filter((p) => {
        const d = new Date(p.created_date);
        const isAdmin = userRole === "admin";
        return d >= startDate && d < endDate && d.getFullYear() === selectedYear && (isAdmin ? true : !excludedEmails.includes(p.created_by));
      })
      .forEach((p) => {
        const month = new Date(p.created_date).getMonth();
        const amount = p.amount || 0;
        if (p.item_type === "video") {
          monthlyData[month].videoRevenue += amount;
          monthlyData[month].videoFee += Math.floor(amount * 0.15);
        } else if (p.item_type === "livestream") {
          monthlyData[month].streamRevenue += amount;
          monthlyData[month].streamFee += Math.floor(amount * 0.15);
        }
      });

    // ビデオ通話（管理者以外は除外）
    calls
      .filter((c) => {
        const d = new Date(c.created_date);
        const isAdmin = userRole === "admin";
        return (
          d >= startDate &&
          d < endDate &&
          d.getFullYear() === selectedYear &&
          c.status === "ended" &&
          (isAdmin ? true : !excludedEmails.includes(c.caller_email) && !excludedEmails.includes(c.callee_email))
        );
      })
      .forEach((c) => {
        const month = new Date(c.created_date).getMonth();
        const amount = c.price || 0;
        monthlyData[month].callRevenue += amount;
        monthlyData[month].callFee += Math.floor(amount * 0.3);
      });

    // エールコイン（管理者以外は除外）
    yellCoinTransactions
      .filter((t) => {
        const d = new Date(t.created_date);
        const isAdmin = userRole === "admin";
        return (
          d >= startDate &&
          d < endDate &&
          d.getFullYear() === selectedYear &&
          t.type === "charge" &&
          (isAdmin ? true : !excludedEmails.includes(t.user_email))
        );
      })
      .forEach((t) => {
        const month = new Date(t.created_date).getMonth();
        const amount = t.yen_amount || 0;
        monthlyData[month].yellCoinRevenue += amount;
        monthlyData[month].yellCoinFee += Math.floor(amount * 0.1);
      });

    // サブスクリプション（月単位で按分、管理者以外は除外）
    subscriptions
      .filter((s) => {
        const isAdmin = userRole === "admin";
        return s.status === "active" && (isAdmin ? true : !excludedEmails.includes(s.user_email));
      })
      .forEach((s) => {
        const startMonth = new Date(s.start_date).getMonth();
        const endMonth = s.end_date ? new Date(s.end_date).getMonth() : 11;
        const startYear = new Date(s.start_date).getFullYear();
        const endYear = s.end_date ? new Date(s.end_date).getFullYear() : selectedYear;

        if (startYear <= selectedYear && selectedYear <= endYear) {
          const priceMap = {
            basic: 3300,
            vod: 9900,
            ppv: 9900,
            "call-anser": 6600,
          };
          const price = priceMap[s.plan_id] || 0;

          for (let m = 0; m < 12; m++) {
            if (m >= startMonth && m <= endMonth) {
              monthlyData[m].subscriptionRevenue += price;
            }
          }
        }
      });

    return monthlyData;
  };

  const monthlyData = getMonthlyData();

  // 年計
  const totals = monthlyData.reduce(
    (sum, month) => ({
      videoRevenue: sum.videoRevenue + month.videoRevenue,
      streamRevenue: sum.streamRevenue + month.streamRevenue,
      callRevenue: sum.callRevenue + month.callRevenue,
      yellCoinRevenue: sum.yellCoinRevenue + month.yellCoinRevenue,
      subscriptionRevenue: sum.subscriptionRevenue + month.subscriptionRevenue,
      videoFee: sum.videoFee + month.videoFee,
      streamFee: sum.streamFee + month.streamFee,
      callFee: sum.callFee + month.callFee,
      yellCoinFee: sum.yellCoinFee + month.yellCoinFee,
    }),
    {
      videoRevenue: 0,
      streamRevenue: 0,
      callRevenue: 0,
      yellCoinRevenue: 0,
      subscriptionRevenue: 0,
      videoFee: 0,
      streamFee: 0,
      callFee: 0,
      yellCoinFee: 0,
    }
  );

  const totalRevenue =
    totals.videoRevenue +
    totals.streamRevenue +
    totals.callRevenue +
    totals.yellCoinRevenue +
    totals.subscriptionRevenue;

  const totalFee =
    totals.videoFee +
    totals.streamFee +
    totals.callFee +
    totals.yellCoinFee;

  const handlePrintPDF = () => {
    const printWindow = window.open("", "", "width=1200,height=800");
    const monthNames = [
      "1月", "2月", "3月", "4月", "5月", "6月",
      "7月", "8月", "9月", "10月", "11月", "12月",
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>${selectedYear}年度決算書</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            margin-bottom: 30px;
          }
          .header-info {
            text-align: right;
            margin-bottom: 20px;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: right;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .label {
            text-align: left;
          }
          .total-row {
            background-color: #f9f9f9;
            font-weight: bold;
          }
          .summary {
            margin-top: 30px;
            border: 2px solid #333;
            padding: 15px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 14px;
          }
          .summary-row.total {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          発行日: ${new Date().toLocaleDateString("ja-JP")}
        </div>
        <h1>${selectedYear}年度 年間決算書</h1>
        
        <table>
          <thead>
            <tr>
              <th class="label">区分</th>
              ${monthNames.map((m) => `<th>${m}</th>`).join("")}
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="label">動画販売売上</td>
              ${monthlyData.map((m) => `<td>¥${m.videoRevenue.toLocaleString()}</td>`).join("")}
              <td>¥${totals.videoRevenue.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">ライブ配信売上</td>
              ${monthlyData.map((m) => `<td>¥${m.streamRevenue.toLocaleString()}</td>`).join("")}
              <td>¥${totals.streamRevenue.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">ビデオ通話売上</td>
              ${monthlyData.map((m) => `<td>¥${m.callRevenue.toLocaleString()}</td>`).join("")}
              <td>¥${totals.callRevenue.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">エールコイン売上</td>
              ${monthlyData.map((m) => `<td>¥${m.yellCoinRevenue.toLocaleString()}</td>`).join("")}
              <td>¥${totals.yellCoinRevenue.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">サブスクリプション売上</td>
              ${monthlyData.map((m) => `<td>¥${m.subscriptionRevenue.toLocaleString()}</td>`).join("")}
              <td>¥${totals.subscriptionRevenue.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td class="label">総売上</td>
              ${monthlyData
                .map(
                  (m) =>
                    `<td>¥${(
                      m.videoRevenue +
                      m.streamRevenue +
                      m.callRevenue +
                      m.yellCoinRevenue +
                      m.subscriptionRevenue
                    ).toLocaleString()}</td>`
                )
                .join("")}
              <td>¥${totalRevenue.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th class="label">手数料区分</th>
              ${monthNames.map((m) => `<th>${m}</th>`).join("")}
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="label">動画販売手数料（15%）</td>
              ${monthlyData.map((m) => `<td>¥${m.videoFee.toLocaleString()}</td>`).join("")}
              <td>¥${totals.videoFee.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">ライブ配信手数料（15%）</td>
              ${monthlyData.map((m) => `<td>¥${m.streamFee.toLocaleString()}</td>`).join("")}
              <td>¥${totals.streamFee.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">ビデオ通話手数料（30%）</td>
              ${monthlyData.map((m) => `<td>¥${m.callFee.toLocaleString()}</td>`).join("")}
              <td>¥${totals.callFee.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">エールコイン手数料（10%）</td>
              ${monthlyData.map((m) => `<td>¥${m.yellCoinFee.toLocaleString()}</td>`).join("")}
              <td>¥${totals.yellCoinFee.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td class="label">総手数料</td>
              ${monthlyData
                .map(
                  (m) =>
                    `<td>¥${(
                      m.videoFee +
                      m.streamFee +
                      m.callFee +
                      m.yellCoinFee
                    ).toLocaleString()}</td>`
                )
                .join("")}
              <td>¥${totalFee.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>総売上（全サービス）</span>
            <span>¥${totalRevenue.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>総手数料収入</span>
            <span>¥${totalFee.toLocaleString()}</span>
          </div>
          <div class="summary-row total">
            <span>プラットフォーム純利益</span>
            <span>¥${totalFee.toLocaleString()}</span>
          </div>
        </div>

        <div class="footer">
          <p>※本書は${selectedYear}年1月1日から${selectedYear}年12月31日までの決算を記録したものです</p>
          <p>自動生成ドキュメント - 印刷日時: ${new Date().toLocaleString("ja-JP")}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">年間決算書</h3>
        </div>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-40 bg-secondary border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 年計サマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">動画販売</p>
          <p className="text-lg font-bold">¥{totals.videoRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">ライブ配信</p>
          <p className="text-lg font-bold">¥{totals.streamRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">ビデオ通話</p>
          <p className="text-lg font-bold">¥{totals.callRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">エールコイン</p>
          <p className="text-lg font-bold">¥{totals.yellCoinRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/40 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">総売上</p>
          <p className="text-lg font-bold text-primary">¥{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* 月別売上表 */}
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary">
              <th className="text-left py-3 px-3 font-bold">売上区分</th>
              {["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((m) => (
                <th key={m} className="text-right py-3 px-2 font-bold text-xs">{m}</th>
              ))}
              <th className="text-right py-3 px-3 font-bold">合計</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "動画販売", key: "videoRevenue" },
              { label: "ライブ配信", key: "streamRevenue" },
              { label: "ビデオ通話", key: "callRevenue" },
              { label: "エールコイン", key: "yellCoinRevenue" },
              { label: "サブスク", key: "subscriptionRevenue" },
            ].map(({ label, key }) => (
              <tr key={key} className="border-b border-border/30 hover:bg-secondary/50">
                <td className="py-2 px-3 font-semibold text-xs">{label}</td>
                {monthlyData.map((m, idx) => (
                  <td key={idx} className="text-right py-2 px-2 text-xs">
                    ¥{m[key].toLocaleString()}
                  </td>
                ))}
                <td className="text-right py-2 px-3 font-semibold text-xs">
                  ¥{totals[key].toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-secondary font-bold border-b border-border/50">
              <td className="py-2 px-3">総売上</td>
              {monthlyData.map((m, idx) => (
                <td key={idx} className="text-right py-2 px-2 text-xs">
                  ¥{(
                    m.videoRevenue +
                    m.streamRevenue +
                    m.callRevenue +
                    m.yellCoinRevenue +
                    m.subscriptionRevenue
                  ).toLocaleString()}
                </td>
              ))}
              <td className="text-right py-2 px-3 text-xs">¥{totalRevenue.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 月別手数料表 */}
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary">
              <th className="text-left py-3 px-3 font-bold">手数料区分</th>
              {["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((m) => (
                <th key={m} className="text-right py-3 px-2 font-bold text-xs">{m}</th>
              ))}
              <th className="text-right py-3 px-3 font-bold">合計</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "動画手数料（15%）", key: "videoFee" },
              { label: "配信手数料（15%）", key: "streamFee" },
              { label: "通話手数料（30%）", key: "callFee" },
              { label: "コイン手数料（10%）", key: "yellCoinFee" },
            ].map(({ label, key }) => (
              <tr key={key} className="border-b border-border/30 hover:bg-secondary/50">
                <td className="py-2 px-3 font-semibold text-xs">{label}</td>
                {monthlyData.map((m, idx) => (
                  <td key={idx} className="text-right py-2 px-2 text-xs">
                    ¥{m[key].toLocaleString()}
                  </td>
                ))}
                <td className="text-right py-2 px-3 font-semibold text-xs">
                  ¥{totals[key].toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-secondary font-bold">
              <td className="py-2 px-3">総手数料</td>
              {monthlyData.map((m, idx) => (
                <td key={idx} className="text-right py-2 px-2 text-xs">
                  ¥{(
                    m.videoFee +
                    m.streamFee +
                    m.callFee +
                    m.yellCoinFee
                  ).toLocaleString()}
                </td>
              ))}
              <td className="text-right py-2 px-3 text-xs">¥${totalFee.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PDF出力ボタン */}
      <Button
        onClick={handlePrintPDF}
        className="w-full gap-2 bg-primary hover:bg-primary/90"
      >
        <Download className="w-4 h-4" />
        {selectedYear}年度決算書をPDF出力
      </Button>
    </div>
  );
}