/**
 * ViewerStream — TEST VERSION
 * This file has been replaced to verify deployment
 */
import React from "react";

export default function ViewerStream({ stream }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        color: "#00ff00",
        fontSize: "48px",
        fontWeight: "bold",
        fontFamily: "monospace",
        textAlign: "center",
        textShadow: "0 0 20px #00ff00",
      }}>
        TEST-OK
        <div style={{ fontSize: "16px", color: "#fff", marginTop: "12px" }}>
          {new Date().toISOString()}
        </div>
        <div style={{ fontSize: "14px", color: "#aaa", marginTop: "8px" }}>
          {stream?.ivs_playback_url || "no url"}
        </div>
      </div>
    </div>
  );
}