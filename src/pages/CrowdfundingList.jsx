import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, ExternalLink, Plus } from "lucide-react";

export default function CrowdfundingList() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ["crowdfunding-active"],
    queryFn: () => base44.entities.CrowdfundingProject.filter({ status: "active" }, "-created_date"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-400" />
            クラウドファンディング
          </h1>
          <p className="text-muted-foreground text-sm mt-1">NPO・政治政党への支援プラットフォーム</p>
        </div>
        {user && (
          <Link to="/crowdfunding/new">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              プロジェクト登録
            </Button>
          </Link>
        )}
      </div>

      {/* Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8 text-sm text-yellow-200 space-y-1">
        <p className="font-semibold">⚠️ 政治献金に関する注意事項</p>
        <p>政治団体への個人献金には法律上の限度額があります。献金額は個人で管理・把握し、法令を遵守した上でご支援ください。</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>現在進行中のプロジェクトはありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} to={`/crowdfunding/${project.id}`} className="group block">
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/40 transition-all">
                {project.image_url_1 ? (
                  <img src={project.image_url_1} alt={project.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                    <Heart className="w-12 h-12 text-primary/40" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <Badge className={project.organization_type === "npo" ? "bg-blue-500/20 text-blue-300 border-0" : "bg-purple-500/20 text-purple-300 border-0"}>
                    {project.organization_type === "npo" ? "NPO法人" : "政治政党"}
                  </Badge>
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">{project.title}</h3>
                  <p className="text-xs text-muted-foreground">{project.organization_name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.supporter_count || 0}人が支援</span>
                    <span className="text-primary font-bold">¥{(project.total_raised || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}