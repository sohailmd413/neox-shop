import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function remaining(ms) {
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function SaleCountdown({ endsAt, className = "" }) {
  const [left, setLeft] = useState(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(remaining(new Date(endsAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (!endsAt) return null;
  if (!left) return <span className={`text-xs font-medium text-muted-foreground ${className}`}>Sale ended</span>;

  const urgent = new Date(endsAt).getTime() - Date.now() < 86400000;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${urgent ? "text-destructive" : "text-amber-600"} ${className}`}
    >
      <Clock className="h-3 w-3" />
      {left}
    </span>
  );
}