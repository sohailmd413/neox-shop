import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  User as UserIcon,
  Package,
  Heart,
  MapPin,
  LogOut,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// Resolve an admin-managed NavItem to a router target (mirrors Navbar.navTarget).
function navTarget(item, catMap) {
  switch (item.link_type) {
    case "deals": return { to: "/shop?view=deals" };
    case "new_arrivals": return { to: "/shop?view=new" };
    case "best_sellers": return { to: "/shop?view=best" };
    case "featured": return { to: "/shop?view=featured" };
    case "custom_url": {
      const u = item.custom_url || "";
      return /^https?:\/\//.test(u) ? { href: u } : { to: u || "/shop" };
    }
    case "category": {
      const cat = catMap.get(item.category_id);
      const name = cat?.name || "";
      return { to: name ? `/shop?category=${encodeURIComponent(name)}` : "/shop" };
    }
    default: return { to: "/shop" };
  }
}
function navLabel(item, lang) {
  return lang === "ar" ? (item.label_ar || item.label_en) : item.label_en;
}
function catLabel(c, lang) {
  return lang === "ar" ? (c.name_ar || c.name) : c.name;
}

function initialsOf(u) {
  const name = u?.full_name || u?.name || u?.email || "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "U").toUpperCase();
}

export default function MobileMenuDrawer({
  open,
  onOpenChange,
  user,
  isAdmin,
  signOut,
  categories,
  quickItems,
  catMap,
  lang,
  t,
  toggle,
  highlightAccount,
}) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (open && highlightAccount) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1600);
      return () => clearTimeout(id);
    }
  }, [open, highlightAccount]);
  const accountRing = flash ? "ring-2 ring-deal ring-offset-2 ring-offset-background" : "";

  const tops = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenByParent = useMemo(() => {
    const m = {};
    categories.forEach((c) => { if (c.parent_id) (m[c.parent_id] ||= []).push(c); });
    return m;
  }, [categories]);

  const close = () => onOpenChange(false);

  const toggleExpand = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const rowCmp = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted";
  const rowMuted = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const quickRow = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-deal transition-colors hover:bg-deal/10";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={lang === "ar" ? "left" : "right"}
        className="flex w-[86vw] max-w-xs flex-col gap-0 p-0"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-4">
          <SheetTitle className="pr-8 text-base font-semibold">{t("nav.menu")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Account */}
          {user ? (
            <div className={`mb-3 rounded-xl border border-border bg-muted/30 p-3 ${accountRing}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {initialsOf(user)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.full_name || user.name || t("nav.account")}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                <Link to="/account" onClick={close} className={rowMuted}><UserIcon className="h-4 w-4" /> {t("account.profile")}</Link>
                <Link to="/orders" onClick={close} className={rowMuted}><Package className="h-4 w-4" /> {t("account.orders")}</Link>
                <Link to="/account" onClick={close} className={rowMuted}><MapPin className="h-4 w-4" /> {t("account.addresses")}</Link>
                <Link to="/wishlist" onClick={close} className={rowMuted}><Heart className="h-4 w-4" /> {t("account.wishlist")}</Link>
                <button
                  onClick={() => { close(); signOut(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                </button>
              </div>
            </div>
          ) : (
            <div className={`mb-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3 ${accountRing}`}>
              <Link to="/login" onClick={close} className="block w-full rounded-lg bg-deal px-4 py-2.5 text-center text-sm font-semibold text-deal-foreground">
                {t("nav.signIn")}
              </Link>
              <Link to="/register" onClick={close} className="block w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground">
                {t("nav.register")}
              </Link>
            </div>
          )}

          {/* Search / all categories */}
          <div className="mb-2 space-y-0.5">
            <Link to="/shop" onClick={close} className={rowCmp}>
              <LayoutGrid className="h-4 w-4" /> {t("nav.allCategories")}
            </Link>
          </div>

          {/* Quick links (highlighted promos) */}
          {quickItems.length > 0 && (
            <div className="mb-2 space-y-0.5">
              {quickItems.map((item, idx) => {
                const tgt = navTarget(item, catMap);
                const label = navLabel(item, lang);
                if (tgt.href) {
                  return <a key={item.id || `q${idx}`} href={tgt.href} target="_blank" rel="noopener noreferrer" onClick={close} className={quickRow}>{label}</a>;
                }
                return <Link key={item.id || `q${idx}`} to={tgt.to} onClick={close} className={quickRow}>{label}</Link>;
              })}
            </div>
          )}

          <div className="my-2 border-t border-border" />

          {/* Category accordion */}
          <div className="space-y-0.5">
            {tops.map((c) => {
              const subs = childrenByParent[c.id] || [];
              const isOpen = expanded.has(c.id);
              const to = `/shop?category=${encodeURIComponent(c.name)}`;
              return (
                <div key={c.id}>
                  <div className="flex items-center">
                    <Link to={to} onClick={close} className={`flex-1 ${rowMuted} pl-3`}>
                      <span className="truncate">{catLabel(c, lang)}</span>
                    </Link>
                    {subs.length > 0 && (
                      <button onClick={() => toggleExpand(c.id)} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted" aria-label="Toggle">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {isOpen && subs.length > 0 && (
                    <div className="mt-0.5 ml-3 space-y-0.5 border-s border-border ps-2">
                      {subs.map((child) => (
                        <Link key={child.id} to={`/shop?category=${encodeURIComponent(child.name)}`} onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                          <span className="truncate">{catLabel(child, lang)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="my-2 border-t border-border" />

          {/* Utility */}
          <div className="space-y-0.5">
            <button onClick={() => { toggle(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Languages className="h-4 w-4" /> {t("lang.btn")}
            </button>
            {isAdmin ? (
              <Link to="/admin" onClick={close} className={rowMuted}><LayoutDashboard className="h-4 w-4" /> {t("nav.adminPanel")}</Link>
            ) : (
              <Link to="/admin/login" onClick={close} className={rowMuted}><LayoutDashboard className="h-4 w-4" /> {t("nav.adminSignin")}</Link>
            )}
            <div className="px-3 pt-2 text-xs uppercase tracking-wide text-muted-foreground/70">{t("footer.support")}</div>
            <Link to="/policies/terms" onClick={close} className={rowMuted}>{t("policy.terms")}</Link>
            <Link to="/policies/privacy" onClick={close} className={rowMuted}>{t("policy.privacy")}</Link>
            <Link to="/policies/return" onClick={close} className={rowMuted}>{t("policy.return")}</Link>
            <Link to="/policies/shipping" onClick={close} className={rowMuted}>{t("policy.shipping")}</Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}