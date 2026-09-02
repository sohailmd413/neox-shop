export const RANGES = [
  { id: "1", label: "Today" },
  { id: "y", label: "Yesterday" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "lmonth", label: "Last month" },
  { id: "year", label: "This year" },
];

export function rangeBounds(id) {
  const now = new Date();
  let start, end = now;
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (id === "1") start = sod(now);
  else if (id === "y") { start = sod(new Date(now.getTime() - 86400000)); end = new Date(start.getTime() + 86399999); }
  else if (id === "7") start = sod(new Date(now.getTime() - 6 * 86400000));
  else if (id === "30") start = new Date(now.getTime() - 30 * 86400000);
  else if (id === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (id === "lmonth") { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); }
  else if (id === "year") start = new Date(now.getFullYear(), 0, 1);
  else start = new Date(now.getTime() - 30 * 86400000);

  const len = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - len);
  const prevEnd = new Date(start.getTime() - 1);
  return { cur: [start, end], prev: [prevStart, prevEnd] };
}

export const inRange = (date, [s, e]) => {
  const t = new Date(date).getTime();
  return t >= s.getTime() && t <= e.getTime();
};

export const deltaPct = (cur, prev) => (prev === 0 ? 0 : ((cur - prev) / prev) * 100);

export function exportCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}