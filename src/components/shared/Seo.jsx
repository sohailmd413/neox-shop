import { useEffect } from "react";

// Client-side SEO head manager for the SPA. Sets <title>, meta description,
// Open Graph + Twitter tags, a canonical link, and JSON-LD <script> blocks.
// All injected elements are tagged data-seo and removed on cleanup so each
// page owns a fresh set. Crawlers that render JS (Google) read the result.
const DEFAULT_TITLE = "NeoX Shop — Modern Tech Marketplace";

function upsertMeta(selector, attr, key, content) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "true");
    document.head.appendChild(el);
  } else {
    el.setAttribute("data-seo", "true");
  }
  if (content != null && content !== "") el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute("data-seo", "true");
    document.head.appendChild(el);
  } else {
    el.setAttribute("data-seo", "true");
  }
  if (href) el.setAttribute("href", href);
}

export default function Seo({ title, description, url, image, type = "website", canonical, jsonld = [] }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) upsertMeta('meta[name="description"]', "name", "description", description);
    const ogUrl = url || window.location.href;
    const ogImage = image || "";
    upsertMeta('meta[property="og:title"]', "property", "og:title", title || "");
    upsertMeta('meta[property="og:description"]', "property", "og:description", description || "");
    upsertMeta('meta[property="og:url"]', "property", "og:url", ogUrl);
    upsertMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "NeoX Shop");
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title || "");
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description || "");
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
    upsertLink("canonical", canonical || ogUrl);

    const arr = Array.isArray(jsonld) ? jsonld : [jsonld];
    arr.filter(Boolean).forEach((obj) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo", "true");
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
    });

    return () => {
      document.querySelectorAll("[data-seo]").forEach((el) => el.remove());
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, url, image, type, canonical, JSON.stringify(jsonld)]);

  return null;
}