import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X, Heart, Package, LayoutDashboard, User, LogOut, LayoutGrid, Languages, ChevronDown } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { Image } from "@/components/ui/image";
import SearchBar from "@/components/storefront/SearchBar";
import MegaMenu from "@/components/storefront/MegaMenu";
import CategoryScrollRow from "@/components/storefront/CategoryScrollRow";
import MobileMenuDrawer from "@/components/storefront/MobileMenuDrawer";

// Resolve an admin-managed NavItem to a router target. Returns either
// { to } for an internal route or { href } for an external link.
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

function NavLink({ item, catMap, lang, onClick }) {
  const target = navTarget(item, catMap);
  const cls = item.is_highlighted
    ? "shrink-0 whitespace-nowrap text-sm font-semibold text-deal transition-opacity hover:opacity-70"
    : "shrink-0 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground";
  if (target.href) {
    return <a href={target.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>{navLabel(item, lang)}</a>;
  }
  return <Link to={target.to} onClick={onClick} className={cls}>{navLabel(item, lang)}</Link>;
}

export default function Navbar() {
  const { count, setIsOpen } = useCart();
  const { count: wishCount } = useWishlist();
  const { t, toggle, lang } = useLanguage();
  const store = useStoreSetting();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [navItems, setNavItems] = useState([]);
  const location = useLocation();
  const megaRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setIsAdmin(me?.role === "admin");
      } catch {}
      try {
        const [c, ni] = await Promise.all([
          base44.entities.Category.list("sort_order", 200),
          base44.entities.NavItem.filter({ status: "active" }, "display_order", 100),
        ]);
        setCategories((c || []).filter((x) => x.active !== false));
        setNavItems(ni || []);
      } catch {}
    })();
  }, []);

  // Reflect admin changes to nav items live, without a code change.
  useEffect(() => {
    const off = base44.entities.NavItem.subscribe(() => {
      base44.entities.NavItem.filter({ status: "active" }, "display_order", 100)
        .then(setNavItems).catch(() => {});
    });
    return () => off?.();
  }, []);

  const signOut = async () => {
    await base44.auth.logout();
    window.location.href = "/";
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMegaOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!megaOpen) return;
    const onClick = (e) => {
      if (megaRef.current && megaRef.current.contains(e.target)) return;
      if (e.target.closest("[data-mega-toggle]")) return;
      setMegaOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMegaOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [megaOpen]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const tops = categories.filter((c) => !c.parent_id);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Quick links (highlighted promo group) + category row, read from NavItem.
  // Falls back to the prior hardcoded behavior only while the table is empty
  // (e.g. before the admin first opens the Navigation page to seed it).
  const hasNav = navItems.length > 0;
  const quickItems = hasNav ? navItems.filter((i) => i.placement === "quick_links") : [
    { label_en: "Deals", label_ar: "عروض", link_type: "deals", is_highlighted: true },
    { label_en: "New Arrivals", label_ar: "وصل حديثًا", link_type: "new_arrivals", is_highlighted: true },
    { label_en: "Best Sellers", label_ar: "الأكثر مبيعًا", link_type: "best_sellers", is_highlighted: true },
  ];
  const rowItems = hasNav
    ? navItems.filter((i) => i.placement === "primary_row")
    : tops.map((c) => ({ label_en: c.name, label_ar: c.name_ar, link_type: "category", category_id: c.id }));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/90 backdrop-blur-xl shadow-[0_2px_30px_-18px_rgba(0,0,0,0.25)]"
          : "border-b border-border bg-background"
      }`}
    >
      {/* Tier 1 — utility bar: logo → search → icon cluster */}
      <nav className={`mx-auto flex items-center gap-3 px-4 transition-all duration-300 sm:px-6 ${scrolled ? "h-12" : "h-14"}`}>
        <Link to="/" className="flex shrink-0 items-center gap-2">
          {store.logo_url ? (
            <Image src={store.logo_url} alt={store.store_name || "Store"} fittingType="fit" className="h-7 w-auto max-w-[120px]" />
          ) : (
            <span className="text-lg font-bold tracking-tight">{store.store_name || "MarketFlow"}</span>
          )}
        </Link>

        <div className="hidden flex-1 md:block md:max-w-2xl md:mx-auto">
          <SearchBar placeholder={t("search.placeholder")} />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {(isAdmin || !user) && (
            <Link to={isAdmin ? "/admin" : "/admin/login"} className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex" aria-label={isAdmin ? t("nav.adminPanel") : t("nav.adminSignin")} title={isAdmin ? t("nav.adminPanel") : t("nav.adminSignin")}>
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          {user ? (
            <>
              <Link to="/account" className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex" aria-label={t("nav.account")}>
                <User className="h-5 w-5" />
              </Link>
              <button onClick={signOut} className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex" aria-label={t("nav.signOut")}>
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to="/login" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted" aria-label={t("nav.signIn")}>
                <User className="h-5 w-5" />
              </Link>
              <Link to="/register" className="flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90">
                {t("nav.register")}
              </Link>
            </div>
          )}
          <span className="hidden h-5 w-px bg-border sm:block" />
          <Link to="/orders" className="relative hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex" aria-label={t("nav.myOrders")}>
            <Package className="h-5 w-5" />
          </Link>
          <button onClick={toggle} className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex" aria-label="Switch language">
            <Languages className="h-4 w-4" />
            {t("lang.btn")}
          </button>
          <Link to="/wishlist" className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted" aria-label={t("nav.wishlist")}>
            <Heart className="h-5 w-5" />
            <AnimatePresence>
              {wishCount > 0 && (
                <motion.span key={wishCount} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[10px] font-bold text-deal-foreground">
                  {wishCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button onClick={() => setIsOpen(true)} data-cart-icon className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted" aria-label={t("nav.openCart")}>
            <motion.span key={`bag-${count}`} initial={{ scale: 0.8, y: -2 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-flex">
              <ShoppingBag className="h-5 w-5" />
            </motion.span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[10px] font-bold text-deal-foreground">
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button onClick={() => setMobileOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted md:hidden" aria-label={t("nav.menu")}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Tier 2 — category navigation bar (desktop only; mobile uses the menu) */}
      <div className="hidden border-t border-border bg-muted/30 md:block">
        <div className="mx-auto flex h-10 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            data-mega-toggle
            onClick={() => setMegaOpen((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            aria-expanded={megaOpen}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("nav.allCategories")}
            <ChevronDown className={`h-4 w-4 transition-transform ${megaOpen ? "rotate-180" : ""}`} />
          </button>

          {quickItems.length > 0 && (
            <div className="flex shrink-0 items-center gap-2.5">
              {quickItems.map((item, idx) => <NavLink key={item.id || idx} item={item} catMap={catMap} lang={lang} />)}
            </div>
          )}

          {quickItems.length > 0 && rowItems.length > 0 && <span className="h-4 w-px shrink-0 bg-border" />}

          {rowItems.length > 0 && (
            <CategoryScrollRow>
              {rowItems.map((item, idx) => <NavLink key={item.id || idx} item={item} catMap={catMap} lang={lang} />)}
            </CategoryScrollRow>
          )}
        </div>
      </div>

      {/* Mega-menu panel (live category tree) */}
      <AnimatePresence>
        {megaOpen && (
          <motion.div
            ref={megaRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full hidden border-b border-border bg-background shadow-xl md:block"
          >
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
              <MegaMenu categories={categories} lang={lang} onNavigate={() => setMegaOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu drawer */}
      <MobileMenuDrawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        user={user}
        isAdmin={isAdmin}
        signOut={signOut}
        categories={categories}
        quickItems={quickItems}
        catMap={catMap}
        lang={lang}
        t={t}
        toggle={toggle}
      />
    </header>
  );
}