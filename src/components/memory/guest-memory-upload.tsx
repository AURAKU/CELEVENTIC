"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";

interface GuestMemoryUploadProps {
  token: string;
  eventTitle: string;
  hostName: string;
  maxPhotosPerGuest: number;
  maxVideosPerGuest: number;
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  allowAnonymousUploads: boolean;
  windowOpen: boolean;
  memoriesUrl?: string;
  invitationUrl?: string;
}

export function GuestMemoryUpload({
  token,
  eventTitle,
  hostName,
  maxPhotosPerGuest,
  maxVideosPerGuest,
  maxImageSizeMb,
  maxVideoSizeMb,
  allowAnonymousUploads,
  windowOpen,
  memoriesUrl,
  invitationUrl,
}: GuestMemoryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    if (!windowOpen) {
      setError("Upload window is closed for this event.");
      return;
    }
    if (!consent) {
      setError("Please accept the consent checkbox.");
      return;
    }
    if (!allowAnonymousUploads && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);
    setSuccess(false);

    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("file", file);
      fd.append("consent", "true");
      if (name) fd.append("uploaderName", name);
      if (phone) fd.append("uploaderPhone", phone);
      if (caption) fd.append("caption", caption);

      const { ok, json } = await uploadFormDataWithProgress("/api/memories/upload", fd, setProgress);
      if (!ok) throw new Error((json.error as string) || "Upload failed");
      setSuccess(true);
      setCaption("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <header className="text-center space-y-2">
        <Camera className="h-10 w-10 mx-auto text-[#0B8A83]" />
        <h1 className="text-2xl font-bold text-[#0F172A]">Upload Your Photos & Videos</h1>
        <p className="text-slate-600 text-sm">
          Share memories from <strong>{eventTitle}</strong> hosted by {hostName}
        </p>
      </header>

      {!windowOpen && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Uploads are not open at this time. Please check back later.
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Upload received!</p>
            <p className="mt-1 opacity-90">Your memory may appear after organizer approval.</p>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Your name {allowAnonymousUploads ? "(optional)" : "*"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" />
          </div>
          <div className="space-y-1">
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233..." />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Caption (optional)</Label>
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="A moment from the celebration..." />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <Label htmlFor="consent" className="text-xs leading-relaxed text-slate-600 cursor-pointer">
            I consent to sharing this media for this event only. I understand uploads may be moderated before appearing publicly.
          </Label>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver ? "border-[#0B8A83] bg-teal-50/50" : "border-slate-200",
            !windowOpen && "opacity-50 pointer-events-none"
          )}
        >
          <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-1">Drag & drop or select files</p>
          <p className="text-xs text-slate-400 mb-4">
            Up to {maxPhotosPerGuest} photos & {maxVideosPerGuest} videos · Images {maxImageSizeMb}MB · Videos {maxVideoSizeMb}MB
          </p>
          <Button
            type="button"
            className="gap-2 bg-[#0B8A83]"
            disabled={uploading || !windowOpen}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? `Uploading ${progress}%` : "Select files"}
          </Button>
          {uploading && (
            <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full bg-[#0B8A83] transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {memoriesUrl && (
          <Button variant="outline" asChild>
            <a href={memoriesUrl}>View approved memories</a>
          </Button>
        )}
        {invitationUrl && (
          <Button variant="ghost" asChild>
            <a href={invitationUrl}>Back to invitation</a>
          </Button>
        )}
      </div>
    </div>
  );
}
