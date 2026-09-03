import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { springPress } from "@/lib/motion";

// CRED-styled Google continue button: subtle border, soft shadow on hover,
// spring press-scale. type="button" so it never submits the email/password form.
export default function GoogleButton({ onClick }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="block w-full"
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={springPress}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        className="h-12 w-full text-sm font-medium shadow-sm transition-shadow hover:shadow-md hover:border-foreground/30"
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>
    </motion.span>
  );
}