import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, X, UploadCloud } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Drag-and-drop image uploader with a live preview. Stores a single image URL.
// `compact` renders a small square tile (used in bulk grids), the default
// renders a wide dropzone with a recommended-size hint.
export default function Dropzone({ value, onChange, hint, compact = false, className = "" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback(async (files) => {
    const file = files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    multiple: false,
  });

  const remove = (e) => {
    e.stopPropagation();
    onChange("");
  };

  if (value && !uploading) {
    if (compact) {
      return (
        <div {...getRootProps()} className="group relative h-14 w-14 cursor-pointer">
          <img src={value} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
          <button type="button" onClick={remove} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background" aria-label="Remove image">
            <X className="h-3 w-3" />
          </button>
          <input {...getInputProps()} />
        </div>
      );
    }
    return (
      <div {...getRootProps()} className="group relative w-full max-w-[320px] cursor-pointer">
        <img src={value} alt="" className="h-28 w-full rounded-xl border border-border object-cover" />
        <button type="button" onClick={remove} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background" aria-label="Remove image">
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-foreground/0 opacity-0 transition group-hover:bg-foreground/30 group-hover:opacity-100">
          <span className="rounded-md bg-background px-2 py-1 text-xs font-medium">Replace</span>
        </div>
        <input {...getInputProps()} />
      </div>
    );
  }

  if (compact) {
    return (
      <div {...getRootProps()} className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed ${isDragActive ? "border-foreground bg-muted" : "border-border"} transition-colors hover:bg-muted ${className}`}>
        <input {...getInputProps()} />
        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <UploadCloud className="h-5 w-5 text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={`flex h-28 w-full max-w-[320px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed ${isDragActive ? "border-foreground bg-muted" : "border-border"} p-4 text-center transition-colors hover:bg-muted ${className}`}>
      <input {...getInputProps()} />
      {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <UploadCloud className={`h-6 w-6 ${isDragActive ? "text-foreground" : "text-muted-foreground"}`} />}
      <span className="text-xs text-muted-foreground">{isDragActive ? "Drop the image here…" : "Drag & drop, or click to upload"}</span>
      {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}