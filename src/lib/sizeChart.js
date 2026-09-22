// Shared size-chart helpers used by the admin table builder and the storefront
// "Find my size" tool. Keeps the recommendation logic in one place so the admin
// preview and the customer-facing modal agree.

export const DEFAULT_COLUMNS = {
  apparel: [
    { key: "size", label: "Size", label_ar: "المقاس", is_size_column: true, unit: "" },
    { key: "chest_cm", label: "Chest (cm)", label_ar: "الصدر (سم)", is_size_column: false, unit: "cm" },
    { key: "waist_cm", label: "Waist (cm)", label_ar: "الخصر (سم)", is_size_column: false, unit: "cm" },
  ],
  footwear: [
    { key: "size", label: "Size", label_ar: "المقاس", is_size_column: true, unit: "" },
    { key: "eu", label: "EU", label_ar: "أوروبي", is_size_column: false, unit: "eu" },
    { key: "uk", label: "UK", label_ar: "بريطاني", is_size_column: false, unit: "uk" },
    { key: "us", label: "US", label_ar: "أمريكي", is_size_column: false, unit: "us" },
    { key: "foot_length_cm", label: "Foot length (cm)", label_ar: "طول القدم (سم)", is_size_column: false, unit: "cm" },
  ],
};

export const slugKey = (label) =>
  String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "col";

export const sizeColumn = (chart) =>
  (chart?.columns || []).find((c) => c.is_size_column) || (chart?.columns || [])[0] || null;

export const sizeValue = (chart, row) => {
  const col = sizeColumn(chart);
  return col ? row?.[col.key] : undefined;
};

// Non-size columns the customer can enter a measurement / system value for.
export const measurementColumns = (chart) => {
  const sizeKey = sizeColumn(chart)?.key;
  return (chart?.columns || []).filter((c) => c.key !== sizeKey);
};

// Recommend a row for the entered value in the given column/unit.
// - Measurement columns (cm/inch): convert both sides to cm, recommend the
//   smallest size whose measurement still fits (>= entered). Falls back to the
//   largest available if the entered value exceeds all rows.
// - Size-system columns (eu/uk/us): nearest numeric match.
export function findRecommendedSize(chart, { columnKey, value, unit } = {}) {
  const rows = chart?.rows || [];
  if (!rows.length || !columnKey || value === "" || value == null) return null;
  const col = (chart.columns || []).find((c) => c.key === columnKey);
  if (!col) return null;
  const num = (r) => {
    const n = Number(r?.[columnKey]);
    return Number.isFinite(n) ? n : null;
  };
  const isMeasurement = col.unit === "cm" || col.unit === "inch";
  if (isMeasurement) {
    const toCm = (v, u) => (u === "inch" ? v * 2.54 : v);
    const enteredCm = toCm(Number(value), unit);
    const sorted = [...rows].sort((a, b) => (num(a) ?? Infinity) - (num(b) ?? Infinity));
    const match =
      sorted.find((r) => {
        const n = num(r);
        return n != null && toCm(n, col.unit) >= enteredCm;
      }) || sorted[sorted.length - 1];
    return match || null;
  }
  const entered = Number(value);
  let best = null;
  let bestDiff = Infinity;
  for (const r of rows) {
    const n = num(r);
    if (n == null) continue;
    const d = Math.abs(n - entered);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best;
}