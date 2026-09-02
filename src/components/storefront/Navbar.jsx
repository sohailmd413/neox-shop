import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X, Heart, Package, LayoutDashboard, User, LogOut } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { Languages } from "lucide-react";
import SearchBar from "@/components/storefront/SearchBar";

const navLinks = [
  { key: "nav.shop", path: "/shop" },
  { key: "nav.new", path: "/shop?sort=newest" },
  { key: "nav.sale", path: "/shop?filter=sale" },
];

export default function Navbar() {
  const { count, setIsOpen } = useCart();
  const { count: wishCount } = useWishlist();
  const { t, toggle } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setIsAdmin(me?.role === "admin");
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
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-background/0"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            MAISON
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                to={link.path}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            aria-label="Switch language"
          >
            <Languages className="h-4 w-4" />
            {t("lang.btn")}
          </button>
          <div className="hidden w-64 sm:block">
            <SearchBar placeholder={t("nav.search")} />
          </div>

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
          <Link
            to="/orders"
            className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex"
            aria-label={t("nav.myOrders")}
          >
            <Package className="h-5 w-5" />
          </Link>
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
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background"
                >
                  {wishCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label={t("nav.openCart")}
          >
            <ShoppingBag className="h-5 w-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background"
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  to={link.path}
                  className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t(link.key)}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
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
              {user ? (
                <button onClick={signOut} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {t("nav.signOut")}
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1 rounded-lg px-3 py-2.5 text-center text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    {t("nav.signIn")}
                  </Link>
                  <Link to="/register" className="flex-1 rounded-lg bg-foreground px-3 py-2.5 text-center text-sm font-medium text-background">
                    {t("nav.register")}
                  </Link>
                </div>
              )}
              <div className="px-3 pt-2">
                <SearchBar placeholder={t("nav.searchProducts")} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}