// Central store identity used on invoices, receipts, and barcode labels.
// Edit these values to match the real business. All fields are bilingual (EN + AR)
// so the bilingual invoice can render both languages without a separate Store Settings entity.
export const STORE_INFO = {
  name_en: "NeoX Shop",
  name_ar: "NeoX شوب",
  address_en: "123 Commerce Street, Riyadh, Saudi Arabia",
  address_ar: "١٢٣ شارع التجارة، الرياض، المملكة العربية السعودية",
  phone: "+966 11 000 0000",
  email: "billing@neoxshop.com",
  tax_id_en: "VAT: 300000000000003",
  tax_id_ar: "الرقم الضريبي: ٣٠٠٠٠٠٠٠٠٠٠٠٠٠٠٠٣",
  currency: "SAR",
};

export const INVOICE_LABELS = {
  invoice: { en: "Invoice", ar: "فاتورة" },
  invoice_no: { en: "Invoice No.", ar: "رقم الفاتورة" },
  date: { en: "Date", ar: "التاريخ" },
  bill_to: { en: "Bill to", ar: "إلى" },
  ship_to: { en: "Ship to", ar: "شحن إلى" },
  item: { en: "Item", ar: "الصنف" },
  qty: { en: "Qty", ar: "الكمية" },
  unit_price: { en: "Unit Price", ar: "سعر الوحدة" },
  line_total: { en: "Total", ar: "الإجمالي" },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  shipping: { en: "Shipping", ar: "الشحن" },
  tax: { en: "Tax", ar: "الضريبة" },
  discount: { en: "Discount", ar: "الخصم" },
  grand_total: { en: "Grand Total", ar: "الإجمالي الكلي" },
  payment_method: { en: "Payment Method", ar: "طريقة الدفع" },
  payment_status: { en: "Payment Status", ar: "حالة الدفع" },
  sku: { en: "SKU", ar: "الرقم التسلسلي" },
};