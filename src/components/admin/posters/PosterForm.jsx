import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ImageUpload from "@/components/admin/ImageUpload";
import Dropdown from "@/components/admin/ui/Dropdown";
import PosterPreview from "./PosterPreview";
import PosterZonePicker from "./PosterZonePicker";
import { useToast } from "@/components/ui/use-toast";
import {
  ANIMATIONS, ANIM_DIRS, SPEEDS, POSITIONS, ALIGNS, DEVICES, AUDIENCES, WEIGHTS,
  PAGES, ZONES, SPONSOR_TYPES, optionsOf,
} from "./posterConfig";
import { X, Loader2, Monitor, Smartphone } from "lucide-react";

const DEFAULT = {
  title: "", alt_text: "", image_url: "", image_mobile_url: "", link_url: "",
  brand_name: "", brand_logo_url: "", sponsor_type: "in_house", campaign_name: "",
  tagline: "", tagline_ar: "",
  animation: "none", animation_direction: "left", animation_speed: "medium",
  text_position: "center", text_align: "center", font_size: 0, font_color: "#ffffff", font_weight: "bold", strip_bg: false,
  cta_text: "", cta_link: "", cta_color: "#111111",
  page: "home", zone: "hero", category_ref: "", device: "both",
  start_at: null, end_at: null,
  active: true, sort_order: 0, target_audience: "all",
  impressions: 0, clicks: 0,
};

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const TAGLINE_LIMIT = 120;

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export default function PosterForm({ poster, onClose, onSaved }) {
  const [draft, setDraft] = useState({ ...DEFAULT, ...(poster || {}) });
  const [tab, setTab] = useState("media");
  const [device, setDevice] = useState("desktop");
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    base44.entities.Category.list("name", 200).then((c) => setCategories(c || [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!draft.title || !draft.image_url) {
      toast({ title: "Title and desktop image are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...draft,
      font_size: Number(draft.font_size) || 0,
      sort_order: Number(draft.sort_order) || 0,
      impressions: Number(draft.impressions) || 0,
      clicks: Number(draft.clicks) || 0,
    };
    try {
      if (poster) await base44.entities.Poster.update(poster.id, payload);
      else await base44.entities.Poster.create(payload);
      toast({ title: poster ? "Banner updated" : "Banner created" });
      onSaved();
    } catch (e) {
      toast({ title: e.message || "Could not save", variant: "destructive" });
    }
    setSaving(false);
  };

  const Tabs1 = [
    { id: "media", label: "Media" },
    { id: "brand", label: "Brand" },
    { id: "tagline", label: "Tagline" },
    { id: "cta", label: "Call-to-Action" },
    { id: "placement", label: "Placement" },
    { id: "schedule", label: "Schedule" },
    { id: "targeting", label: "Targeting" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-6 w-full max-w-5xl rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg font-semibold">{poster ? "Edit banner" : "New banner"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
          {/* Form side */}
          <div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex w-full flex-wrap justify-start gap-1">
                {Tabs1.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="media" className="mt-4 space-y-4">
                <Field label="Banner title">
                  <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Summer sale banner" />
                </Field>
                <Field label="Desktop image" hint="Recommended size: 1920 × 600px">
                  <ImageUpload value={draft.image_url} onChange={(v) => set("image_url", v)} />
                </Field>
                <Field label="Mobile image (optional)" hint="Recommended size: 800 × 1000px; falls back to desktop image">
                  <ImageUpload value={draft.image_mobile_url} onChange={(v) => set("image_mobile_url", v)} />
                </Field>
                <Field label="Alt text">
                  <Input value={draft.alt_text} onChange={(e) => set("alt_text", e.target.value)} placeholder="Describe the banner" />
                </Field>
              </TabsContent>

              <TabsContent value="brand" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Identify the brand or collection this banner promotes. The name shows as a small watermark on the banner; campaign name is admin-only.</p>
                <Field label="Brand / collection name" hint="e.g. NeoX Essentials, FlexFit. Leave blank for seasonal banners.">
                  <Input value={draft.brand_name || ""} onChange={(e) => set("brand_name", e.target.value)} placeholder="NeoX Essentials" />
                </Field>
                <Field label="Brand logo (optional)" hint="Small logo shown as a bottom-corner watermark on the banner.">
                  <ImageUpload value={draft.brand_logo_url} onChange={(v) => set("brand_logo_url", v)} />
                </Field>
                <Field label="Sponsor type">
                  <Dropdown type="select" value={draft.sponsor_type} onChange={(v) => set("sponsor_type", v)} options={optionsOf(SPONSOR_TYPES)} placeholder="In-house" />
                </Field>
                <Field label="Campaign name" hint="Internal label for your own tracking — not shown publicly.">
                  <Input value={draft.campaign_name || ""} onChange={(e) => set("campaign_name", e.target.value)} placeholder="Autumn Sale 2026" />
                </Field>
              </TabsContent>

              <TabsContent value="tagline" className="mt-4 space-y-4">
                <Field label={`Tagline (English) — ${draft.tagline?.length || 0}/${TAGLINE_LIMIT}`}>
                  <Input
                    value={draft.tagline || ""}
                    maxLength={TAGLINE_LIMIT}
                    onChange={(e) => set("tagline", e.target.value)}
                    placeholder="Up to 70% off everything"
                  />
                </Field>
                <Field label="Tagline (Arabic)">
                  <Input value={draft.tagline_ar || ""} onChange={(e) => set("tagline_ar", e.target.value)} placeholder="خصومات تصل إلى 70%" dir="rtl" />
                </Field>
                <Row>
                  <Field label="Animation">
                    <Dropdown type="select" value={draft.animation} onChange={(v) => set("animation", v)} options={optionsOf(ANIMATIONS)} placeholder="Static" />
                  </Field>
                  {draft.animation === "marquee" && (
                    <Field label="Scroll direction">
                      <Dropdown type="select" value={draft.animation_direction} onChange={(v) => set("animation_direction", v)} options={optionsOf(ANIM_DIRS)} placeholder="Direction" />
                    </Field>
                  )}
                </Row>
                <Row>
                  <Field label="Animation speed">
                    <Dropdown type="select" value={draft.animation_speed} onChange={(v) => set("animation_speed", v)} options={optionsOf(SPEEDS)} placeholder="Speed" />
                  </Field>
                  <Field label="Font size (px, 0 = auto)">
                    <Input type="number" value={draft.font_size || 0} onChange={(e) => set("font_size", e.target.value)} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Text position">
                    <Dropdown type="select" value={draft.text_position} onChange={(v) => set("text_position", v)} options={optionsOf(POSITIONS)} placeholder="Position" />
                  </Field>
                  <Field label="Text align">
                    <Dropdown type="select" value={draft.text_align} onChange={(v) => set("text_align", v)} options={optionsOf(ALIGNS)} placeholder="Align" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Font weight">
                    <Dropdown type="select" value={draft.font_weight} onChange={(v) => set("font_weight", v)} options={optionsOf(WEIGHTS)} placeholder="Weight" />
                  </Field>
                  <Field label="Font color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={draft.font_color || "#ffffff"} onChange={(e) => set("font_color", e.target.value)} className="h-9 w-12 rounded-md border border-input bg-transparent p-1" />
                      <Input value={draft.font_color || ""} onChange={(e) => set("font_color", e.target.value)} placeholder="#ffffff" className="flex-1" />
                    </div>
                  </Field>
                </Row>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Readability strip</p>
                    <p className="text-xs text-muted-foreground">Add a semi-transparent band behind the tagline.</p>
                  </div>
                  <Switch checked={!!draft.strip_bg} onCheckedChange={(v) => set("strip_bg", v)} />
                </div>
              </TabsContent>

              <TabsContent value="cta" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">A clickable button layered on the banner.</p>
                <Field label="Button text">
                  <Input value={draft.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} placeholder="Shop Now" />
                </Field>
                <Field label="Button link" hint="Category page / product page / custom URL">
                  <Input value={draft.cta_link || ""} onChange={(e) => set("cta_link", e.target.value)} placeholder="/shop" />
                </Field>
                <Field label="Button color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={draft.cta_color || "#111111"} onChange={(e) => set("cta_color", e.target.value)} className="h-9 w-12 rounded-md border border-input bg-transparent p-1" />
                    <Input value={draft.cta_color || ""} onChange={(e) => set("cta_color", e.target.value)} placeholder="#111111" className="flex-1" />
                  </div>
                </Field>
              </TabsContent>

              <TabsContent value="placement" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Choose exactly where this banner appears.</p>
                <Row>
                  <Field label="Page">
                    <Dropdown type="select" value={draft.page} onChange={(v) => set("page", v)} options={optionsOf(PAGES)} placeholder="Page" />
                  </Field>
                  <Field label="Device">
                    <Dropdown type="select" value={draft.device} onChange={(v) => set("device", v)} options={optionsOf(DEVICES)} placeholder="Device" />
                  </Field>
                </Row>
                {draft.page === "category" && (
                  <Field label="Target category">
                    <Dropdown
                      type="search"
                      value={draft.category_ref}
                      onChange={(v) => set("category_ref", v)}
                      options={categories.map((c) => ({ label: c.name, value: c.id }))}
                      placeholder="Search category"
                      emptyText="No categories."
                    />
                  </Field>
                )}
                <Field label="Zone / Slot">
                  <PosterZonePicker value={draft.zone} onChange={(v) => set("zone", v)} />
                </Field>
                <Field label="Zone (quick select)">
                  <Dropdown type="select" value={draft.zone} onChange={(v) => set("zone", v)} options={optionsOf(ZONES)} placeholder="Zone" />
                </Field>
                <Row>
                  <Field label="Rotation order" hint="Lower shows first within the same slot">
                    <Input type="number" value={draft.sort_order || 0} onChange={(e) => set("sort_order", e.target.value)} />
                  </Field>
                </Row>
              </TabsContent>

              <TabsContent value="schedule" className="mt-4 space-y-4">
                <Row>
                  <Field label="Start date & time">
                    <Input type="datetime-local" value={toLocalInput(draft.start_at)} onChange={(e) => set("start_at", fromLocalInput(e.target.value))} />
                  </Field>
                  <Field label="End date & time" hint="Auto-deactivates after this">
                    <Input type="datetime-local" value={toLocalInput(draft.end_at)} onChange={(e) => set("end_at", fromLocalInput(e.target.value))} />
                  </Field>
                </Row>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Manually enable/disable (still respects schedule).</p>
                  </div>
                  <Switch checked={!!draft.active} onCheckedChange={(v) => set("active", v)} />
                </div>
              </TabsContent>

              <TabsContent value="targeting" className="mt-4 space-y-4">
                <Field label="Audience">
                  <Dropdown type="select" value={draft.target_audience} onChange={(v) => set("target_audience", v)} options={optionsOf(AUDIENCES)} placeholder="Audience" />
                </Field>
                <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Geo-targeting and language targeting are available in the enterprise tier.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview side */}
          <div className="lg:sticky lg:top-2 lg:self-start">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Live preview</span>
              <div className="flex rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setDevice("desktop")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${device === "desktop" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDevice("mobile")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${device === "mobile" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>
            </div>
            <PosterPreview poster={draft} device={device} />
            <p className="mt-2 text-xs text-muted-foreground">Hover a scrolling tagline to pause. Animation pauses automatically for reduced-motion users.</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">Animation respects prefers-reduced-motion and pauses on hover for readability.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save banner
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}