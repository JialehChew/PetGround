import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const locales = [
  { code: "zh" as const, flag: "🇨🇳", labelKey: "language.zh" },
  { code: "en" as const, flag: "🇺🇸", labelKey: "language.en" },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation("common");
  const resolved =
    i18n.language?.startsWith("zh") ? "zh" : i18n.language?.startsWith("en") ? "en" : "zh";
  const badge = resolved === "zh" ? "ZH" : "EN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-[#3F2A1E]/25 bg-white/65 text-[#3F2A1E] shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] hover:bg-white/95 hover:shadow-md hover:shadow-[#D9A008]/22"
          aria-label={t("language.label")}
        >
          <Languages className="h-4 w-4 shrink-0 opacity-90" />
          <span className="text-xs font-semibold tracking-wide">{badge}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {locales.map(({ code, flag, labelKey }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => {
              void i18n.changeLanguage(code);
            }}
            className={resolved === code ? "bg-accent" : undefined}
          >
            <span className="text-base leading-none" aria-hidden>
              {flag}
            </span>
            <span>{t(labelKey)}</span>
            {resolved === code ? (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
