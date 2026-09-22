import React, { useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import StarRating from "./StarRating";
import { useLanguage } from "@/lib/i18n";

// Privacy: first name + last initial, never the full name (matches ReviewSection).
function maskName(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const CAP = 8;

// Customer photos gallery for Product Detail. Pulls thumbnails from the
// already-fetched approved reviews' photo_urls. Renders a horizontally
// scrollable strip (static, no auto-rotation — matches the established
// carousel pattern) capped at CAP thumbnails with a "View all (X)" tile that
// opens the full grid lightbox; clicking any photo opens a single-photo
// lightbox with that review's rating, reviewer name, and text. Hidden
// entirely when there are no approved review photos.
export default function ReviewPhotosGallery({ reviews = [] }) {
  const { lang } = useLanguage();
  const photos = useMemo(() => {
    const out = [];
    (reviews || []).forEach((r) => {
      (r.photo_urls || []).forEach((u) => out.push({ url: u, review: r }));
    });
    return out;
  }, [reviews]);

  const [index, setIndex] = useState(null); // single-photo lightbox index; null = closed
  const [gridOpen, setGridOpen] = useState(false);

  if (photos.length === 0) return null;

  const step = (d) =>
    setIndex((i) => (i == null ? i : (i + d + photos.length) % photos.length));

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          {lang === "ar" ? "صور العملاء" : "Customer photos"}
        </h2>
        <span className="text-sm text-muted-foreground">{photos.length}</span>
      </div>

      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">
        {photos.slice(0, CAP).map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border"
            aria-label="View customer photo"
          >
            <img src={p.url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
          </button>
        ))}
        {photos.length > CAP && (
          <button
            type="button"
            onClick={() => setGridOpen(true)}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <LayoutGrid className="h-4 w-4" />
            {lang === "ar" ? "كل الصور" : "View all"}<br />({photos.length})
          </button>
        )}
      </div>

      {/* Single-photo lightbox with the review context */}
      {index !== null && !gridOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setIndex(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-background/80 p-2" aria-label="Close" onClick={(e) => { e.stopPropagation(); setIndex(null); }}>
            <X className="h-5 w-5" />
          </button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2" aria-label="Previous" onClick={(e) => { e.stopPropagation(); step(-1); }}>
            <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2" aria-label="Next" onClick={(e) => { e.stopPropagation(); step(1); }}>
            <ChevronRight className="h-5 w-5 rtl:-scale-x-100" />
          </button>
          <div className="flex max-h-[88vh] max-w-3xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img src={photos[index].url} alt="" className="max-h-[60vh] max-w-full rounded-lg object-contain" />
            <div className="w-full max-w-md rounded-xl bg-background/95 p-4 text-left">
              <div className="flex items-center gap-2">
                <StarRating value={photos[index].review.rating} readOnly size="h-3.5 w-3.5" />
                <span className="text-xs font-medium text-foreground">
                  {maskName(photos[index].review.author) || (lang === "ar" ? "مشترٍ موثّق" : "Verified buyer")}
                </span>
              </div>
              {photos[index].review.comment && (
                <p className="mt-1.5 text-sm text-muted-foreground">{photos[index].review.comment}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full grid lightbox */}
      {gridOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" onClick={() => setGridOpen(false)}>
          <div className="flex items-center justify-between pb-3">
            <span className="text-sm font-medium text-white/80">
              {lang === "ar" ? "صور العملاء" : "Customer photos"} ({photos.length})
            </span>
            <button className="rounded-full bg-background/80 p-2" aria-label="Close" onClick={(e) => { e.stopPropagation(); setGridOpen(false); }}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5" onClick={(e) => e.stopPropagation()}>
            {photos.map((p, i) => (
              <button key={i} type="button" onClick={() => { setGridOpen(false); setIndex(i); }} className="aspect-square overflow-hidden rounded-lg">
                <img src={p.url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}