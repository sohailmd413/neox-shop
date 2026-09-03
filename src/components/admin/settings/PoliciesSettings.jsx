import { useState } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import { Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLICIES = [
  { key: "terms_policy", label: "Terms of Service" },
  { key: "privacy_policy", label: "Privacy Policy" },
  { key: "return_policy", label: "Return Policy" },
  { key: "shipping_policy", label: "Shipping Policy" },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "bullet" }, { list: "ordered" }],
    ["link"],
    ["clean"],
  ],
};

// Quill emits "<p><br></p>" for an empty editor — treat that as blank so we can
// require real Arabic content before the policies can be saved as "complete".
const isBlankHtml = (h) => !h || !String(h).replace(/<[^>]*>|\s+/g, "").trim();

export default function PoliciesSettings({ setting, onSave }) {
  const [form, setForm] = useState(() => ({
    terms_policy: setting.terms_policy || "",
    privacy_policy: setting.privacy_policy || "",
    return_policy: setting.return_policy || "",
    shipping_policy: setting.shipping_policy || "",
    terms_policy_ar: setting.terms_policy_ar || "",
    privacy_policy_ar: setting.privacy_policy_ar || "",
    return_policy_ar: setting.return_policy_ar || "",
    shipping_policy_ar: setting.shipping_policy_ar || "",
  }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  };

  // Arabic content is required: a policy that has English content must also have
  // Arabic content before it can be saved, so the Arabic storefront is never
  // blank. Policies with no English yet are allowed through (not yet drafted).
  const save = async () => {
    const errs = {};
    for (const p of POLICIES) {
      const arKey = `${p.key}_ar`;
      if (!isBlankHtml(form[p.key]) && isBlankHtml(form[arKey])) {
        errs[arKey] = "Arabic content is required before this policy can be saved as complete.";
      }
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        These pages render on the storefront at <span className="font-mono text-xs">/policies/terms</span>, <span className="font-mono text-xs">/policies/privacy</span>, etc. Arabic content is required so the Arabic storefront isn't blank.
      </p>
      {POLICIES.map((p) => (
        <div key={p.key} className="space-y-3 rounded-xl border border-border p-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{p.label} (English)</span>
            <div className="rounded-md border border-border">
              <ReactQuill
                theme="snow"
                value={form[p.key]}
                onChange={(v) => set(p.key, v)}
                modules={QUILL_MODULES}
                style={{ height: 180, marginBottom: 42 }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {p.label} (Arabic) <span className="text-red-500">*</span>
            </span>
            <div className="rounded-md border border-border" dir="rtl">
              <ReactQuill
                theme="snow"
                value={form[`${p.key}_ar`]}
                onChange={(v) => set(`${p.key}_ar`, v)}
                modules={QUILL_MODULES}
                style={{ height: 180, marginBottom: 42, direction: "rtl" }}
              />
            </div>
            {errors[`${p.key}_ar`] && (
              <span className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="h-3.5 w-3.5" /> {errors[`${p.key}_ar`]}
              </span>
            )}
          </div>
        </div>
      ))}
      <div className="flex justify-end pt-1">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save policies"}
        </Button>
      </div>
    </div>
  );
}