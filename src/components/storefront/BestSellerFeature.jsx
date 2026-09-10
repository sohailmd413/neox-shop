import React from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import ProductImage from "@/components/storefront/ProductImage";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";
import { formatPrice, lf } from "@/lib/format";

// Asymmetric Best Sellers layout: a large #1 featured card beside a compact
// ranked list of #2–#5. Breaks the uniform-grid monotony with real visual
// hierarchy driven by the ranking, instead of six identical cards.
function RankedListItem({ product, rank, soldCount, lang }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex items-center gap-3.5 rounded-xl border border-border bg-background p-3 transition-colors hover:border-foreground/20 hover:bg-muted/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
        #{rank}
      </span>
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted/40">
        <ProductImage src={product.images?.[0]} alt={product.name} fittingType="fill" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{lf(product, "name", lang)}</h4>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{formatPrice(product.price)}</span>
          {product.compare_at_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
          )}
        </div>
        {soldCount > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {soldCount} {lang === "ar" ? "بيعت" : "sold"}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function BestSellerFeature({ products, soldMap = {}, lang, title, subtitle, to, viewAllLabel = "See all" }) {
  if (!products || products.length === 0) return null;
  const featured = products[0];
  const rest = products.slice(1, 5);
  return (
    <SectionShell>
      <SectionHeader title={title} subtitle={subtitle} to={to} viewAllLabel={viewAllLabel} icon={Trophy} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProductCard product={featured} index={0} rank={1} tag="best" soldCount={soldMap[featured.id] || 0} />
        <div className="grid gap-3">
          {rest.map((p, i) => (
            <RankedListItem key={p.id} product={p} rank={i + 2} soldCount={soldMap[p.id] || 0} lang={lang} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}