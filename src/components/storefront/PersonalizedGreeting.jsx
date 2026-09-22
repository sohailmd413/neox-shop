import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { loadHistoryProducts } from "@/lib/recentlyViewed";
import { displayName } from "@/lib/users";
import { useLanguage } from "@/lib/i18n";

// Personalized homepage greeting for logged-in customers. Shows "Welcome
// back, [first name]" plus a "New in [most-viewed category]" link, derived
// from the customer's Recently Viewed history. Renders nothing for guests or
// customers with no viewing history yet — the standard hero shows as-is, so
// we never display a broken or generic-feeling personalization attempt.
export default function PersonalizedGreeting() {
  const { lang } = useLanguage();
  const [state, setState] = useState(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const me = await base44.auth.me();
        if (!me) return; // guests get the standard hero
        const [history, categories] = await Promise.all([
          loadHistoryProducts(8),
          base44.entities.Category.list("sort_order", 200).catch(() => []),
        ]);
        if (!mounted) return;
        if (!history || history.length === 0) return; // no viewing history → skip
        const counts = {};
        history.forEach((p) => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (!top) return;
        const catName = top[0];
        const cat = (categories || []).find((c) => c.name === catName);
        const localName = cat ? (lang === "ar" ? (cat.name_ar || cat.name) : cat.name) : catName;
        // Use the editable display_name (set in the profile) — the built-in
        // full_name is managed by sign-in and can lag behind profile edits.
        const firstName = (displayName(me) || "").trim().split(/\s+/)[0];
        setState({ name: firstName, category: catName, categoryName: localName });
      } catch {
        /* never let personalization break the homepage */
      }
    };
    run();
    // Re-resolve when the customer saves a profile edit elsewhere, so the
    // greeting name refreshes without a full page reload.
    const onUpdate = () => run();
    window.addEventListener("profile-updated", onUpdate);
    return () => { mounted = false; window.removeEventListener("profile-updated", onUpdate); };
  }, [lang]);

  if (!state) return null;
  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-foreground">
          {lang === "ar" ? `أهلًا بعودتك، ${state.name}` : `Welcome back, ${state.name}`}
        </span>
        <span className="text-muted-foreground">·</span>
        <Link
          to={`/shop?category=${encodeURIComponent(state.category)}`}
          className="inline-flex items-center gap-1 font-medium text-deal hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {lang === "ar" ? `جديد في ${state.categoryName}` : `New in ${state.categoryName}`}
        </Link>
      </div>
    </div>
  );
}