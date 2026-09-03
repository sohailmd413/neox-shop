import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { springPress } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Primary auth submit: full-width, spring press-scale, and a built-in loading
// spinner so the button never feels unresponsive during the request.
// Defaults to type="submit"; pass type="button" for non-form actions (OTP verify).
export default function AuthButton({
  loading,
  loadingLabel,
  children,
  disabled,
  className,
  type = "submit",
  ...props
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="block w-full"
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={springPress}
    >
      <Button
        type={type}
        className={cn("h-12 w-full font-medium", className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {loadingLabel || children}
          </>
        ) : (
          children
        )}
      </Button>
    </motion.span>
  );
}