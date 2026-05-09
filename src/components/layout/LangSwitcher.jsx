import React, { useState } from "react";
import { getLang, setLang } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LANGS = [
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export default function LangSwitcher() {
  const [current, setCurrent] = useState(getLang());

  const handleChange = (code) => {
    setLang(code);
    setCurrent(code);
    window.location.reload();
  };

  const currentLang = LANGS.find(l => l.code === current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Language" className="gap-1.5 px-2">
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">{currentLang?.flag} {currentLang?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleChange(l.code)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span>{l.flag}</span>
              <span className={current === l.code ? "text-primary font-semibold" : ""}>{l.label}</span>
            </span>
            {current === l.code && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}