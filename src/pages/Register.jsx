import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { UserPlus, Mail, Check } from "lucide-react";
import { motion } from "framer-motion";
import AuthLayout from "@/components/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrength from "@/components/auth/PasswordStrength";
import CountryCodeSelect from "@/components/auth/CountryCodeSelect";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthDivider from "@/components/auth/AuthDivider";
import AuthButton from "@/components/auth/AuthButton";
import Shake from "@/components/auth/Shake";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import { springPop } from "@/lib/motion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [dialCode, setDialCode] = useState("+966");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const emailValid = EMAIL_RE.test(email.trim());
  const matched = confirmPassword.length > 0 && password === confirmPassword;
  const fullPhone = () => (phone.trim() ? `${dialCode} ${phone.trim()}` : "");

  const fail = (msg) => {
    setError(msg);
    setShakeKey((n) => n + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailValid) return fail("Please enter a valid email address.");
    if (password.length < 8) return fail("Password must be at least 8 characters.");
    if (password !== confirmPassword) return fail("Passwords do not match.");
    if (!agree) return fail("Please accept the Terms of Service and Privacy Policy.");

    setLoading(true);
    if (fullPhone()) {
      try {
        const res = await base44.functions.invoke("updateCustomerProfile", {
          check_only: true,
          phone: fullPhone(),
        });
        if (res?.data?.available === false) {
          setLoading(false);
          return fail(res.data.message || "This phone number is already registered.");
        }
      } catch {}
    }
    try {
      await base44.auth.register({ email: email.trim(), password });
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
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      try {
        if (name.trim() || fullPhone() || marketing) {
          await base44.functions.invoke("updateCustomerProfile", {
            display_name: name.trim(),
            phone: fullPhone(),
            marketing_opt_in: marketing,
          });
        }
      } catch {}
      setSuccess(true);
      setTimeout(() => {
        window.location.href = safeReturnTo();
      }, 1000);
    } catch (err) {
      fail(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email.trim());
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => base44.auth.loginWithProvider("google", safeReturnTo());

  if (success) {
    return (
      <AuthLayout icon={Check} title="Welcome aboard!" subtitle="Your account is ready">
        <div className="flex flex-col items-center py-6">
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={springPop}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <Check className="h-10 w-10" strokeWidth={3} />
          </motion.div>
          <p className="mt-5 text-sm text-muted-foreground">Redirecting you now…</p>
        </div>
      </AuthLayout>
    );
  }

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email.trim()}`}>
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        <div className="mb-6 flex justify-center">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <AuthButton type="button" loading={loading} onClick={handleVerify} disabled={otpCode.length < 6}>
          Verify
        </AuthButton>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="font-medium text-primary hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} />
      <AuthDivider />

      <Shake shakeKey={shakeKey}>
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <AuthInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              rightSlot={emailValid ? <Check className="w-4 h-4 text-emerald-500" /> : null}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">
              Full name <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <AuthInput
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <CountryCodeSelect value={dialCode} onChange={setDialCode} />
              <AuthInput
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="flex-1"
                placeholder="5x xxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm Password</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword.length > 0 && (
              <p
                className={
                  matched ? "text-xs text-emerald-500" : "text-xs text-destructive"
                }
              >
                {matched ? "Passwords match" : "Passwords don't match"}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agree}
                onCheckedChange={(v) => setAgree(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="cursor-pointer text-sm font-normal leading-snug">
                I agree to the{" "}
                <Link to="/policies/terms" target="_blank" rel="noopener" className="font-medium text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/policies/privacy" target="_blank" rel="noopener" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="marketing"
                checked={marketing}
                onCheckedChange={(v) => setMarketing(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="marketing" className="cursor-pointer text-sm font-normal leading-snug">
                Send me updates about offers and new arrivals
              </Label>
            </div>
          </div>

          <AuthButton loading={loading} disabled={!agree} className="mt-2">
            Create account
          </AuthButton>
        </form>
      </Shake>
    </AuthLayout>
  );
}