import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

// Renders a scannable barcode to an inline SVG using JsBarcode.
// Supports CODE128 (auto-generated values) and EAN13 (13-digit numeric, manual entry).
export default function BarcodeView({ value, type = "CODE128", width = 2, height = 50, displayValue = true, fontSize = 14, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: type === "EAN13" ? "EAN13" : "CODE128",
        width,
        height,
        displayValue,
        fontSize,
        margin: 4,
        lineColor: "#111",
        background: "#ffffff",
      });
    } catch {
      // invalid value for symbology — clear the svg so it doesn't render a stale barcode
      if (ref.current) ref.current.innerHTML = "";
    }
  }, [value, type, width, height, displayValue, fontSize]);

  return <svg ref={ref} className={className} />;
}