import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getStoreSetting } from "@/lib/settings";

const TITLES = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  return: "Return Policy",
  shipping: "Shipping Policy",
};

export default function PolicyPage() {
  const { type } = useParams();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoreSetting()
      .then((s) => setContent(s[`${type}_policy`] || ""))
      .catch(() => setContent(""))
      .finally(() => setLoading(false));
  }, [type]);

  const title = TITLES[type] || "Policy";

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        {loading ? (
          <div className="mt-10 h-4 w-24 animate-pulse rounded bg-muted" />
        ) : content ? (
          <div
            className="prose-policy mt-8 max-w-none text-sm leading-relaxed text-foreground [&_a]:underline [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_ul]:list-disc [&_ol]:list-decimal"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">This policy has not been published yet. Please check back later.</p>
        )}
      </div>
    </div>
  );
}