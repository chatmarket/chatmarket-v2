import React, { useEffect, useState } from "react";

// Detect if a string is purely emoji characters (for animation)
const EMOJI_REGEX = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\u200D)+$/u;

function isEmojiOnly(str) {
  return EMOJI_REGEX.test(str.trim());
}

export default function MotionMessage({ content }) {
  const [frame, setFrame] = useState(0);
  const chars = [...content]; // emoji-safe split
  const shouldAnimate = chars.length >= 2 && chars.length <= 6 && isEmojiOnly(content);

  useEffect(() => {
    if (!shouldAnimate) return;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % chars.length);
    }, 350);
    return () => clearInterval(interval);
  }, [shouldAnimate, content]);

  if (!shouldAnimate) {
    return <span className="text-sm text-foreground/80">{content}</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {chars.map((char, i) => (
        <span
          key={i}
          className="inline-block transition-transform duration-300 text-xl"
          style={{
            transform: `scale(${frame === i ? 1.5 : 1})`,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}