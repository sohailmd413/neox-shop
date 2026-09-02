import { useEffect, useState } from "react";
import { getStoreSetting, DEFAULT_SETTING, setActiveCurrency } from "@/lib/settings";

// App-wide cache of the singleton store Setting. Loaded once on first mount
// and shared by every consumer (Navbar, footer, Checkout, invoice generation,
// currency formatter). The admin Settings page calls refreshStoreSettingCache()
// after a save so the new values (incl. currency) take effect in-session.
let cache = null;
let inflight = null;
const listeners = new Set();

function publish(s) {
  cache = s;
  setActiveCurrency(s.currency);
  listeners.forEach((l) => l(s));
}

export function loadStoreSettingOnce() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = getStoreSetting()
    .then((s) => { publish(s); return s; })
    .catch(() => { cache = { ...DEFAULT_SETTING }; setActiveCurrency(cache.currency); return cache; })
    .finally(() => { inflight = null; });
  return inflight;
}

export function refreshStoreSettingCache() {
  return getStoreSetting()
    .then((s) => { publish(s); return s; })
    .catch(() => cache);
}

export function useStoreSetting() {
  const [setting, setSetting] = useState(cache);
  useEffect(() => {
    let mounted = true;
    const apply = (s) => mounted && setSetting(s);
    listeners.add(apply);
    if (cache) setSetting(cache);
    else loadStoreSettingOnce().then(apply);
    return () => { listeners.delete(apply); mounted = false; };
  }, []);
  return setting || DEFAULT_SETTING;
}