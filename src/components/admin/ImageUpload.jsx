import React, { useRef, useState } from "react";
import { Loader2, X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Uploads images from the user's device to Base44 storage and stores the
// resulting URL(s). `multiple` keeps an array; single keeps a string.
export default function ImageUpload({ value, onChange, multiple = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const urls = multiple ? value || [] : value ? [value] : [];

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of list) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      if (multiple) onChange([...(value || []), ...uploaded]);
      else onChange(uploaded[uploaded.length - 1]);
    } catch {
      /* ignore */
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (i) => {
    if (multiple) onChange((value || []).filter((_, idx) => idx !== i));
    else onChange("");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {urls.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Upload image"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}