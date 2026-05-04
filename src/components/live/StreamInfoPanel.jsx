import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

/**
 * StreamInfoPanel
 * 映像直下に表示: タイトル + プロフィール + 折りたたみ概要
 */
export default function StreamInfoPanel({ stream }) {
  const [descOpen, setDescOpen] = useState(false);

  if (!stream) return null;

  return (
    <div style={{ width: "100%", maxWidth: "calc((100vh - 56px - 220px) * 16/9)", background: "rgba(16, 19, 20, 0.8)", border: "1px solid rgba(16,185,129,0.2)", borderTop: "none", borderRadius: "0 0 20px 20px", backdropFilter: "blur(12px)", padding: "14px 12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      
      {/* タイトル */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ color: "white", fontSize: 16, fontWeight: 900, lineHeight: 1.3, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          {stream.title}
        </h2>
      </div>

      {/* プロフィール */}
      <Link
        to={`/channel/${stream.channel_id}`}
        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", transition: "all 0.2s" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(16,185,129,0.15)";
          e.currentTarget.style.borderColor = "rgba(16,185,129,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(16,185,129,0.08)";
          e.currentTarget.style.borderColor = "rgba(16,185,129,0.15)";
        }}
      >
        {stream.channel_avatar && (
          <img src={stream.channel_avatar} alt={stream.channel_name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#10b981", fontSize: 13, fontWeight: 900, margin: 0 }}>
            {stream.channel_name}
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "2px 0 0", fontWeight: 600 }}>
            プロフィール →
          </p>
        </div>
      </Link>

      {/* 折りたたみ概要 */}
      {stream.description && (
        <div>
          <button
            onClick={() => setDescOpen(!descOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
          >
            <span>ℹ️ 概要を表示</span>
            <ChevronDown style={{ width: 14, height: 14, marginLeft: "auto", transform: descOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>
          {descOpen && (
            <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {stream.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}