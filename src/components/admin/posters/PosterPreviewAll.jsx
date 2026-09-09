import React, { useState } from "react";
import { ArrowLeft, Monitor, Smartphone, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { lf } from "@/lib/format";
import { Button } from "@/components/ui/button";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import BannerSlide from "@/components/storefront/BannerSlide";
import { PAGES, ZONES, pageLabel, zoneLabel, fmtDate } from "./posterConfig";

// Admin "Preview all" screen: renders every assigned Poster grouped by page
// and slot exactly as it appears on the storefront — real image, animated
// tagline, CTA, and the live rotating carousel when a slot has multiple
// active banners. Includes per-banner status (Active / Scheduled / Expiring
// soon / Expired), empty-slot detection, device + language toggles, and an
// Edit shortcut per banner.

const ZONE_ASPECT = {
  hero: "aspect-[16/7]",
  secondary: "aspect-[16/5]",
  sidebar: "aspect-[4/5]",
  mid_strip: "aspect-[16/3]",
  grid_interstitial: "aspect-[4/3]",
  footer: "aspect-[16/4]",
  popup: "aspect-[4/3]",
  sticky_bar: "h-16",
};

const STATUS = {
  active: { icon: "✅", label: "Active and live", cls: "bg-emerald-100 text-emerald-700" },
  expiring: { icon: "⚠️", label: "Expiring soon", cls: "bg-amber-100 text-amber-700" },
  scheduled: { icon: "⏳", label: "Scheduled", cls: "bg-blue-100 text-blue-700" },
  expired: { icon: "❌", label: "Expired", cls: "bg-zinc-200 text-zinc-600" },
  inactive: { icon: "⚫", label: "Inactive", cls: "bg-muted text-muted-foreground" },
};

function previewStatus(p) {
  if (p.active === false) return "inactive";
  const now = Date.now();
  const start = p.start_at ? new Date(p.start_at).getTime() : null;
  const end = p.end_at ? new Date(p.end_at).getTime() : null;
  if (start && start > now) return "scheduled";
  if (end && end < now) return "expired";
  if (end && end > now && end - now <= 3 * 86400000) return "expiring";
  return "active";
}

function StickySlide({ p, lang }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-navy px-4">
      <span className="line-clamp-2 text-center text-xs font-medium text-white sm:text-sm">
        {lf(p, "tagline", lang) || "—"}
      </span>
    </div>
  );
}

function renderSlide(p, lang, zone) {
  if (zone === "sticky_bar") return <StickySlide p={p} lang={lang} />;
  return <BannerSlide poster={p} lang={lang} overlay />;
}

function StaticPreview({ p, lang, zone, mediaCls, onEdit }) {
  const st = previewStatus(p);
  const status = STATUS[st];
  const grayed = st === "expired" || st === "inactive";
  return (
    <div className={cn("relative overflow-hidden rounded-lg", mediaCls, grayed && "grayscale opacity-70")}>
      {renderSlide(p, lang, zone)}
      <div className="absolute left-2 top-2 z-30 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
        {status.icon} {status.label}
      </div>
      <button
        onClick={() => onEdit(p)}
        className="absolute right-2 top-2 z-30 rounded-full bg-white/90 p-1.5 text-foreground hover:bg-white"
        aria-label="Edit banner"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function BannerList({ banners, lang, onEdit }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {banners.map((p) => {
        const st = previewStatus(p);
        const status = STATUS[st];
        return (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-14 shrink-0 overflow-hidden rounded border border-border bg-muted">
              {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{p.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {lf(p, "tagline", lang) || "—"}
                {(p.start_at || p.end_at) && <span className="ml-1">· {fmtDate(p.start_at)} → {fmtDate(p.end_at)}</span>}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", status.cls)}>
              {status.icon} {status.label}
            </span>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{p.device || "both"}</span>
            <button onClick={() => onEdit(p)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Edit banner">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SlotCard({ page, zone, banners, device, lang, onEdit }) {
  const all = banners;
  const visible = all.filter((p) => !p.device || p.device === "both" || p.device === device);
  const activeVisible = visible.filter((p) => ["active", "expiring"].includes(previewStatus(p)));
  const otherVisible = visible.filter((p) => !["active", "expiring"].includes(previewStatus(p)));
  const mediaCls = ZONE_ASPECT[zone] || "aspect-[16/5]";
  const mediaWrap = device === "mobile" ? "mx-auto max-w-[390px]" : "";

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold">{zoneLabel(zone)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{pageLabel(page)}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{all.length}</span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          {all.length} banner(s) here target the {device === "desktop" ? "mobile" : "desktop"} view.
        </div>
      ) : (
        <div className="space-y-3">
          <div className={mediaWrap}>
            {activeVisible.length > 0 ? (
              <div className={cn("relative overflow-hidden rounded-lg", mediaCls)}>
                <BannerCarousel
                  banners={activeVisible}
                  className="h-full w-full"
                  controls={activeVisible.length > 1 ? "dots" : "none"}
                  renderSlide={(b, l) => renderSlide(b, l, zone)}
                />
                {activeVisible.length > 1 && (
                  <span className="absolute right-2 top-2 z-30 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    ● Live rotation
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-center text-xs text-amber-700">
                No active banner — storefront will show default fallback content
              </div>
            )}

            {otherVisible.map((p) => (
              <StaticPreview key={p.id} p={p} lang={lang} zone={zone} mediaCls={mediaCls} onEdit={onEdit} />
            ))}
          </div>

          <BannerList banners={visible} lang={lang} onEdit={onEdit} />
        </div>
      )}
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PosterPreviewAll({ posters = [], onEdit, onBack }) {
  const [device, setDevice] = useState("desktop");
  const [lang, setLang] = useState("en");
  const rtl = lang === "ar";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> Back to list
        </Button>
        <h2 className="text-lg font-semibold">Banner Preview</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Seg
            value={device}
            onChange={setDevice}
            options={[
              { value: "desktop", label: "Desktop", icon: <Monitor className="h-3.5 w-3.5" /> },
              { value: "mobile", label: "Mobile", icon: <Smartphone className="h-3.5 w-3.5" /> },
            ]}
          />
          <Seg
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: "EN", icon: null },
              { value: "ar", label: "ع", icon: null },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Legend:</span>
        {Object.values(STATUS).map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span>{s.icon}</span> {s.label}
          </span>
        ))}
      </div>

      <div dir={rtl ? "rtl" : "ltr"} className="space-y-8">
        {PAGES.map((pg) => {
          const pagePosters = posters.filter((p) => p.page === pg.id);
          const usedZones = ZONES.filter((z) => pagePosters.some((p) => p.zone === z.id));
          const emptyZones = ZONES.filter((z) => !pagePosters.some((p) => p.zone === z.id));

          return (
            <section key={pg.id} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{pg.label}</h3>

              {emptyZones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emptyZones.map((z) => (
                    <span
                      key={z.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      <Eye className="h-3 w-3 opacity-50" />
                      {z.label}
                      <span className="text-foreground/60">· no banner</span>
                    </span>
                  ))}
                </div>
              )}

              {usedZones.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {usedZones.map((z) => (
                    <SlotCard
                      key={z.id}
                      page={pg.id}
                      zone={z.id}
                      banners={pagePosters.filter((p) => p.zone === z.id)}
                      device={device}
                      lang={lang}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}