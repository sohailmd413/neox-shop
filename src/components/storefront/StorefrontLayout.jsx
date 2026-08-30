import React from "react";
import { Outlet, Link } from "react-router-dom";
import Navbar from "./Navbar";
import CartDrawer from "./CartDrawer";
import { useLanguage } from "@/lib/i18n";

export default function StorefrontLayout() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="text-lg font-semibold tracking-tight">
                MAISON
              </Link>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("footer.shop")}
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/shop" className="hover:underline">{t("footer.allProducts")}</Link></li>
                <li><Link to="/shop?sort=newest" className="hover:underline">{t("footer.newArrivals")}</Link></li>
                <li><Link to="/shop?filter=sale" className="hover:underline">{t("footer.sale")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("footer.support")}
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>{t("footer.shipping")}</li>
                <li>{t("footer.contact")}</li>
                <li>{t("footer.faq")}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("footer.newsletter")}
              </h4>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("footer.newsletterText")}
              </p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  placeholder={t("footer.emailPlaceholder")}
                  className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                />
                <button className="rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90">
                  {t("footer.join")}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>{t("footer.rights")}</p>
            <p>{t("footer.crafted")}</p>
          </div>
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}