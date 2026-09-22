import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Store, Mail, Check, ArrowLeft, Loader2 } from "lucide-react";
import { safeReturnTo } from "@/lib/authReturnTo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public vendor registration. Collects business info + login credentials,
// runs the platform's register → OTP → verifyOtp flow, then calls the
// registerVendor backend function to create the pending_verification Vendor
// record and promote the account role to "vendor".
export default function VendorRegister() {
  const [form, setForm] = useState({
    name: "", name_ar: "", contact_name: "", email: "", phone: "", address: "",
    commercial_registration_number: "", vat_number: "",
    store_description_en: "", store_description_ar: "",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const emailValid = EMAIL_RE.test(form.email.trim());
  const matched = confirm.length > 0 && password === confirm;

  const fail = (msg) => setError(msg);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return fail("Business name is required.");
    if (!emailValid) return fail("Please enter a valid email address.");
    if (password.length < 8) return fail("Password must be at least 8 characters.");
    if (password !== confirm) return fail("Passwords do not match.");
    if (!agree) return fail("Please accept the Terms of Service and Privacy Policy.");
    setLoading(true);
    try {
      await base44.auth.register({ email: form.email.trim(), password });
      setShowOtp(true);
    } catch (err) {
      fail(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: form.email.trim(), otpCode: otp });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      // Create the vendor record + promote role. If this fails, the user still
      // has a verified account (role=user) — surface the error so they can
      // retry from the vendor login without re-registering.
      await base44.functions.invoke("registerVendor", {
        ...form,
        email: form.email.trim(),
        logo_url: logoUrl,
        banner_url: bannerUrl,
      });
      setDone(true);
      setTimeout(() => { window.location.href = "/vendor/dashboard"; }, 1200);
    } catch (err) {
      fail(err?.data?.error || err.message || "Could not complete registration. Your email is verified — try signing in.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(form.email.trim());
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Application submitted!</h1>
          <p className="mt-1 text-sm text-muted-foreground">We're reviewing your vendor application. Redirecting to your portal…</p>
        </div>
      </div>
    );
  }

  if (showOtp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background"><Mail className="h-6 w-6" /></div>
            <h1 className="mt-4 text-xl font-semibold">Verify your email</h1>
            <p className="mt-1 text-sm text-muted-foreground">We sent a code to {form.email.trim()}</p>
          </div>
          {error && <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="mt-6 mb-4 flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="button" className="h-11 w-full" disabled={loading || otp.length < 6} onClick={handleVerify}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</> : "Verify & submit application"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button onClick={handleResend} className="font-medium text-primary hover:underline">Resend</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background"><Store className="h-6 w-6" /></div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Become a vendor</h1>
            <p className="mt-1 text-sm text-muted-foreground">Apply to sell your products on our marketplace.</p>
          </div>

          {error && <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name *" value={form.name} onChange={set("name")} placeholder="Your store name" autoFocus />
              <Field label="Business name (Arabic)" value={form.name_ar} onChange={set("name_ar")} placeholder="اسم المتجر" dir="rtl" />
              <Field label="Contact person" value={form.contact_name} onChange={set("contact_name")} placeholder="Full name" />
              <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+966 5x xxx xxxx" />
              <Field label="Email (for login) *" type="email" value={form.email} onChange={set("email")} placeholder="you@business.com" />
              <Field label="Address" value={form.address} onChange={set("address")} placeholder="City, country" />
              <Field label="Commercial registration no." value={form.commercial_registration_number} onChange={set("commercial_registration_number")} />
              <Field label="VAT number" value={form.vat_number} onChange={set("vat_number")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
              <Field label="Banner URL" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Store description (English)</Label>
                <Textarea rows={3} value={form.store_description_en} onChange={set("store_description_en")} />
              </div>
              <div className="space-y-2">
                <Label>Store description (Arabic)</Label>
                <Textarea rows={3} value={form.store_description_ar} onChange={set("store_description_ar")} dir="rtl" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pw">Password *</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpw">Confirm password *</Label>
                <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
                {confirm.length > 0 && <p className={matched ? "text-xs text-emerald-500" : "text-xs text-destructive"}>{matched ? "Passwords match" : "Passwords don't match"}</p>}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <Label htmlFor="terms" className="cursor-pointer text-sm font-normal leading-snug">
                I agree to the{" "}
                <Link to="/policies/terms" target="_blank" rel="noopener" className="font-medium text-primary hover:underline">Terms of Service</Link> and{" "}
                <Link to="/policies/privacy" target="_blank" rel="noopener" className="font-medium text-primary hover:underline">Privacy Policy</Link>
              </Label>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</> : "Create vendor account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have a vendor account?{" "}
            <Link to="/vendor/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
          <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, autoFocus, dir }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} dir={dir} />
    </div>
  );
}