import React, { useState, useEffect } from "react";
import { Globe, Clock, BookOpen } from "lucide-react";

// 言語マスター（コード → {name, flag}）
export const LANGUAGES = [
  { code: "ja", name: "日本語",     flag: "🇯🇵" },
  { code: "en", name: "English",    flag: "🇺🇸" },
  { code: "ko", name: "한국어",     flag: "🇰🇷" },
  { code: "zh", name: "中文",       flag: "🇨🇳" },
  { code: "fr", name: "Français",   flag: "🇫🇷" },
  { code: "de", name: "Deutsch",    flag: "🇩🇪" },
  { code: "es", name: "Español",    flag: "🇪🇸" },
  { code: "pt", name: "Português",  flag: "🇧🇷" },
  { code: "it", name: "Italiano",   flag: "🇮🇹" },
  { code: "ru", name: "Русский",    flag: "🇷🇺" },
  { code: "ar", name: "العربية",   flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी",     flag: "🇮🇳" },
  { code: "th", name: "ภาษาไทย",   flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", name: "Bahasa",     flag: "🇮🇩" },
  { code: "tr", name: "Türkçe",     flag: "🇹🇷" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski",     flag: "🇵🇱" },
  { code: "sv", name: "Svenska",    flag: "🇸🇪" },
  { code: "tl", name: "Filipino",   flag: "🇵🇭" },
];

// 国マスター（コード → timezone）
export const COUNTRIES = [
  { code: "JP", name: "日本",          flag: "🇯🇵", tz: "Asia/Tokyo" },
  { code: "US", name: "USA",           flag: "🇺🇸", tz: "America/New_York" },
  { code: "KR", name: "韓国",          flag: "🇰🇷", tz: "Asia/Seoul" },
  { code: "CN", name: "中国",          flag: "🇨🇳", tz: "Asia/Shanghai" },
  { code: "TW", name: "台湾",          flag: "🇹🇼", tz: "Asia/Taipei" },
  { code: "HK", name: "香港",          flag: "🇭🇰", tz: "Asia/Hong_Kong" },
  { code: "SG", name: "Singapore",     flag: "🇸🇬", tz: "Asia/Singapore" },
  { code: "TH", name: "Thailand",      flag: "🇹🇭", tz: "Asia/Bangkok" },
  { code: "VN", name: "Vietnam",       flag: "🇻🇳", tz: "Asia/Ho_Chi_Minh" },
  { code: "PH", name: "Philippines",   flag: "🇵🇭", tz: "Asia/Manila" },
  { code: "ID", name: "Indonesia",     flag: "🇮🇩", tz: "Asia/Jakarta" },
  { code: "MY", name: "Malaysia",      flag: "🇲🇾", tz: "Asia/Kuala_Lumpur" },
  { code: "IN", name: "India",         flag: "🇮🇳", tz: "Asia/Kolkata" },
  { code: "AU", name: "Australia",     flag: "🇦🇺", tz: "Australia/Sydney" },
  { code: "NZ", name: "New Zealand",   flag: "🇳🇿", tz: "Pacific/Auckland" },
  { code: "GB", name: "UK",            flag: "🇬🇧", tz: "Europe/London" },
  { code: "FR", name: "France",        flag: "🇫🇷", tz: "Europe/Paris" },
  { code: "DE", name: "Germany",       flag: "🇩🇪", tz: "Europe/Berlin" },
  { code: "IT", name: "Italy",         flag: "🇮🇹", tz: "Europe/Rome" },
  { code: "ES", name: "Spain",         flag: "🇪🇸", tz: "Europe/Madrid" },
  { code: "PT", name: "Portugal",      flag: "🇵🇹", tz: "Europe/Lisbon" },
  { code: "NL", name: "Netherlands",   flag: "🇳🇱", tz: "Europe/Amsterdam" },
  { code: "SE", name: "Sweden",        flag: "🇸🇪", tz: "Europe/Stockholm" },
  { code: "NO", name: "Norway",        flag: "🇳🇴", tz: "Europe/Oslo" },
  { code: "RU", name: "Russia",        flag: "🇷🇺", tz: "Europe/Moscow" },
  { code: "TR", name: "Turkey",        flag: "🇹🇷", tz: "Europe/Istanbul" },
  { code: "BR", name: "Brazil",        flag: "🇧🇷", tz: "America/Sao_Paulo" },
  { code: "MX", name: "Mexico",        flag: "🇲🇽", tz: "America/Mexico_City" },
  { code: "CA", name: "Canada",        flag: "🇨🇦", tz: "America/Toronto" },
  { code: "AE", name: "UAE",           flag: "🇦🇪", tz: "Asia/Dubai" },
  { code: "SA", name: "Saudi Arabia",  flag: "🇸🇦", tz: "Asia/Riyadh" },
  { code: "ZA", name: "South Africa",  flag: "🇿🇦", tz: "Africa/Johannesburg" },
];

export function getLang(code) {
  return LANGUAGES.find((l) => l.code === code);
}

export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code);
}

// ── リアルタイム時計 ──
export function LocalTimeClock({ countryCode }) {
  const [time, setTime] = useState("");
  const country = getCountry(countryCode);

  useEffect(() => {
    if (!country) return;
    const update = () => {
      try {
        setTime(new Intl.DateTimeFormat("en-US", {
          timeZone: country.tz,
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: false,
        }).format(new Date()));
      } catch { setTime(""); }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [country]);

  if (!country || !time) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-2 py-1">
      <Clock className="w-3 h-3 text-primary shrink-0" />
      <span className="font-mono font-semibold text-foreground">{time}</span>
      <span>{country.flag} Local Time</span>
    </div>
  );
}

// ── 言語バッジ表示（読み取り専用） ──
export function LanguageBadges({ nativeLang, learningLangs = [] }) {
  const native = getLang(nativeLang);
  const learning = learningLangs.map(getLang).filter(Boolean);
  if (!native && learning.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {native && (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/15 border border-primary/30 text-primary">
          <span className="text-base">{native.flag}</span>
          <span>Native: {native.name}</span>
        </div>
      )}
      {learning.map((lang) => (
        <div key={lang.code} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-secondary border border-border/50 text-muted-foreground">
          <span className="text-base">{lang.flag}</span>
          <span>Learning: {lang.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── 学習ステータス表示（読み取り専用） ──
export function LearningStatusBadge({ text, compact = false }) {
  if (!text) return null;
  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 max-w-full overflow-hidden">
        <BookOpen className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{text}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
      <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-300 leading-relaxed">{text}</p>
    </div>
  );
}

// ── 編集フォーム ──
export function GlobalProfileEditor({ form, onChange }) {
  const learningLangs = form.learning_languages || [];

  const toggleLearning = (code) => {
    if (code === form.native_language) return; // ネイティブと同じはNG
    const next = learningLangs.includes(code)
      ? learningLangs.filter((c) => c !== code)
      : [...learningLangs, code];
    onChange({ ...form, learning_languages: next });
  };

  return (
    <div className="space-y-5 p-5 rounded-2xl border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-primary" />
        <p className="font-black text-sm text-primary">🌍 グローバルプロフィール</p>
      </div>

      {/* 在住国 */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">在住国 / Resident Country</label>
        <select
          value={form.resident_country || ""}
          onChange={(e) => onChange({ ...form, resident_country: e.target.value })}
          className="w-full rounded-xl bg-secondary border-0 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">選択してください</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Native Language */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Native Language（母国語）</label>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onChange({ ...form, native_language: lang.code })}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                form.native_language === lang.code
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border/50 bg-secondary text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="truncate w-full text-center text-[10px]">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Learning Languages */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Learning Languages（学習中の言語・複数選択可）</label>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {LANGUAGES.map((lang) => {
            const isNative = form.native_language === lang.code;
            const isSelected = learningLangs.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                disabled={isNative}
                onClick={() => toggleLearning(lang.code)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  isNative
                    ? "border-border/30 bg-secondary/30 text-muted-foreground/30 cursor-not-allowed"
                    : isSelected
                    ? "border-amber-500 bg-amber-500/20 text-amber-400"
                    : "border-border/50 bg-secondary text-muted-foreground hover:border-amber-500/40"
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="truncate w-full text-center text-[10px]">{lang.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Learning Status */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          今、勉強していること / 話したいこと
          <span className="ml-2 text-amber-400 font-normal normal-case">（140文字以内）</span>
        </label>
        <textarea
          value={form.learning_status || ""}
          onChange={(e) => onChange({ ...form, learning_status: e.target.value.slice(0, 140) })}
          placeholder="例：JLPT N2 勉強中！日本の文化・アニメ・料理について話したい🍜"
          className="w-full rounded-xl bg-secondary border-0 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">{(form.learning_status || "").length} / 140</p>
      </div>
    </div>
  );
}