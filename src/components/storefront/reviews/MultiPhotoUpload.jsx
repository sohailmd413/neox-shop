import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, X, ImagePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Multi-image uploader (up to `max` images). `value` is an array of public
// file URLs; `onChange` receives the new full array. Uploads run sequentially
// via the Core UploadFile integration. Used for review photo attachments.
export default function MultiPhotoUpload({ value = [], onChange, max = 4, label }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback(
    async (files) => {
      const remaining = max - (value?.length || 0);
      const toUpload = (files || []).slice(0, remaining);
      if (toUpload.length === 0) return;
      setError("");
      setUploading(true);
      try {
        const urls = [];
        for (const file of toUpload) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          urls.push(file_url);
        }
        onChange?.([...(value || []), ...urls]);
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [value, max, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: max,
    multiple: max > 1,
    disabled: (value?.length || 0) >= max || uploading,
  });

  const remove = (i) => onChange?.((value || []).filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(value || []).map((url, i) => (
          <div key={i} className="group relative h-20 w-20">
            <img src={url} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {(value?.length || 0) < max && (
          <div
            {...getRootProps()}
            className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed ${
              isDragActive ? "border-foreground bg-muted" : "border-border"
            } transition-colors hover:bg-muted`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {label && <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}