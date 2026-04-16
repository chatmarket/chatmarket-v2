import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-secondary/40 border-t border-border/30 mt-12 lg:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-black text-lg">
                Chat<span className="text-primary">Market</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              クリエイターとファンを繋ぐライブ配信プラットフォーム
            </p>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm">法務・サポート</h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  利用規約
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
                  特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <a href="https://www.onestep-corp.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  企業情報
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/30 my-6 lg:my-8" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © 2026 ChatMarket Inc. All rights reserved.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link to="/terms" className="hover:text-foreground transition-colors underline underline-offset-2">
              利用規約
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors underline underline-offset-2">
              プライバシー
            </Link>
            <Link to="/legal" className="hover:text-foreground transition-colors underline underline-offset-2">
              特商法表記
            </Link>
            <span>made with ❤️ in Japan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}