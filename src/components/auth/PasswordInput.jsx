import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthInput from "./AuthInput";

// Password field with an independent show/hide toggle (eye icon swap). The
// toggle is type="button" + tabIndex=-1 so it never steals focus from the
// input or submits the form.
export default function PasswordInput({
  id,
  autoComplete = "new-password",
  placeholder = "••••••••",
  value,
  onChange,
  autoFocus,
}) {
  const [show, setShow] = useState(false);
  return (
    <AuthInput
      id={id}
      type={show ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      leftIcon={Lock}
      rightSlot={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={show ? "hide" : "show"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.12 }}
              className="block"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
      }
    />
  );
}