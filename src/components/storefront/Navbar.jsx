import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X, Heart, Package, LayoutDashboard, User, LogOut, LayoutGrid, Languages } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { Image } from "@/components/ui/image";
import SearchBar from "@/components/storefront/SearchBar";
import { lf } from "@/lib/format";

const quickLinks = [
  { key: "nav.deals", path: "/shop?filter=sale" },
  { key: "nav.new", path: "/shop?sort=newest" },
  { key: "nav.bestSellers", path: "/shop?sort=rating" },
];

export default function Navbar() {
  const { count, setIsOpen } = useCart();
  const { count: wishCount } = useWishlist();
  const { t, toggle, lang } = useLanguage();
  const store = useStoreSetting();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setIsAdmin(me?.role === "admin");
      } catch {}
      try {
        const c = await base44.entities.Category.list("sort_order", 100);
        setCategories((c || []).filter((x) => x.active !== false && !x.parent_id));
      } catch {}
    })();
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/90 backdrop-blur-xl shadow-[0_2px_30px_-18px_rgba(0,0,0,0.25)]"
          : "border-b border-border bg-background"
      }`}
    >
      {/* Row 1 — logo, centered wide search, account/checkout cluster */}
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.store_name || "Store"} fittingType="fit" className="h-7 w-auto max-w-[120px]" />
            ) : (
              <span className="text-lg font-bold tracking-tight">{store.store_name || "MarketFlow"}</span>
            )}
          </Link>
        </div>

        <div className="hidden flex-1 md:block md:max-w-2xl md:mx-auto">
          <SearchBar placeholder={t("search.placeholder")} />
        </div>

        <div className="flex items-center gap-1.5">
          {(isAdmin || !user) && (
            <Link
              to={isAdmin ? "/admin" : "/admin/login"}
              className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex"
              aria-label={isAdmin ? t("nav.adminPanel") : t("nav.adminSignin")}
              title={isAdmin ? t("nav.adminPanel") : t("nav.adminSignin")}
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          {user ? (
            <button
              onClick={signOut}
              className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex"
              aria-label={t("nav.signOut")}
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to="/login"
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
                aria-label={t("nav.signIn")}
              >
                <User className="h-5 w-5" />
              </Link>
              <Link
                to="/register"
                className="flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {t("nav.register")}
              </Link>
            </div>
          )}
          {user && (
            <Link
              to="/account"
              className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex"
              aria-label={t("nav.account")}
            >
              <User className="h-5 w-5" />
            </Link>
          )}
          <Link
            to="/orders"
            className="relative hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex"
            aria-label={t("nav.myOrders")}
          >
            <Package className="h-5 w-5" />
          </Link>
          <button
            onClick={toggle}
            className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            aria-label="Switch language"
          >
            <Languages className="h-4 w-4" />
            {t("lang.btn")}
          </button>
          <Link
            to="/wishlist"
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label={t("nav.wishlist")}
          >
            <Heart className="h-5 w-5" />
            <AnimatePresence>
              {wishCount > 0 && (
                <motion.span
                  key={wishCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[10px] font-bold text-deal-foreground"
                >
                  {wishCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            data-cart-icon
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label={t("nav.openCart")}
          >
            <motion.span
              key={`bag-${count}`}
              initial={{ scale: 0.8, y: -2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}
              className="inline-flex"
            >
              <ShoppingBag className="h-5 w-5" />
            </motion.span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[10px] font-bold text-deal-foreground"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted md:hidden"
            aria-label={t("nav.menu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Row 2 — quick category navigation (desktop only) */}
      <div className="hidden border-t border-border md:block">
        <div className="mx-auto flex h-7 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            to="/shop"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary"
          >
            <LayoutGrid className="h-4 w-4" />
            {t("nav.allCategories")}
          </Link>
          <span className="h-3.5 w-px bg-border" />
          {quickLinks.map((link) => (
            <Link
              key={link.key}
              to={link.path}
              className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          ))}
          <span className="h-3.5 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {lf(cat, "name", lang)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              <div className="mb-2">
                <SearchBar placeholder={t("search.placeholder")} />
              </div>
              <Link to="/shop" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                <LayoutGrid className="h-4 w-4" />
                {t("nav.allCategories")}
              </Link>
              {quickLinks.map((link) => (
                <Link
                  key={link.key}
                  to={link.path}
                  className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t(link.key)}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {lf(cat, "name", lang)}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              {user && (
                <Link to="/account" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {t("nav.account")}
                </Link>
              )}
              <Link to="/wishlist" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {t("nav.wishlist")}
              </Link>
              <Link to="/orders" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {t("nav.myOrders")}
              </Link>
              {isAdmin ? (
                <Link to="/admin" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {t("nav.adminPanel")}
                </Link>
              ) : !user ? (
                <Link to="/admin/login" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {t("nav.adminSignin")}
                </Link>
              ) : null}
              <button onClick={toggle} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Languages className="h-4 w-4" />
                {t("lang.btn")}
              </button>
              {user ? (
                <button onClick={signOut} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {t("nav.signOut")}
                </button>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link to="/login" className="flex-1 rounded-lg px-3 py-2.5 text-center text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    {t("nav.signIn")}
                  </Link>
                  <Link to="/register" className="flex-1 rounded-lg bg-foreground px-3 py-2.5 text-center text-sm font-medium text-background">
                    {t("nav.register")}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}