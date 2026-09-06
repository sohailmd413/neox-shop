import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getStoreSetting } from "@/lib/settings";
import { useLanguage } from "@/lib/i18n";
import BackBar from "@/components/storefront/BackBar";

// Policy pages use the language the storefront is in: the page title and the
// rich-text body both pull the `_ar` variant when Arabic is selected, falling
// back to the English content when a given policy wasn't translated yet.
export default function PolicyPage() {
  const { type } = useParams();
  const { lang, t } = useLanguage();
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoreSetting()
      .then((s) => setSetting(s || {}))
      .catch(() => setSetting({}))
      .finally(() => setLoading(false));
  }, [type]);

  const titleKey = `policy.${type && type !== "default" ? type : "default"}`;
  const title = t(titleKey);
  const enField = `${type}_policy`;
  const arField = `${type}_policy_ar`;
  const content = lang === "ar"
    ? (setting?.[arField] || setting?.[enField] || "")
    : (setting?.[enField] || "");

  return (
    <div className="pt-16" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <BackBar fallbackTo="/" fallbackLabel={t("back.home")} />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        {loading ? (
          <div className="mt-10 h-4 w-24 animate-pulse rounded bg-muted" />
        ) : content ? (
          <div
            className="prose-policy mt-8 max-w-none text-sm leading-relaxed text-foreground [&_a]:underline [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">{t("policy.notPublished")}</p>
        )}
      </div>
    </div>
  );
}