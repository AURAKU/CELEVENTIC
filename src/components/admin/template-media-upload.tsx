"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface TemplateMediaUploadProps {
  label: string;
  category: string;
  onUploaded: (url: string) => void;
}

export function TemplateMediaUpload({ label, category, onUploaded }: TemplateMediaUploadProps) {
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    const res = await fetch("/api/admin/invitation-templates/upload", { method: "POST", body: form });
    const d = await res.json();
    setLoading(false);
    if (d.success) onUploaded(d.data.url);
  }

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          <Button type="button" variant="outline" size="sm" asChild disabled={loading}>
            <span><Upload className="h-3.5 w-3.5" /> {loading ? "Uploading..." : "Upload"}</span>
          </Button>
        </label>
      </div>
    </div>
  );
}
