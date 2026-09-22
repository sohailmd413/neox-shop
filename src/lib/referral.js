// Client-side referral helpers: localStorage capture of the /r/:code link,
// link building, and the localized share message. All reward math is
// server-side; these are purely presentational + capture.

export const REFERRAL_STORAGE_KEY = "mf_referral_code";

export function captureReferralCode(code) {
  if (!code) return;
  try { localStorage.setItem(REFERRAL_STORAGE_KEY, String(code).toUpperCase()); } catch { /* ignore */ }
}
export function getStoredReferralCode() {
  try { return localStorage.getItem(REFERRAL_STORAGE_KEY) || ""; } catch { return ""; }
}
export function clearStoredReferralCode() {
  try { localStorage.removeItem(REFERRAL_STORAGE_KEY); } catch { /* ignore */ }
}

export function buildReferralLink(code) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://neox-shop.base44.app";
  return `${origin}/r/${code}`;
}

export function buildShareMessage(code, lang, rewardText) {
  const link = buildReferralLink(code);
  if (lang === "ar") {
    return `استخدمت NeoX Shop وأعجبني! استخدم رابطي للحصول على ${rewardText} على طلبك الأول: ${link}`;
  }
  return `I've been shopping on NeoX Shop — use my link to get ${rewardText} on your first order: ${link}`;
}