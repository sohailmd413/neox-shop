import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { STORE_INFO, INVOICE_LABELS } from "@/lib/storeInfo";

const PAYMENT_LABELS = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  paid: { en: "Paid", ar: "مدفوع" },
  packed: { en: "Paid", ar: "مدفوع" },
  shipped: { en: "Paid", ar: "مدفوع" },
  delivered: { en: "Paid", ar: "مدفوع" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
  refunded: { en: "Refunded", ar: "مسترد" },
};

export function paymentStatusLabel(status) {
  return PAYMENT_LABELS[status] || PAYMENT_LABELS.pending;
}

// Generate the next sequential invoice number for the current year,
// e.g. INV-2026-000123, based on the highest existing sequence in the given orders list.
export function nextInvoiceNumber(orders = []) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const o of orders) {
    const m = o.invoice_number && o.invoice_number.match(/INV-(\d{4})-(\d+)/);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }
  const seq = String(max + 1).padStart(6, "0");
  return `INV-${year}-${seq}`;
}

// Ensure the order has an invoice number assigned. Returns the number and whether
// it was newly assigned (so the caller can persist it alongside status updates).
export async function ensureInvoiceNumber(order, allOrders) {
  if (order.invoice_number) return { number: order.invoice_number, isNew: false };
  const number = nextInvoiceNumber(allOrders);
  await base44.entities.Order.update(order.id, {
    invoice_number: number,
    invoice_status: "generated",
    invoice_generated_at: new Date().toISOString(),
  });
  return { number, isNew: true };
}

// Fetch product details (for Arabic name + SKU) for all line items, keyed by product_id.
export async function fetchProductsForOrder(order) {
  const ids = (order.items || []).map((i) => i.product_id).filter(Boolean);
  const unique = Array.from(new Set(ids));
  const map = {};
  await Promise.all(unique.map(async (id) => {
    try {
      const p = await base44.entities.Product.get(id);
      if (p) map[id] = p;
    } catch { /* best effort */ }
  }));
  return map;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function addrBlock(addr, isAr = false) {
  if (!addr) return "—";
  const parts = [addr.line1, [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "), addr.country].filter(Boolean);
  return parts.join(isAr ? "، " : ", ");
}

const PAYMENT_LABEL_EN = { card: "Card", cod: "Cash on delivery", wallet: "Wallet", upi: "UPI", net_banking: "Net banking" };
const PAYMENT_LABEL_AR = { card: "بطاقة", cod: "الدفع عند الاستلام", wallet: "محفظة", upi: "UPI", net_banking: "تحويل مصرفي" };

// Build the offscreen invoice DOM node (bilingual EN + AR in one A4-width document).
export function buildInvoiceNode(order, productsById, invoiceNumber) {
  const items = order.items || [];
  const bill = order.billing_address && order.billing_address.line1 ? order.billing_address : order.shipping_address;
  const ship = order.shipping_address || {};
  const date = new Date(order.created_date).toLocaleDateString("en-GB");
  const pStatus = paymentStatusLabel(order.status);
  const payEn = PAYMENT_LABEL_EN[order.payment_method || "card"] || "Card";
  const payAr = PAYMENT_LABEL_AR[order.payment_method || "card"] || "Card";

  const rows = items.map((i, idx) => {
    const p = productsById[i.product_id];
    const ar = i.name_ar || p?.name_ar || "";
    const sku = i.sku || p?.sku || "";
    const qty = i.quantity || 0;
    const unit = i.price || 0;
    const line = unit * qty;
    return `<tr>
      <td style="padding:7px 8px;border:1px solid #ddd">
        <div style="font-weight:600">${esc(i.name)}</div>
        ${ar ? `<div dir="rtl" style="color:#555;font-size:11px">${esc(ar)}</div>` : ""}
        ${sku ? `<div style="color:#888;font-size:10px">${INVOICE_LABELS.sku.en}: ${esc(sku)}</div>` : ""}
      </td>
      <td style="padding:7px 8px;border:1px solid #ddd;text-align:center">${qty}</td>
      <td style="padding:7px 8px;border:1px solid #ddd;text-align:right">${esc(formatPrice(unit))}</td>
      <td style="padding:7px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${esc(formatPrice(line))}</td>
    </tr>`;
  }).join("");

  // Arabic-side rows (RTL)
  const arRows = items.map((i) => {
    const p = productsById[i.product_id];
    const ar = i.name_ar || p?.name_ar || i.name || "";
    const qty = i.quantity || 0;
    const unit = i.price || 0;
    const line = unit * qty;
    return `<tr dir="rtl">
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${esc(ar)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${qty}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${esc(formatPrice(unit))}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${esc(formatPrice(line))}</td>
    </tr>`;
  }).join("");

  const totalRow = (en, ar, val, bold = false) => `<div style="display:flex;justify-content:space-between;padding:3px 0;${bold ? "border-top:2px solid #111;margin-top:6px;padding-top:6px;font-weight:700" : ""}"><span>${en} / ${ar}</span><span>${esc(val)}</span></div>`;

  const html = `
  <div style="width:794px;padding:40px 44px;font-family:'Tahoma','Arial','Segoe UI',system-ui,sans-serif;background:#fff;color:#111;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px">
      <div>
        <div style="font-size:24px;font-weight:700">${esc(STORE_INFO.name_en)} · ${esc(STORE_INFO.name_ar)}</div>
        <div style="font-size:11px;color:#555;margin-top:2px">${esc(STORE_INFO.address_en)}</div>
        <div dir="rtl" style="font-size:11px;color:#555">${esc(STORE_INFO.address_ar)}</div>
        <div style="font-size:11px;color:#555">${esc(STORE_INFO.phone)} · ${esc(STORE_INFO.email)}</div>
        <div style="font-size:11px;color:#555;margin-top:3px">${esc(STORE_INFO.tax_id_en)} · <span dir="rtl">${esc(STORE_INFO.tax_id_ar)}</span></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:700">${esc(INVOICE_LABELS.invoice.en)} · <span dir="rtl">${esc(INVOICE_LABELS.invoice.ar)}</span></div>
        <div style="font-size:12px;color:#555;margin-top:4px">${esc(INVOICE_LABELS.invoice_no.en)} / ${esc(INVOICE_LABELS.invoice_no.ar)}: ${esc(invoiceNumber)}</div>
        <div style="font-size:12px;color:#555">${esc(INVOICE_LABELS.date.en)} / ${esc(INVOICE_LABELS.date.ar)}: ${date}</div>
      </div>
    </div>

    <div style="display:flex;gap:24px;margin-top:18px">
      <div style="flex:1">
        <div style="font-size:11px;color:#666;font-weight:600">${esc(INVOICE_LABELS.bill_to.en)} / ${esc(INVOICE_LABELS.bill_to.ar)}</div>
        <div style="font-weight:600;margin-top:2px">${esc(bill?.name || ship.name || "—")}</div>
        <div style="font-size:12px">${esc(order.customer_email || "")}</div>
        <div style="font-size:12px">${esc(bill?.phone || ship.phone || "")}</div>
        <div style="font-size:12px;color:#555">${esc(addrBlock(bill))}</div>
      </div>
      <div style="flex:1">
        <div style="font-size:11px;color:#666;font-weight:600">${esc(INVOICE_LABELS.ship_to.en)} / ${esc(INVOICE_LABELS.ship_to.ar)}</div>
        <div style="font-weight:600;margin-top:2px">${esc(ship.name || bill?.name || "—")}</div>
        <div style="font-size:12px;color:#555">${esc(addrBlock(ship))}</div>
        ${order.courier ? `<div style="font-size:12px;color:#555;margin-top:2px">Courier: ${esc(order.courier)}</div>` : ""}
        ${order.tracking_number ? `<div style="font-size:12px;color:#555">Tracking: ${esc(order.tracking_number)}</div>` : ""}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px;border:1px solid #ddd;text-align:left">${esc(INVOICE_LABELS.item.en)} / ${esc(INVOICE_LABELS.item.ar)}</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:center">${esc(INVOICE_LABELS.qty.en)} / ${esc(INVOICE_LABELS.qty.ar)}</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:right">${esc(INVOICE_LABELS.unit_price.en)} / ${esc(INVOICE_LABELS.unit_price.ar)}</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:right">${esc(INVOICE_LABELS.line_total.en)} / ${esc(INVOICE_LABELS.line_total.ar)}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <div style="width:300px;font-size:12px">
        ${totalRow(INVOICE_LABELS.subtotal.en, INVOICE_LABELS.subtotal.ar, formatPrice(order.subtotal))}
        ${totalRow(INVOICE_LABELS.shipping.en, INVOICE_LABELS.shipping.ar, order.shipping_fee === 0 ? "Free" : formatPrice(order.shipping_fee))}
        ${totalRow(INVOICE_LABELS.tax.en, INVOICE_LABELS.tax.ar, formatPrice(order.tax))}
        ${order.discount ? totalRow(order.coupon_code ? `${INVOICE_LABELS.discount.en} (${esc(order.coupon_code)})` : INVOICE_LABELS.discount.en, order.coupon_code ? `${INVOICE_LABELS.discount.ar} (${esc(order.coupon_code)})` : INVOICE_LABELS.discount.ar, "−" + formatPrice(order.discount)) : ""}
        ${totalRow(INVOICE_LABELS.grand_total.en, INVOICE_LABELS.grand_total.ar, formatPrice(order.total), true)}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:16px;font-size:12px">
      <div><span style="color:#666">${esc(INVOICE_LABELS.payment_method.en)} / ${esc(INVOICE_LABELS.payment_method.ar)}:</span> <strong>${esc(payEn)} · ${esc(payAr)}</strong></div>
      <div><span style="color:#666">${esc(INVOICE_LABELS.payment_status.en)} / ${esc(INVOICE_LABELS.payment_status.ar)}:</span> <strong>${esc(pStatus.en)} · ${esc(pStatus.ar)}</strong></div>
    </div>

    ${order.status === "refunded" ? `<div style="margin-top:10px;padding:8px 10px;border:1px dashed #b91c1c;background:#fef2f2;color:#b91c1c;font-size:12px">This order was refunded · تم استرداد هذا الطلب</div>` : ""}

    <!-- Arabic RTL detail block -->
    <div dir="rtl" style="margin-top:26px;border-top:1px solid #ddd;padding-top:14px">
      <div style="font-size:14px;font-weight:700">${esc(INVOICE_LABELS.invoice.ar)} — تفاصيل</div>
      <div style="font-size:12px;margin-top:4px">${esc(INVOICE_LABELS.invoice_no.ar)}: ${esc(invoiceNumber)} — ${esc(INVOICE_LABELS.date.ar)}: ${date}</div>
      <div style="font-size:12px">${esc(INVOICE_LABELS.bill_to.ar)}: ${esc(bill?.name || ship.name || "—")} — ${esc(order.customer_email || "")}</div>
      <div style="font-size:12px">${esc(INVOICE_LABELS.ship_to.ar)}: ${esc(addrBlock(ship, true))}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11px" dir="rtl">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:6px;border:1px solid #ddd">${esc(INVOICE_LABELS.item.ar)}</th>
          <th style="padding:6px;border:1px solid #ddd">${esc(INVOICE_LABELS.qty.ar)}</th>
          <th style="padding:6px;border:1px solid #ddd">${esc(INVOICE_LABELS.unit_price.ar)}</th>
          <th style="padding:6px;border:1px solid #ddd">${esc(INVOICE_LABELS.line_total.ar)}</th>
        </tr></thead>
        <tbody>${arRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-start;margin-top:8px"><div style="width:260px;font-size:12px">
        ${totalRow(INVOICE_LABELS.subtotal.ar, INVOICE_LABELS.subtotal.en, formatPrice(order.subtotal))}
        ${totalRow(INVOICE_LABELS.shipping.ar, INVOICE_LABELS.shipping.en, order.shipping_fee === 0 ? "Free" : formatPrice(order.shipping_fee))}
        ${totalRow(INVOICE_LABELS.tax.ar, INVOICE_LABELS.tax.en, formatPrice(order.tax))}
        ${order.discount ? totalRow(order.coupon_code ? `${INVOICE_LABELS.discount.ar} (${esc(order.coupon_code)})` : INVOICE_LABELS.discount.ar, order.coupon_code ? `${INVOICE_LABELS.discount.en} (${esc(order.coupon_code)})` : INVOICE_LABELS.discount.en, "−" + formatPrice(order.discount)) : ""}
        ${totalRow(INVOICE_LABELS.grand_total.ar, INVOICE_LABELS.grand_total.en, formatPrice(order.total), true)}
      </div></div>
      <div style="font-size:12px;margin-top:4px">${esc(INVOICE_LABELS.payment_method.ar)}: ${esc(payAr)} — ${esc(INVOICE_LABELS.payment_status.ar)}: ${esc(pStatus.ar)}</div>
    </div>

    <div style="margin-top:28px;border-top:1px solid #eee;padding-top:10px;font-size:11px;color:#666;text-align:center">
      Thank you for your business · شكراً لتعاملكم معنا
    </div>
  </div>`;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.background = "#fff";
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

async function nodeToCanvas(host) {
  const canvas = await html2canvas(host, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  document.body.removeChild(host);
  return canvas;
}

function addPagedImage(pdf, canvas, newPage) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  if (newPage) pdf.addPage();
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
  }
}

// Verify the invoice arithmetic matches the stored totals (sanity guard used before saving).
export function verifyTotals(order) {
  const items = order.items || [];
  const computedSubtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const computed = computedSubtotal + (order.shipping_fee || 0) + (order.tax || 0) - (order.discount || 0);
  return Math.round(computed * 100) === Math.round((order.total || 0) * 100);
}

// Generate and download a single bilingual invoice PDF. Ensures an invoice number
// exists (assigning + persisting one on first generation) and marks the order generated.
export async function downloadInvoicePDF(order, allOrders = []) {
  const { number } = await ensureInvoiceNumber(order, allOrders);
  const productsById = await fetchProductsForOrder(order);
  const host = buildInvoiceNode(order, productsById, number);
  const canvas = await nodeToCanvas(host);
  const pdf = new jsPDF("p", "mm", "a4");
  addPagedImage(pdf, canvas, false);
  const name = (order.shipping_address?.name || order.customer_email || "customer").replace(/\s+/g, "_");
  pdf.save(`${number}_${name}.pdf`);
  // Mark generated if it wasn't already.
  if (order.invoice_status !== "sent") {
    try {
      await base44.entities.Order.update(order.id, { invoice_status: "generated", invoice_generated_at: new Date().toISOString() });
    } catch { /* best effort */ }
  }
  return number;
}

// Generate one combined multi-page PDF containing every selected order's invoice.
export async function downloadMultipleInvoices(orders, allOrders = []) {
  const pdf = new jsPDF("p", "mm", "a4");
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const { number } = await ensureInvoiceNumber(order, allOrders);
    const productsById = await fetchProductsForOrder(order);
    const host = buildInvoiceNode(order, productsById, number);
    const canvas = await nodeToCanvas(host);
    addPagedImage(pdf, canvas, i !== 0);
    if (order.invoice_status !== "sent") {
      try { await base44.entities.Order.update(order.id, { invoice_status: "generated", invoice_generated_at: new Date().toISOString() }); } catch {}
    }
  }
  pdf.save(`invoices_${orders.length}.pdf`);
}