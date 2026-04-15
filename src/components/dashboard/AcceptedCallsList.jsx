import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PhoneCall, Clock, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AcceptedCallsList({ userEmail }) {
  const navigate = useNavigate();

  const { data: acceptedCalls = [] } = useQuery({
    queryKey: ["accepted-calls", userEmail],
    queryFn: async () => {
      // 承認済みまたは進行中の通話を取得（両方のロール）
      const asCaller = await base44.entities.VideoCall.filter({
        caller_email: userEmail,
        status: "accepted"
      });
      const asCallee = await base44.entities.VideoCall.filter({
        callee_email: userEmail,
        status: "accepted"
      });
      return [...asCaller, ...asCallee];
    },
    enabled: !!userEmail,
    refetchInterval: 5000,
  });

  if (acceptedCalls.length === 0) return null;

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <PhoneCall className="w-5 h-5 text-green-400" />
        <h3 className="font-bold text-lg text-green-400">承認済み通話</h3>
      </div>
      
      <div className="space-y-3">
        {acceptedCalls.map((call) => (
          <div key={call.id} className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">
                {userEmail === call.caller_email ? call.callee_name : call.caller_name}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                {call.duration_minutes}分
              </div>
            </div>
            <Button
              onClick={() => navigate(`/call/${call.id}`)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2 h-10"
            >
              <PhoneCall className="w-4 h-4" />
              通話を開始
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}