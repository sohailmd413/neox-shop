import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Star, Trash2, ShoppingBag, Scale, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCompare } from "@/lib/CompareContext";
import { useCart } from "@/lib/CartContext";
import { useLanguage } from "@/lib/i18n";
import { formatPrice, lf } from "@/lib/format";
import ProductImage from "@/components/storefront/ProductImage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Side-by-side comparison view: one column per selected product (image, name,
// price, rating), then a row per shared specification. Only specs present on at
// least one product are shown; missing values render as "—". Each column has a
// remove control and an Add-to-cart. Horizontally scrollable on mobile.
export default function CompareModal({ open, onClose }) {
  const { t, lang } = useLanguage();
  const { items, remove } = useCompare();
  const { addItem } = useCart();
  const [specs, setSpecs] = useState({});
  const [loading, setLoading] = useState(false);

  const idsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (!open || items.length === 0) { setSpecs({}); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const map = {};
      await Promise.all(items.map(async (p) => {
        try {
          const list = await base44.entities.ProductSpecification.filter({ product_id: p.id }, "sort_order", 100);
          map[p.id] = list || [];
        } catch { map[p.id] = []; }
      }));
      if (!cancelled) { setSpecs(map); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, idsKey]);

  if (!open) return null;

  // Union of spec attribute names, preserving first-seen order across items.
  const specNames = [];
  items.forEach((p) => {
    (specs[p.id] || []).forEach((s) => {
      if (s.attribute_name && !specNames.includes(s.attribute_name)) specNames.push(s.attribute_name);
    });
  });

  const valueFor = (productId, name) => {
    const s = (specs[productId] || []).find((x) => x.attribute_name === name);
    return s?.attribute_value;
  };

  const addToCart = (p) => {
    if ((p.stock ?? 0) <= 0) return;
    addItem({ id: p.id, name: p.name, name_ar: p.name_ar, price: p.price, images: p.image ? [p.image] : [], stock: p.stock }, 1);
  };

  const labelCell = "border-b border-border bg-muted/30 px-3 py-2.5 text-start text-xs font-medium text-muted-foreground whitespace-nowrap";
  const cell = "border-b border-border px-3 py-2.5 align-top min-w-[190px]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold"><Scale className="h-5 w-5" /> {t("compare.title")}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" dir={lang === "ar" ? "rtl" : "ltr"}>
            <tbody>
              {/* Image + remove */}
              <tr>
                <th className={labelCell}>{t("compare.product")}</th>
                {items.map((p) => (
                  <td key={p.id} className={cell}>
                    <div className="relative">
                      <button
                        onClick={() => remove(p.id)}
                        className="absolute end-0 -top-1 rounded-full bg-background/90 p-1 text-muted-foreground shadow-sm hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("compare.remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link to={`/product/${p.slug || p.id}`} onClick={onClose} className="block">
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
                          <ProductImage src={p.image} alt={p.name} fittingType="fill" className="h-full w-full object-cover" />
                        </div>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
              {/* Name */}
              <tr>
                <th className={labelCell}>{t("compare.name")}</th>
                {items.map((p) => (
                  <td key={p.id} className={cn(cell, "font-medium")}>
                    <Link to={`/product/${p.slug || p.id}`} onClick={onClose} className="hover:underline">{lf(p, "name", lang) || p.name}</Link>
                  </td>
                ))}
              </tr>
              {/* Price */}
              <tr>
                <th className={labelCell}>{t("compare.price")}</th>
                {items.map((p) => (
                  <td key={p.id} className={cell}>
                    <span className="font-semibold">{formatPrice(p.price)}</span>
                    {p.compare_at_price && p.compare_at_price > p.price && (
                      <span className="ms-1.5 text-xs text-muted-foreground line-through">{formatPrice(p.compare_at_price)}</span>
                    )}
                  </td>
                ))}
              </tr>
              {/* Rating */}
              <tr>
                <th className={labelCell}>{t("compare.rating")}</th>
                {items.map((p) => (
                  <td key={p.id} className={cell}>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{Number(p.rating || 0).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({p.num_reviews || 0})</span>
                    </span>
                  </td>
                ))}
              </tr>
              {/* Add to cart */}
              <tr>
                <th className={labelCell}></th>
                {items.map((p) => {
                  const out = (p.stock ?? 0) <= 0;
                  return (
                    <td key={p.id} className={cell}>
                      <Button size="sm" onClick={() => addToCart(p)} disabled={out} className="w-full">
                        <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> {t("compare.addToCart")}
                      </Button>
                    </td>
                  );
                })}
              </tr>

              {specNames.length > 0 && (
                <tr>
                  <th className={cn(labelCell, "pt-4")}>{t("compare.specifications")}</th>
                  {items.map((p) => <td key={p.id} className={cn(cell, "pt-4")} />)}
                </tr>
              )}
              {specNames.map((name) => (
                <tr key={name}>
                  <th className={labelCell}>{name}</th>
                  {items.map((p) => (
                    <td key={p.id} className={cell}>
                      {valueFor(p.id, name) || <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("compare.loading")}</span>
          ) : specNames.length === 0 ? (
            <span>{t("compare.noSpecs")}</span>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>{t("compare.close")}</Button>
        </div>
      </div>
    </div>
  );
}