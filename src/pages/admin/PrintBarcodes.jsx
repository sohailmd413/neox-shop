import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BarcodeView from "@/components/admin/BarcodeView";
import { STORE_INFO } from "@/lib/storeInfo";
import { formatPrice } from "@/lib/format";

// Standalone print page opened in a new tab from the Products list.
// URL: /print/barcodes?ids=<id1>,<id2>,...  → renders a label sheet (2"x1") and triggers print.
export default function PrintBarcodes() {
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = (params.get("ids") || "").split(",").filter(Boolean);
    Promise.all(ids.map((id) => base44.entities.Product.get(id).catch(() => null)))
      .then((recs) => setProducts(recs.filter(Boolean)))
      .finally(() => setLoaded(true));
  }, []);

  const doPrint = () => { setPrinting(true); setTimeout(() => window.print(), 80); };

  if (!loaded) return <div className="p-10 text-sm text-muted-foreground">Loading labels…</div>;
  if (!products.length) return <div className="p-10 text-sm text-muted-foreground">No products selected.</div>;

  return (
    <div className="bg-white p-4 print:p-0">
      <style>{`
        @media screen { body { background: #e5e7eb; } }
        .mf-label {
          width: 2in; height: 1in; padding: 4px 6px; box-sizing: border-box;
          display: flex; flex-direction: column; justify-content: space-between;
          border: 1px dashed #d1d5db on screen;
          page-break-inside: avoid; break-inside: avoid; overflow: hidden;
        }
        @media print {
          @page { size: auto; margin: 6mm; }
          .mf-no-print { display: none !important; }
          .mf-label { border: none; }
          .mf-grid { display: block; }
          .mf-label { margin: 0 0 6mm 0; }
        }
      `}</style>

      <div className="mf-no-print mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Print barcode labels</h1>
          <p className="text-sm text-muted-foreground">{products.length} label(s) · 2"×1" sheet</p>
        </div>
        <button onClick={doPrint} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="mf-grid flex flex-wrap gap-3 print:block">
        {products.map((p) => (
          <div key={p.id} className="mf-label rounded-md">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold leading-tight">{p.name || "Untitled product"}</div>
              {p.name_ar && <div dir="rtl" className="truncate text-[10px] leading-tight text-gray-600">{p.name_ar}</div>}
            </div>
            <div className="flex items-end justify-between gap-1">
              <div className="text-[12px] font-bold">{formatPrice(p.price)}</div>
              <div className="shrink-0">
                {p.barcode ? (
                  <BarcodeView value={p.barcode} type={p.barcode_type || "CODE128"} width={1.1} height={28} fontSize={9} displayValue className="block" />
                ) : (
                  <span className="text-[9px] text-gray-400">No barcode</span>
                )}
              </div>
            </div>
            {p.sku && <div className="text-[8px] text-gray-500">SKU: {p.sku}</div>}
            <div className="text-[7px] text-gray-400">{STORE_INFO.name_en}</div>
          </div>
        ))}
      </div>
    </div>
  );
}