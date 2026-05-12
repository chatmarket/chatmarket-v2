/**
 * PrismOverlayTest — 生存確認ページ（デバッグ専用）
 * - 背景: 真っ赤 rgba(255,0,0,1.0)
 * - JS最小限
 * - これがPRISMに映れば「ページ自体は読み込めている」証明
 */
export default function PrismOverlayTest() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgb(255, 0, 0)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483647,
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}
    >
      <div
        style={{
          color: "#ffffff",
          fontSize: "clamp(32px, 10vw, 64px)",
          fontWeight: "900",
          textAlign: "center",
          WebkitTextStroke: "2px #000",
          textShadow: "0 0 20px rgba(0,0,0,0.8)",
          letterSpacing: "2px",
          marginBottom: "24px",
        }}
      >
        ✅ PRISM 読み込み成功
      </div>
      <div
        style={{
          color: "#fff",
          fontSize: "clamp(14px, 4vw, 22px)",
          fontWeight: "700",
          textAlign: "center",
          background: "rgba(0,0,0,0.5)",
          padding: "12px 24px",
          borderRadius: "12px",
          maxWidth: "80vw",
        }}
      >
        このページが赤く表示されていれば<br />
        WebOverlay は正常に動作しています
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          color: "rgba(255,255,255,0.7)",
          fontSize: "11px",
          fontFamily: "monospace",
        }}
      >
        Chat Market — Debug Mode — {new Date().toISOString()}
      </div>
    </div>
  );
}