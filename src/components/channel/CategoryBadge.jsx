import React from "react";
import { getCategoryById } from "@/lib/categories";

export default function CategoryBadge({ categoryId, tags = [], size = "sm" }) {
  const cat = getCategoryById(categoryId);

  return (
    <div className="flex flex-wrap gap-1.5">
      {cat && (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cat.badgeColor} bg-opacity-20`}>
          <span>{cat.emoji}</span>
          {cat.label}
        </span>
      )}
      {tags.slice(0, 5).map((tag) => (
        <span key={tag} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
          #{tag}
        </span>
      ))}
    </div>
  );
}