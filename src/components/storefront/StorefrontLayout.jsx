import React from "react";
import { Outlet, Link } from "react-router-dom";
import Navbar from "./Navbar";
import CartDrawer from "./CartDrawer";

export default function StorefrontLayout() {
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
                Considered objects for everyday living. Designed to last, made to be loved.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Shop
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/shop" className="hover:underline">All products</Link></li>
                <li><Link to="/shop?sort=newest" className="hover:underline">New arrivals</Link></li>
                <li><Link to="/shop?filter=sale" className="hover:underline">Sale</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Support
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Shipping & returns</li>
                <li>Contact us</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Newsletter
              </h4>
              <p className="mt-3 text-sm text-muted-foreground">
                Join for early access to new collections.
              </p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  placeholder="Email address"
                  className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                />
                <button className="rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90">
                  Join
                </button>
              </form>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Maison. All rights reserved.</p>
            <p>Crafted with care.</p>
          </div>
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}