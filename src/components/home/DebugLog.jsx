import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, X } from "lucide-react";
import { toast } from "sonner";

export default function DebugLog() {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // コンソールをキャプチャ
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (level, args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        level,
        message,
        time: new Date().toLocaleTimeString('ja-JP', { hour12: false })
      }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };
    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };
    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };
    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  const handleCopy = () => {
    const logText = logs.map(l => `[${l.time}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('コピーしました');
  };

  const handleClear = () => {
    setLogs([]);
  };

  const levelColors = {
    log: 'text-cyan-400',
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="bg-black/95 border border-cyan-500/40 rounded-lg shadow-2xl backdrop-blur">
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-black/80 transition-colors border-b border-cyan-500/20"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-2 h-2 rounded-full ${logs.length > 0 ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs font-mono text-cyan-400 truncate">DEBUG LOG ({logs.length})</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {expanded && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                  title="コピー"
                >
                  <Copy className="w-3 h-3 text-cyan-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  title="クリア"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </>
            )}
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-cyan-400" />
            ) : (
              <ChevronUp className="w-3 h-3 text-cyan-400" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="max-h-80 overflow-y-auto bg-black/50">
            {logs.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500 text-center">
                ログなし
              </div>
            ) : (
              <div className="space-y-0">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`px-2 py-1 text-[11px] font-mono border-b border-gray-800/50 last:border-b-0 hover:bg-gray-900/50 transition-colors ${levelColors[log.level]}`}
                  >
                    <span className="text-gray-600">[{log.time}]</span>
                    {' '}
                    <span className="font-bold">{log.level}</span>
                    {': '}
                    <span className="text-white break-words whitespace-pre-wrap">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {copied && (
          <div className="px-3 py-1 text-[10px] text-cyan-400 border-t border-cyan-500/20 bg-cyan-500/10 text-center">
            コピーしました
          </div>
        )}
      </div>
    </div>
  );
}