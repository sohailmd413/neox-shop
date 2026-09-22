// Frontend Web Push helpers: subscribe/unsubscribe browsers, and a subtle,
// well-timed "soft prompt" that only fires after a meaningful customer action
// (wishlist add, order complete) — never on page load.
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { VAPID_PUBLIC_KEY, PUSH_SW_PATH } from "@/lib/pushConfig";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// Request permission + subscribe the browser, then persist the subscription
// server-side via savePushSubscription. Gracefully no-ops when unsupported or
// denied — callers never need to try/catch for the "no permission" case.
export async function subscribePush() {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
    const reg = await navigator.serviceWorker.register(PUSH_SW_PATH);
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const keys = (sub.toJSON && sub.toJSON().keys) || {};
    await base44.functions.invoke("savePushSubscription", {
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      language: document.documentElement.lang || "en",
      userAgent: navigator.userAgent,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "error", error: e && e.message };
  }
}

// Unsubscribe the current browser and remove the server-side subscription.
export async function unsubscribePush() {
  let endpoint = null;
  try {
    const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_PATH);
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe();
      }
    }
  } catch (e) {
    // ignore — still ask the server to drop the record
  }
  try {
    await base44.functions.invoke("savePushSubscription", { unsubscribe: true, endpoint });
  } catch (e) {}
  return { ok: true };
}

// Subtle, well-timed prompt — only after a meaningful action, never on load.
// Throttled: at most once per hour overall, and per-trigger 7-day dismiss
// cooldown. Only shown while permission is still "default" (not yet asked).
export async function maybePromptPush(trigger) {
  try {
    if (!pushSupported()) return;
    const perm = Notification.permission;
    if (perm !== "default") return; // granted or denied -> don't nag

    const now = Date.now();
    const lastShown = Number(localStorage.getItem("push_prompt_last_shown") || 0);
    if (now - lastShown < 60 * 60 * 1000) return; // at most once per hour overall
    const dismissed = JSON.parse(localStorage.getItem("push_prompt_dismissed") || "{}");
    if (dismissed[trigger] && now - dismissed[trigger] < 7 * 24 * 3600 * 1000) return;

    localStorage.setItem("push_prompt_last_shown", String(now));

    const label =
      trigger === "order_complete"
        ? "Track your order status live — we'll ping you at each step."
        : "Get notified when your wishlist items drop in price or come back in stock.";

    toast(label, {
      duration: 9000,
      action: {
        label: "Enable",
        onClick: () => {
          subscribePush().then((r) => {
            if (r.ok) toast.success("Push notifications enabled.");
            else if (r.reason === "denied") toast.error("Permission denied — you can enable it later from your browser settings.");
          });
        },
      },
      cancel: {
        label: "Not now",
        onClick: () => {
          const d = JSON.parse(localStorage.getItem("push_prompt_dismissed") || "{}");
          d[trigger] = Date.now();
          localStorage.setItem("push_prompt_dismissed", JSON.stringify(d));
        },
      },
    });
  } catch (e) {
    // soft prompt is best-effort; never block the customer action
  }
}