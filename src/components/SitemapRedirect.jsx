import { useEffect } from "react";

// /sitemap.xml → hard redirect to the dynamic backend function that generates
// the XML (the SPA shell would otherwise serve HTML for that path). Googlebot
// follows the redirect and receives application/xml.
export default function SitemapRedirect() {
  useEffect(() => {
    window.location.replace("/functions/getSitemap");
  }, []);
  return null;
}