import React from "react";
import { Wallet, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function UnpaidBalanceCard({ unpaidBalance }) {
  const isPayable = unpaidBalance >= 1000;

  return (
    <div className={`border rounded-2xl p-5 flex items-center gap-4 ${isPayable ? "bg-green-500/5 border-green-500/30" : "bg-card border-border/50"}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPayable ? "bg-green-500/20" : "bg-secondary"}`}>
        <Wallet className={`w-6 h-6 ${isPayable ? "text-green-400" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">未払い残高（累計）</p>
        <p className={`text-2xl font-black ${isPayable ? "text-green-400" : "text-foreground"}`}>
          ¥{Math.floor(unpaidBalance).toLocaleString()}
        </p>
        {!isPayable && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            振込申請には¥1,000以上必要です
          </p>
        )}
        {isPayable && (
          <p className="text-[11px] text-green-400 mt-0.5">振込申請が可能です</p>
        )}
      </div>
      <Link to="/revenue">
        <Button
          size="sm"
          variant={isPayable ? "default" : "outline"}
          className={`gap-1.5 shrink-0 ${isPayable ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
        >
          振込申請 <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}