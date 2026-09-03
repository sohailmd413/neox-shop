import React from "react";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

// 0–4 score from simple heuristics. Returns null until the user starts typing
// so the meter isn't noise on an empty field.
function score(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  return Math.min(s, 4);
}

const FILL = ["bg-border", "bg-red-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500"];
const LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const TEXT = [
  "text-muted-foreground",
  "text-red-500",
  "text-amber-500",
  "text-amber-500",
  "text-emerald-500",
];

export default function PasswordStrength({ password }) {
  const s = score(password);
  const reqs = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "1 number", ok: /[0-9]/.test(password) },
    { label: "1 symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={`h-full rounded-full ${FILL[s]}`}
            initial={{ width: 0 }}
            animate={{ width: `${(s / 4) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        </div>
        <span className={`text-xs font-medium ${TEXT[s]}`}>{LABEL[s]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {reqs.map((r) => (
          <div key={r.label} className="flex items-center gap-1 text-xs">
            {r.ok ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={r.ok ? "text-emerald-500" : "text-muted-foreground"}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}