import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { captureReferralCode } from "@/lib/referral";

// /r/:code — captures the referral code into localStorage (retained through
// registration) and redirects to the home page. The Register page reads the
// stored code after signup and calls registerReferral to link the referrer.
export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (code) captureReferralCode(code);
    navigate("/", { replace: true });
  }, [code, navigate]);
  return null;
}