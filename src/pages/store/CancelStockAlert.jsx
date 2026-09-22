import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Public landing page reached via the "cancel" link in the back-in-stock
// confirmation email. Cancels the alert by id+email match (the link carries
// both as an opaque token) and confirms to the visitor.
export default function CancelStockAlert() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const email = params.get("email");
    if (!id || !email) { setStatus("invalid"); return; }
    base44.functions.invoke("cancelStockAlert", { id, email })
      .then((res) => setStatus(res?.data?.cancelled ? "done" : "invalid"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      {status === "done" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-7 w-7" /></div>
          <div>
            <h1 className="text-xl font-semibold">Unsubscribed</h1>
            <p className="mt-1 text-sm text-muted-foreground">You won't receive a back-in-stock alert for this product.</p>
          </div>
        </>
      )}
      {status === "invalid" && <p className="text-sm text-muted-foreground">This cancel link is invalid or has already been used.</p>}
      {status === "error" && <p className="text-sm text-muted-foreground">Something went wrong. Please try again later.</p>}
      <Link to="/shop" className="mt-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Back to shop</Link>
    </div>
  );
}