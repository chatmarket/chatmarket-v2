import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Users, ExternalLink, MessageCircle, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import DonationModal from "../components/crowdfunding/DonationModal";

export default function CrowdfundingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showDonation, setShowDonation] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: project } = useQuery({
    queryKey: ["crowdfunding-project", id],
    queryFn: () => base44.entities.CrowdfundingProject.filter({ id }),
    select: (data) => data[0],
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["crowdfunding-comments", id],
    queryFn: () => base44.entities.CrowdfundingComment.filter({ project_id: id }, "-created_date"),
    refetchInterval: 10000,
  });

  const { data: donations = [] } = useQuery({
    queryKey: ["crowdfunding-donations", id],
    queryFn: () => base44.entities.CrowdfundingDonation.filter({ project_id: id, status: "completed" }, "-created_date", 10),
  });

  const images = [project?.image_url_1, project?.image_url_2, project?.image_url_3].filter(Boolean);

  const handleComment = async () => {
    if (!comment.trim()) return;
    if (!user) { base44.auth.redirectToLogin(); return; }
    setPosting(true);
    await base44.entities.CrowdfundingComment.create({
      project_id: id,
      user_email: user.email,
      user_name: user.full_name,
      content: comment.trim(),
    });
    setComment("");
    queryClient.invalidateQueries({ queryKey: ["crowdfunding-comments", id] });
    setPosting(false);
    toast.success("コメントを投稿しました");
  };

  if (!project) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Badge className={project.organization_type === "npo" ? "bg-blue-500/20 text-blue-300 border-0" : "bg-purple-500/20 text-purple-300 border-0"}>
          {project.organization_type === "npo" ? "NPO法人" : "政治政党"}
        </Badge>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-muted-foreground text-sm">{project.organization_name}</p>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="rounded-2xl overflow-hidden aspect-video bg-secondary">
            <img src={images[activeImage]} alt="" className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${activeImage === i ? "border-primary" : "border-border/50"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats + CTA */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex gap-8 flex-1">
          <div className="text-center">
            <p className="text-2xl font-black text-primary">¥{(project.total_raised || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">累計支援金額</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{project.supporter_count || 0}</p>
            <p className="text-xs text-muted-foreground">支援者数</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Button onClick={() => user ? setShowDonation(true) : base44.auth.redirectToLogin()} className="bg-red-500 hover:bg-red-600 text-white gap-2 px-8">
            <Heart className="w-4 h-4" /> 支援する
          </Button>
          {project.hp_url && (
            <a href={project.hp_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                <ExternalLink className="w-3 h-3" /> 公式HPを見る
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Political donation notice */}
      {project.organization_type === "political_party" && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200 space-y-1">
            <p className="font-semibold">政治献金に関する重要なお知らせ</p>
            <p>政治団体・政治家個人への献金には、政治資金規正法に基づく限度額が設けられています。献金額は個人で管理・把握し、法令を遵守した上でご支援ください。ご不明点は専門家または各政党窓口にご相談ください。</p>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4">プロジェクト詳細</h2>
        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{project.description}</div>
      </div>

      {/* Recent supporters */}
      {donations.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" />最近の支援者</h2>
          <div className="space-y-3">
            {donations.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.is_anonymous ? "匿名" : d.donor_name}</span>
                <span className="text-primary font-semibold">¥{d.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" />応援コメント</h2>

        <div className="space-y-2 mb-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={user ? "応援メッセージを書く..." : "コメントするにはログインが必要です"}
            disabled={!user}
            className="bg-secondary border-0 resize-none"
            rows={3}
          />
          <Button onClick={handleComment} disabled={posting || !comment.trim() || !user} size="sm" className="gap-2">
            <Send className="w-3 h-3" /> 投稿する
          </Button>
        </div>

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{c.user_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_date).toLocaleDateString("ja-JP")}</span>
              </div>
              <p className="text-sm text-foreground/80">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">まだコメントはありません</p>}
        </div>
      </div>

      {showDonation && (
        <DonationModal
          project={project}
          user={user}
          onClose={() => setShowDonation(false)}
          onSuccess={() => {
            setShowDonation(false);
            queryClient.invalidateQueries({ queryKey: ["crowdfunding-project", id] });
            queryClient.invalidateQueries({ queryKey: ["crowdfunding-donations", id] });
          }}
        />
      )}
    </div>
  );
}