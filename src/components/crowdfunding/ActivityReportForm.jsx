import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ActivityReportForm({ project, user, onSuccess }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);

    let image_url = "";
    if (imageFile) {
      const res = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = res.file_url;
    }

    await base44.entities.CrowdfundingActivityReport.create({
      project_id: project.id,
      project_title: project.title,
      owner_email: user.email,
      title: title.trim(),
      content: content.trim(),
      image_url,
    });

    queryClient.invalidateQueries({ queryKey: ["activity-reports"] });
    toast.success("活動報告を投稿しました");
    setTitle("");
    setContent("");
    setImageFile(null);
    if (onSuccess) onSuccess();
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="活動報告タイトル"
        className="bg-secondary border-0"
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="活動内容・進捗を報告してください..."
        className="bg-secondary border-0 resize-none"
        rows={4}
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
          <Image className="w-4 h-4" />
          {imageFile ? imageFile.name : "画像を添付"}
        </label>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !title.trim() || !content.trim()}
          className="ml-auto gap-2"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          投稿する
        </Button>
      </div>
    </form>
  );
}