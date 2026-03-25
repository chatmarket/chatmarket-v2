import React, { useEffect, useState } from "react";
import { MOTION_DISPLAY } from "./EmojiPicker";

export default function MotionMessage({ content }) {
  const [frame, setFrame] = useState(0);
  const motionKey = Object.keys(MOTION_DISPLAY).find((k) => content.includes(k));

  useEffect(() => {
    if (!motionKey) return;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 3);
    }, 400);
    return () => clearInterval(interval);
  }, [motionKey]);

  if (!motionKey) return <span className="text-sm text-foreground/80">{content}</span>;

  const frames = MOTION_DISPLAY[motionKey].split("");
  // Animate: show a subset of emojis per frame for wave effect
  const emojis = MOTION_DISPLAY[motionKey];
  const scales = [1, 1.3, 1];

  return (
    <span className="inline-flex items-center gap-0.5">
      {emojis.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block transition-transform duration-300 text-lg"
          style={{
            transform: `scale(${frame === i % 3 ? 1.4 : 1})`,
          }}
        >
          {char}
        </span>
      ))}
      <span className="text-xs text-muted-foreground ml-1">{motionKey}</span>
    </span>
  );
}