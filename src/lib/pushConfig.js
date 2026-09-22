// Web Push configuration. The VAPID public key is NOT secret — it is sent to the
// browser to subscribe via PushManager. The matching private key lives server-side
// as the VAPID_PRIVATE_KEY secret (used by base44/shared/webPush.ts).
export const VAPID_PUBLIC_KEY =
  "BNynAO_b7uJzFes9frd_W9lUtJPocFuR-78Wy1dPmMSyAbGXaaSgwe7OCXTqSAO72Da1T63UF_wpQz3izaQx4zw";

// Service worker script served from /public at the site root, so it controls
// the whole origin (push subscriptions require a root-scoped service worker).
export const PUSH_SW_PATH = "/push-sw.js";