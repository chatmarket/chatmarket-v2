import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ScrollRow({ children, cardWidth = 280, mobileCardWidth }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [children]);

  const scroll = (dir) => {
    ref.current?.scrollBy({ left: dir * cardWidth * 2, behavior: "smooth" });
  };

  return (
    <div className="relative group/row">
      {/* Left arrow */}
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors -translate-x-1/2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={ref}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {React.Children.map(children, (child) => (
          <div className="shrink-0" style={{ width: mobileCardWidth ? `min(${cardWidth}px, ${mobileCardWidth})` : cardWidth }}>
            {child}
          </div>
        ))}
      </div>

      {/* Right arrow */}
      {canRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors translate-x-1/2"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}