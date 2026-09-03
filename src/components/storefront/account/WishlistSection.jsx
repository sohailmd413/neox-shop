import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/StateViews";
import { Heart, ShoppingBag } from "lucide-react";

export default function WishlistSection() {
  const { ids, removeItem } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (ids.length === 0) { setProducts([]); setLoading(false); return; }
      try {
        const all = await base44.entities.Product.list("-created_date", 200);
        setProducts(all.filter((p) => ids.includes(p.id)));
      } catch { setProducts([]); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (loading) return <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-muted/40" /></div>;
  if (products.length === 0) return <EmptyState icon={Heart} title="Your wishlist is empty" description="Tap the heart on any product." action={<Button asChild variant="outline"><Link to="/shop">Browse</Link></Button>} className="rounded-2xl border border-border" />;

  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div key={p.id} className="flex gap-4 rounded-2xl border border-border p-4">
          <Link to={`/product/${p.id}`} className="h-16 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted/40">{p.images?.[0] && <Image src={p.images[0]} alt={p.name} fittingType="fill" className="h-full w-full object-cover" />}</Link>
          <div className="flex flex-1 flex-col">
            <Link to={`/product/${p.id}`} className="line-clamp-1 text-sm font-medium hover:underline">{p.name}</Link>
            <p className="text-sm font-semibold">{formatPrice(p.price)}</p>
            <div className="mt-auto flex items-center gap-2 pt-2">
              <Button size="sm" disabled={p.stock <= 0} onClick={() => addItem(p, 1)}><ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Add to cart</Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(p.id)}><Heart className="h-4 w-4 fill-current" /></Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm"><Link to="/wishlist">View full wishlist →</Link></Button>
      </div>
    </div>
  );
}