import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * 単一CTA原則：次に何をするか、たったひとつ。
 * 迷わせない、シンプルな導線。
 */
export default function SingleCTASection({ label, icon: Icon, href, className = "" }) {
  return (
    <Link to={href}>
      <button
        className={`w-full sm:w-auto flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-base transition-all hover:scale-105 active:scale-95 ${className}`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        <span>{label}</span>
        <ChevronRight className="w-5 h-5 opacity-70" />
      </button>
    </Link>
  );
}