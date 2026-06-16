import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { t } from "@/lib/i18n";

const FAQ_ITEMS = [
  {
    q: "Chat Marketとは何ですか？",
    a: "Chat Market（チャットマーケット）は、個人のスキル・知識・経験・表現をオンラインで届け、収益化するためのWebサービスです。占い師、家庭教師、講師、ミュージシャン、アイドルなどが、自分専用ページを持ち、鑑定、レッスン、通話、チケット販売、デジタル販売などを行えます。",
  },
  {
    q: "チャットマーケットはタイの市場ですか？",
    a: "いいえ。Chat Market（チャットマーケット）は、タイ・バンコクのチャトゥチャック・マーケットとは異なります。日本の株式会社ONE STEPが運営するオンラインサービスです。",
  },
  {
    q: "占い師は何ができますか？",
    a: "占い師は、チャット鑑定、1対1ビデオ鑑定、鑑定書などのデジタルコンテンツ販売を行えます。チャット鑑定は2往復制で、顔出し不要でも始められます。",
  },
  {
    q: "家庭教師や講師は何ができますか？",
    a: "家庭教師や講師は、1対1個別指導、1対2〜最大9名の少人数レッスン、教材やデジタル資料の販売などに活用できます。",
  },
  {
    q: "ミュージシャンは音源販売できますか？",
    a: "はい。ミュージシャンは、自作曲、BGM、EP、アルバム、サンプルパックなどをデジタル作品として販売できます。ただし、販売できるのは本人または所属先が販売権利を持つ完全オリジナル音源のみです。カバー曲、歌ってみた、演奏してみた、既存曲のアレンジ販売はできません。",
  },
  {
    q: "Chat Marketは集客を保証しますか？",
    a: "いいえ。Chat Marketは集客保証を行うサービスではありません。個人がすでに持っているお客様、ファン、相談者、生徒を受け止め、オンライン上で受付・決済・通話・販売を行えるWeb上の受け皿を目指しています。",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
      >
        <span className="font-semibold text-sm leading-snug">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 text-primary" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30">
          <p className="pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

const ROLES = [
  {
    emoji: "🔮",
    title: "占い師向けのチャット鑑定・オンライン鑑定",
    body: "占い師は、自分専用の鑑定ページを作り、チャット鑑定や1対1ビデオ鑑定を受け付けることができます。チャット鑑定は2往復制で、相談者がオンライン決済を完了した後に鑑定が始まります。顔出し不要で、文章でじっくり鑑定したい占い師にも使いやすい仕組みです。",
    link: "/fortune-lp",
    linkLabel: "占い師向け詳細ページ →",
  },
  {
    emoji: "📚",
    title: "家庭教師・講師向けの個別指導・少人数レッスン",
    body: "家庭教師や講師は、1対1の個別指導や、1対2〜最大9名の少人数レッスンを行うことができます。教材やレッスン資料などのデジタルコンテンツ販売にも活用できます。",
    link: "/lp/tutor",
    linkLabel: "家庭教師・講師向け詳細ページ →",
  },
  {
    emoji: "🎵",
    title: "ミュージシャン向けの音源販売・ライブ配信",
    body: "ミュージシャンは、自作曲、BGM、EP、アルバム、サンプルパックなどをデジタル作品として販売できます。ジャケット画像を設定し、アルバムのように作品を並べることができます。販売できる音源は、本人または所属先が販売権利を持つ完全オリジナル音源に限られます。",
    link: "/musician",
    linkLabel: "ミュージシャン向け詳細ページ →",
  },
  {
    emoji: "🎤",
    title: "アイドル向けの1対1ビデオ通話・チケット販売",
    body: "アイドルは、ファンと1対1でつながるビデオ通話や、イベント・オンライン企画のチケット販売に活用できます。オリジナル曲やボイスなど、本人または所属先が販売権利を持つ音源のデジタル販売にも対応できます。",
    link: "/idol-lp",
    linkLabel: "アイドル向け詳細ページ →",
  },
];

export default function AboutChatMarket() {
  useEffect(() => {
    document.title = "Chat Marketとは｜個人スキルを収益化するWebサービス";
    const setMeta = (name, content, prop = false) => {
      const selector = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        if (prop) el.setAttribute("property", name); else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", "Chat Market（チャットマーケット）は、株式会社ONE STEPが運営する、占い師・家庭教師・講師・ミュージシャン・アイドルなど個人のスキルや表現をオンラインで届けるための収益化Webサービスです。チャット鑑定、1対1ビデオ通話、少人数レッスン、音源販売、チケット販売などに対応しています。");
    setMeta("og:title", "Chat Marketとは｜個人スキルを収益化するWebサービス", true);
    setMeta("og:description", "Chat Market（チャットマーケット）は、個人のスキル・知識・経験・表現をオンラインで届けるためのWebサービスです。占い師、家庭教師、講師、ミュージシャン、アイドルなどが、自分専用ページで鑑定・レッスン・通話・デジタル販売を行えます。", true);
    setMeta("robots", "index, follow");

    // JSON-LD 構造化データ（このページ専用）
    const existing = document.getElementById("about-page-jsonld");
    if (!existing) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "about-page-jsonld";
      script.textContent = JSON.stringify([
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Chat Marketとは｜個人スキルを収益化するWebサービス",
          "url": "https://live-chat-market.com/about-chat-market",
          "description": "Chat Market（チャットマーケット）は、株式会社ONE STEPが運営する個人スキルの収益化Webサービスです。",
          "inLanguage": "ja",
        },
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "株式会社ONE STEP",
          "alternateName": ["Chat Market", "チャットマーケット"],
          "url": "https://live-chat-market.com",
          "description": "Chat Market（チャットマーケット）は、個人のスキル・知識・経験・表現をオンラインで届けるための収益化Webサービスです。",
          "areaServed": { "@type": "Country", "name": "Japan" },
        },
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Chat Market",
          "alternateName": "チャットマーケット",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "url": "https://live-chat-market.com",
          "description": "占い師・家庭教師・講師・ミュージシャン・アイドルなどが、自分専用ページでチャット鑑定、1対1ビデオ通話、少人数レッスン、チケット販売、デジタル販売を行えるWebサービス。",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "JPY" },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": FAQ_ITEMS.map(item => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": { "@type": "Answer", "text": item.a },
          })),
        },
      ]);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById("about-page-jsonld");
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
      {/* ヒーロー */}
      <section className="space-y-4">
        <div className="inline-block bg-primary/10 border border-primary/30 rounded-full px-4 py-1 text-xs text-primary font-semibold">
          {t("about_badge")}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black leading-tight">
          {t("about_hero_title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("about_hero_p1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("about_hero_p2")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("about_hero_p3")}
        </p>
      </section>

      {/* チャトゥチャックとの違い */}
      <section className="bg-secondary/50 border border-border/50 rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-black">{t("about_chatuchak_title")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("about_chatuchak_p1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("about_chatuchak_p2")}
        </p>
      </section>

      {/* 職種別説明 */}
      <section className="space-y-5">
        <h2 className="text-xl font-black">{t("about_roles_title")}</h2>
        <div className="space-y-4">
          {ROLES.map((role, i) => (
            <div key={i} className="border border-border/50 rounded-2xl p-5 space-y-2 hover:border-primary/30 transition-colors">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>{role.emoji}</span>{role.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{role.body}</p>
              <Link to={role.link} className="text-xs text-primary hover:underline underline-offset-2">
                {role.linkLabel}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-xl font-black">{t("about_faq_title")}</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-4">
        <p className="font-black text-lg">{t("about_cta_title")}</p>
        <p className="text-sm text-muted-foreground">{t("about_cta_sub")}</p>
        <Link
          to="/recruit"
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-xl px-6 py-3 text-sm hover:bg-primary/90 transition-colors"
        >
          {t("about_cta_btn")}
        </Link>
        <div className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors underline underline-offset-2">{t("about_cta_home")}</Link>
        </div>
      </section>
    </div>
  );
}