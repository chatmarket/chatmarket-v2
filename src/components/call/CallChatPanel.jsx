import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageCircle, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

export default function CallChatPanel({ call, user }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentCall, setCurrentCall] = useState(call);
  const bottomRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const redirectedRef = useRef(false);

  const threadId = call && user ? makeThreadId(call.caller_email, call.callee_email) : null;

  // 3秒ごとにステータスポーリング
  useEffect(() => {
    if (!call?.id) return;

    const pollStatus = async () => {
      try {
        const calls = await base44.entities.VideoCall.filter({ id: call.id });
        const updatedCall = calls[0];
        if (!updatedCall) return;

        console.log(`📞 Polled call status: ${updatedCall.status}`);
        setCurrentCall(updatedCall);

        // accepted → VideoCallPageへリダイレクト
        if (updatedCall.status === "accepted" && !redirectedRef.current) {
          redirectedRef.current = true;
          console.log(`✅ Call accepted! Redirecting to /video-call/${call.id}`);
          setTimeout(() => navigate(`/video-call/${call.id}`), 300);
        }
      } catch (err) {
        console.error('Failed to poll call status:', err);
      }
    };

    pollStatus();
    pollingIntervalRef.current = setInterval(pollStatus, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [call?.id, navigate]);

  useEffect(() => {
    console.log(`📞 CallChatPanel Debug:`, { call_id: call?.id, call_status: currentCall?.status, user_email: user?.email, threadId });
  }, [call, user, currentCall]);

  useEffect(() => {
    if (!threadId) return;
    
    // メッセージ履歴を取得
    base44.entities.DirectChat.filter({ thread_id: threadId })
      .then((msgs) => {
        console.log(`📨 Loaded ${msgs.length} messages for thread ${threadId}`);
        setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
      });

    // リアルタイム購読
    const unsub = base44.entities.DirectChat.subscribe((event) => {
      if (event.data?.thread_id === threadId) {
        if (event.type === "create") {
          console.log('📨 New message received');
          setMessages((prev) => [...prev, event.data]);
        }
        if (event.type === "update") {
          setMessages((prev) => prev.map((m) => m.id === event.id ? event.data : m));
        }
      }
    });
    return () => unsub();
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !call || !user || !threadId) return;
    setSending(true);
    const toEmail = user.email === call.caller_email ? call.callee_email : call.caller_email;
    try {
      await base44.entities.DirectChat.create({
        from_email: user.email,
        from_name: user.full_name || user.email,
        to_channel_owner_email: toEmail,
        to_channel_id: call.callee_channel_id || "",
        to_channel_name: call.callee_name || "",
        content: input.trim(),
        yell_coin: 0,
        thread_id: threadId,
      });
      console.log(`✅ Message sent from ${user.email} to ${toEmail} in thread ${threadId}`);
      setInput("");
    } catch (err) {
      console.error(`❌ Failed to send message: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: "#00ff9d" }} />
          <p className="text-sm font-bold text-white">チャット</p>
        </div>
        {currentCall?.status === "active" && (
          <button
            onClick={() => navigate(`/video-call/${currentCall.id}`)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 text-xs font-bold transition-all"
          >
            <Phone className="w-3 h-3" /> 通話画面
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-white/30 text-xs pt-8">メッセージなし</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.from_email === user?.email;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMe
                    ? "text-black font-semibold"
                    : "bg-white/10 text-white"
                }`}
                style={isMe ? {
                  background: "#00ff9d",
                  boxShadow: "0 0 8px rgba(0,255,157,0.4)",
                } : {}}
              >
                {!isMe && (
                  <p className="text-[10px] text-white/50 mb-0.5">{msg.from_name}</p>
                )}
                <p>{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="メッセージを入力..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/60"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all"
          style={{
            background: "rgba(0,255,157,0.15)",
            border: "1px solid rgba(0,255,157,0.4)",
          }}
        >
          <Send className="w-4 h-4" style={{ color: "#00ff9d" }} />
        </button>
      </div>
    </div>
  );
}