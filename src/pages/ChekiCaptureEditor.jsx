import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pen, Eraser, RotateCcw, Check, Download, Loader2, Camera, User } from "lucide-react";

// チェキフレーム画像（ポラロイド風）をCanvasで描画
const FRAME_COLOR = "#f5f0e8";
const WATERMARK_TEXT = "Chat Market  SAMPLE";

export default function ChekiCaptureEditor() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // state から通話情報を受け取る
  const {
    idolSnapshot,      // アイドル映像のbase64 (dataURL)
    fanSnapshot,       // ファン映像のbase64 or null
    callId,
    fanEmail,
    fanName,
    purchaseId,        // DigitalChekiPurchase.id (既存 or null)
  } = state || {};

  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null); // 手書きレイヤー
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen"); // "pen" | "eraser"
  const [penColor, setPenColor] = useState("#FF1493");
  const [penSize, setPenSize] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(true); // true=ウォーターマーク付き
  const lastPosRef = useRef(null);

  const CANVAS_W = 600;
  const CANVAS_H = 700;

  // ---- ベース画像（チェキフレーム + 写真）をCanvasに描画 ----
  const drawBaseImage = useCallback((canvas, withWatermark = true) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ポラロイド風背景
    ctx.fillStyle = FRAME_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 影
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#fff";
    ctx.fillRect(20, 20, CANVAS_W - 40, CANVAS_H - 60);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const photoTop = 30;
    const photoH = CANVAS_H - 140;
    const photoW = CANVAS_W - 50;
    const photoX = 25;

    const drawPhoto = (src, x, y, w, h, fallbackLabel) => {
      if (src) {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          ctx.drawImage(img, x, y, w, h);
          ctx.restore();
          // 手書きレイヤーを重ねて再描画
          compositeDrawing(canvas);
          if (withWatermark) drawWatermark(canvas);
        };
        img.src = src;
      } else {
        // カメラOFF → アイコン表示
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(fallbackLabel || "カメラOFF", x + w / 2, y + h / 2 + 5);
        // ユーザーアイコン（円）
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 - 30, 28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fill();
        ctx.font = "40px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText("👤", x + w / 2 - 20, y + h / 2 - 10);
      }
    };

    if (fanSnapshot) {
      // ツーショット: 左=アイドル, 右=ファン
      const halfW = photoW / 2 - 4;
      drawPhoto(idolSnapshot, photoX, photoTop, halfW, photoH, "アイドル");
      drawPhoto(fanSnapshot, photoX + halfW + 8, photoTop, halfW, photoH, fanName || "ファン");
      // 仕切り線
      ctx.strokeStyle = FRAME_COLOR;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(photoX + halfW + 4, photoTop);
      ctx.lineTo(photoX + halfW + 4, photoTop + photoH);
      ctx.stroke();
    } else {
      drawPhoto(idolSnapshot, photoX, photoTop, photoW, photoH, "アイドル");
    }

    // 下部テキストエリア（ポラロイド余白）
    ctx.fillStyle = FRAME_COLOR;
    ctx.fillRect(0, photoTop + photoH + 10, CANVAS_W, 100);

    // ロゴ
    ctx.fillStyle = "#888";
    ctx.font = "bold 13px 'Noto Serif JP', serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ Chat Market ✦", CANVAS_W / 2, CANVAS_H - 25);

    if (withWatermark) {
      drawWatermark(canvas);
    }
  }, [idolSnapshot, fanSnapshot, fanName]);

  const drawWatermark = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.font = "bold 38px sans-serif";
    ctx.textAlign = "center";
    // 対角線上に複数配置
    for (let row = -1; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.save();
        ctx.translate(col * 220 + (row % 2 === 0 ? 0 : 100), row * 180 + 80);
        ctx.rotate(-Math.PI / 7);
        ctx.fillText(WATERMARK_TEXT, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  const compositeDrawing = (baseCanvas) => {
    if (!drawingCanvasRef.current || !baseCanvas) return;
    const ctx = baseCanvas.getContext("2d");
    ctx.drawImage(drawingCanvasRef.current, 0, 0);
  };

  useEffect(() => {
    if (canvasRef.current && drawingCanvasRef.current) {
      drawingCanvasRef.current.width = CANVAS_W;
      drawingCanvasRef.current.height = CANVAS_H;
      drawBaseImage(canvasRef.current, true);
    }
  }, [drawBaseImage]);

  // ---- 手書きロジック ----
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e, canvasRef.current);
    lastPosRef.current = pos;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !lastPosRef.current) return;
    const pos = getPos(e, canvasRef.current);
    const drawCtx = drawingCanvasRef.current.getContext("2d");
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";

    if (tool === "eraser") {
      drawCtx.globalCompositeOperation = "destination-out";
      drawCtx.lineWidth = penSize * 4;
    } else {
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.strokeStyle = penColor;
      drawCtx.lineWidth = penSize;
    }

    drawCtx.beginPath();
    drawCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
    lastPosRef.current = pos;

    // ベースを再描画してドローイングを合成
    drawBaseImage(canvasRef.current, previewMode);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearDrawing = () => {
    const ctx = drawingCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBaseImage(canvasRef.current, previewMode);
  };

  // ---- 完成・保存 ----
  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);

    // ウォーターマークなしで最終画像を生成
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = CANVAS_W;
    finalCanvas.height = CANVAS_H;
    drawBaseImage(finalCanvas, false); // ウォーターマークなし

    // 少し待ってから画像を取得（非同期描画が完了するまで）
    await new Promise((r) => setTimeout(r, 300));

    // 手書きレイヤーを合成（ウォーターマークなし版）
    const finalCtx = finalCanvas.getContext("2d");
    if (drawingCanvasRef.current) {
      finalCtx.drawImage(drawingCanvasRef.current, 0, 0);
    }

    finalCanvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], `cheki_${Date.now()}.png`, { type: "image/png" });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        if (purchaseId) {
          // 既存の購入記録に納品画像を設定
          await base44.entities.DigitalChekiPurchase.update(purchaseId, {
            delivered_image_url: file_url,
            status: "completed",
          });
        } else {
          // 新規作成（通話後の直接チェキ）
          await base44.entities.DigitalChekiPurchase.create({
            cheki_id: "",
            channel_id: "",
            owner_email: (await base44.auth.me()).email,
            buyer_email: fanEmail || "",
            buyer_name: fanName || "",
            cheki_title: "通話チェキ",
            cheki_image_url: "",
            price_yen: 0,
            delivered_image_url: file_url,
            status: "completed",
          });
        }

        toast.success("チェキを納品しました！ファンに届きました🎉");
        navigate(-1);
      } catch (err) {
        toast.error("保存に失敗しました: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }, "image/png");
  };

  const PEN_COLORS = ["#FF1493", "#FF4500", "#FFD700", "#00FF7F", "#00BFFF", "#fff", "#000"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-2xl space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-pink-400" />
          <h1 className="text-xl font-black text-foreground">デジタルチェキを作成</h1>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {fanSnapshot ? "ツーショット" : "アイドル単体"}
          </span>
        </div>

        {/* ツールバー */}
        <div className="bg-card border border-border/50 rounded-xl p-3 flex flex-wrap items-center gap-3">
          {/* ペン/消しゴム */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool("pen")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${tool === "pen" ? "bg-pink-500/20 text-pink-400 border border-pink-500/40" : "bg-secondary text-muted-foreground"}`}
            >
              <Pen className="w-3.5 h-3.5" /> ペン
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${tool === "eraser" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "bg-secondary text-muted-foreground"}`}
            >
              <Eraser className="w-3.5 h-3.5" /> 消しゴム
            </button>
          </div>

          {/* 色選択 */}
          <div className="flex gap-1.5 items-center">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setTool("pen"); setPenColor(c); }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: penColor === c ? "#fff" : "transparent",
                  boxShadow: penColor === c ? "0 0 0 2px rgba(255,255,255,0.5)" : "none",
                }}
              />
            ))}
          </div>

          {/* ペンサイズ */}
          <input
            type="range"
            min="2"
            max="20"
            value={penSize}
            onChange={(e) => setPenSize(Number(e.target.value))}
            className="w-20 accent-pink-500"
          />
          <span className="text-xs text-muted-foreground">{penSize}px</span>

          {/* クリア */}
          <button onClick={clearDrawing} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> クリア
          </button>
        </div>

        {/* Canvas */}
        <div className="relative w-full rounded-xl overflow-hidden border border-pink-500/30 shadow-lg shadow-pink-500/10"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {/* 隠し手書きレイヤー */}
          <canvas ref={drawingCanvasRef} style={{ display: "none" }} />

          {/* SAMPLEバッジ */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white/70 text-[10px] font-bold px-2 py-0.5 rounded-full">
            SAMPLE（納品時に除去）
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-black gap-2 shadow-lg shadow-pink-500/30"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
            ) : (
              <><Check className="w-4 h-4" /> 完成・ファンに納品</>
            )}
          </Button>
        </div>

        {/* 説明 */}
        <p className="text-xs text-muted-foreground text-center">
          📸 手書きサインや文字を書いて「完成・ファンに納品」を押すと、ウォーターマークなしの本番チェキが届きます
        </p>
      </div>
    </div>
  );
}