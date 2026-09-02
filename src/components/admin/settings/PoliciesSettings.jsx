import { useState } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import { Save } from "lucide-react";
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

export default function PoliciesSettings({ setting, onSave }) {
  const [form, setForm] = useState(() => ({
    terms_policy: setting.terms_policy || "",
    privacy_policy: setting.privacy_policy || "",
    return_policy: setting.return_policy || "",
    shipping_policy: setting.shipping_policy || "",
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">These pages render on the storefront at <span className="font-mono text-xs">/policies/terms</span>, <span className="font-mono text-xs">/policies/privacy</span>, etc.</p>
      {POLICIES.map((p) => (
        <div key={p.key} className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{p.label}</span>
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
      ))}
      <div className="flex justify-end pt-1">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save policies"}
        </Button>
      </div>
    </div>
  );
}