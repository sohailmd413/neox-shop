import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Lightweight dial-code picker for the GCC-facing sign-up. Avoids a heavy
// phone-formatting dependency while still pairing a flag + country code with
// the number input.
const COUNTRIES = [
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "+967", flag: "🇾🇪", name: "Yemen" },
  { code: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
];

export default function CountryCodeSelect({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 w-[92px] shrink-0 rounded-xl border-input bg-muted/40 px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-foreground/10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="mr-1.5">{c.flag}</span>
            {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}