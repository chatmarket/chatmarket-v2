import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Lock, Send, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "🌐 全員に公開" },
  { value: "basic", label: "🔒 BASIC加入者限定" },
  { value: "call-anser", label: "🔒 CALL&ANSER限定" },
  { value: "vod", label: "🔒 VOD加入者限定" },
  { value: "ppv", label: "🔒 PPV加入者限定" },
];

export default function PostComposer({ user, channel }) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const qc = useQueryClient();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);
    let image_url = "";
    if (imageFile) {
      const res = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = res.file_url;
    }
    await base44.entities.CommunityPost.create({
      author_email: user.email,
      author_name: user.full_name || user.email,
      channel_id: channel?.id || "",
      channel_name: channel?.name || "",
      channel_avatar: channel?.avatar_url || "",
      content: content.trim(),
      visibility,
      image_url,
      like_count: 0,
      like_emails: [],
      comment_count: 0,
      is_pinned: false,
    });
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setVisibility("public");
    setPosting(false);
    qc.invalidateQueries({ queryKey: ["community-posts"] });
    toast.success("投稿しました！");
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          {channel?.avatar_url
            ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-bold">{(user?.full_name || "?")[0]}</span>}
        </div>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value.slice(0, 1000))}
          placeholder="コミュニティに投稿する..."
          className="bg-secondary border-0 resize-none flex-1 text-sm"
          rows={3}
        />
      </div>

      {imagePreview && (
        <div className="relative inline-block ml-12">
          <img src={imagePreview} alt="" className="rounded-xl max-h-48 object-cover" />
          <button onClick={() => { setImageFile(null); setImagePreview(null); }}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:bg-black">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pl-12">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <Image className="w-5 h-5" />
          </label>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="bg-secondary border-0 h-8 text-xs w-44">
              <Lock className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || posting}
          className="h-8 px-4 text-sm gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {posting ? "投稿中..." : "投稿"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-right pl-12">{content.length}/1000</p>
    </div>
  );
}