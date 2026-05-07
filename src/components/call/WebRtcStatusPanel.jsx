/**
 * WebRtcStatusPanel — WebRTC接続診断パネル（画面上リアルタイム表示）
 * 社長が接続状況を確認できるよう、失敗理由と進捗を明示する
 */
import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  connecting:       { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: true,  label: '接続中' },
  cleared:          { icon: Loader2, color: 'text-blue-400',   bg: 'bg-blue-500/10',   spin: true,  label: 'リセット完了' },
  waiting_callee:   { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: true,  label: 'ライバー待ち' },
  callee_ready:     { icon: Loader2, color: 'text-blue-400',   bg: 'bg-blue-500/10',   spin: true,  label: 'Offer待ち' },
  offering:         { icon: Loader2, color: 'text-blue-400',   bg: 'bg-blue-500/10',   spin: true,  label: 'ICE収集中' },
  offer_sent:       { icon: Loader2, color: 'text-blue-400',   bg: 'bg-blue-500/10',   spin: true,  label: 'Offer送信済み' },
  offer_received:   { icon: Loader2, color: 'text-blue-400',   bg: 'bg-blue-500/10',   spin: true,  label: 'Offer受信' },
  answering:        { icon: Loader2, color: 'text-blue-400',   bg: 'bg-blue-500/10',   spin: true,  label: 'Answer作成中' },
  answer_sent:      { icon: Loader2, color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   spin: true,  label: 'Answer送信済み' },
  answer_applied:   { icon: Loader2, color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   spin: true,  label: 'Answer適用済み' },
  ice_checking:     { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: true,  label: 'ICE経路チェック中' },
  ice_connected:    { icon: Wifi,    color: 'text-green-400',  bg: 'bg-green-500/10',  spin: false, label: 'ICE確立' },
  track_received:   { icon: Wifi,    color: 'text-green-400',  bg: 'bg-green-500/10',  spin: false, label: '映像受信中' },
  connected:        { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', spin: false, label: '接続完了' },
  disconnected:     { icon: WifiOff, color: 'text-orange-400', bg: 'bg-orange-500/10', spin: false, label: '一時切断' },
  retrying:         { icon: RefreshCw, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: true, label: '再試行中' },
  ice_error:        { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', spin: false, label: 'ICEエラー' },
  ice_failed:       { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false, label: 'ICE失敗' },
  failed:           { icon: WifiOff, color: 'text-red-400',    bg: 'bg-red-500/10',    spin: false, label: '接続失敗' },
  answer_timeout:   { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false, label: 'Answerタイムアウト' },
  offer_timeout:    { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false, label: 'Offerタイムアウト' },
  give_up:          { icon: WifiOff, color: 'text-red-400',    bg: 'bg-red-500/10',    spin: false, label: '接続断念' },
  warning:          { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: false, label: '警告' },
  error:            { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false, label: 'エラー' },
};

export default function WebRtcStatusPanel({ status, detail, visible = true }) {
  if (!visible || !status || status === 'connected') return null;

  const cfg = STATUS_CONFIG[status] || { icon: Loader2, color: 'text-white/60', bg: 'bg-white/5', spin: true, label: status };
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bg} border border-white/10 max-w-xs`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
      <div className="min-w-0">
        <p className={`text-xs font-bold ${cfg.color} leading-none`}>{cfg.label}</p>
        {detail && (
          <p className="text-[10px] text-white/40 mt-0.5 leading-tight truncate max-w-[200px]" title={detail}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}