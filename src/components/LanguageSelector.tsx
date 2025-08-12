import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "hi", label: "हिंदी (Hindi)" },
  { value: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
] as const;

export default function LanguageSelector() {
  const [lang, setLang] = React.useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("lang") || "en";
  });

  const handleChange = (value: string) => {
    setLang(value);
    try {
      localStorage.setItem("lang", value);
    } catch {}
    const selected = LANG_OPTIONS.find((o) => o.value === value)?.label || value;
    toast({ title: "Language updated", description: `${selected} selected` });
  };

  return (
    <Select value={lang} onValueChange={handleChange}>
      <SelectTrigger className="w-32 sm:w-40" aria-label="Language selector">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="z-50">
        {LANG_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
