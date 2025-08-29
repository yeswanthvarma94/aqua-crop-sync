import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Languages, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const LANG_OPTIONS = [
  { value: "en", label: "English", symbol: "A", color: "bg-orange-500" },
  { value: "te", label: "తెలుగు", symbol: "తె", color: "bg-blue-500" },
  { value: "hi", label: "हिंदी", symbol: "अ", color: "bg-blue-500" },
  { value: "gu", label: "ગુજરાતી", symbol: "ગુ", color: "bg-blue-500" },
  { value: "bn", label: "বাংলা", symbol: "বা", color: "bg-blue-500" },
] as const;

export default function LanguageSelector() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("lang") || "en";
  });

  const handleChange = async (value: string) => {
    setLang(value);
    try {
      localStorage.setItem("lang", value);
      await i18n.changeLanguage(value);
    } catch {}
    const selected = LANG_OPTIONS.find((o) => o.value === value)?.label || value;
    toast({ title: "Language updated", description: `${selected} selected` });
    setOpen(false);
  };

  const currentLang = LANG_OPTIONS.find((o) => o.value === lang);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Languages className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader className="flex flex-row items-center gap-2 space-y-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-base font-medium">
            {t('app.selectLanguage')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {LANG_OPTIONS.map(({ value, label, symbol, color }) => (
            <Button
              key={value}
              variant="ghost"
              className={`flex flex-col items-center gap-2 h-auto py-4 ${
                lang === value ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleChange(value)}
            >
              <div className={`w-12 h-12 rounded-full ${color} ${
                value === 'en' ? 'border-2 border-orange-400' : ''
              } flex items-center justify-center text-white font-bold text-lg`}>
                {symbol}
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
