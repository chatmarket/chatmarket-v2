import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 設定ページ・プラン選択ページなら何もしない
    const skipPaths = ["/settings", "/plan-select", "/plan-confirm"];
    if (skipPaths.some((p) => location.pathname.startsWith(p))) return;

    import("@/api/base44Client").then(({ base44 }) => {
      base44.auth.isAuthenticated().then((isAuth) => {
        if (!isAuth) return;
        base44.auth.me().then((u) => {
          if (!u.nickname) {
            navigate("/settings", { replace: true });
          }
        }).catch(() => {});
      });
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}