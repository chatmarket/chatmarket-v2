import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard クリエイターモード用
 * 占い予約を目立たせるカード（最上位に配置）
 */
export default function UpcomingAppointmentsCard({ appointments }) {
  if (!appointments || appointments.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-400 animate-pulse" />
        <h2 className="text-sm font-black text-white">予約済み鑑定セッション</h2>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
          {appointments.length}件
        </span>
      </div>
      <div className="space-y-2">
        {appointments.slice(0, 3).map((appt) => {
          const apptTime = new Date(`${appt.confirmed_date}T${appt.confirmed_time}`);
          const minutesUntil = Math.max(0, Math.floor((apptTime - new Date()) / 60000));
          const isIminent = minutesUntil < 30;

          return (
            <div
              key={appt.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isIminent
                  ? "bg-red-500/10 border-red-500/40 animate-pulse"
                  : "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-300">
                {appt.requester_name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{appt.requester_name}</p>
                <p className="text-xs text-purple-300/70">
                  {appt.confirmed_date} {appt.confirmed_time}
                </p>
                {isIminent && <p className="text-[10px] text-red-400 font-bold mt-0.5">⏰ あと {minutesUntil} 分</p>}
              </div>
              <Link to="/fortune-calendar">
                <Button
                  size="sm"
                  className={`text-xs shrink-0 ${
                    isIminent
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-purple-500 hover:bg-purple-600"
                  }`}
                >
                  {isIminent ? "今すぐ入室" : "入室"}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}