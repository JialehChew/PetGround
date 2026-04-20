import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import type { Promotion } from "../../types";
import { getPublicPromotions } from "../../services/promotionService";

export default function PromotionsSection() {
  const { t } = useTranslation("home");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const isSinglePromotion = promotions.length === 1;

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        setLoading(true);
        const rows = await getPublicPromotions();
        setPromotions(rows);
      } catch (error) {
        console.error("Failed to load promotions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPromotions();
  }, []);

  if (!loading && promotions.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF4BF]/45 via-[#FFFDF7] to-[#FFF7D1]/40 py-14">
      <div
        className="pointer-events-none absolute -left-10 top-10 h-44 w-44 rounded-full bg-[#FFCC00]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-4 h-52 w-52 rounded-full bg-[#FFDE42]/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#F9C74F]/45 bg-[#FFF3BF] px-4 py-1.5 text-sm font-semibold text-[#4A2F1F] shadow-sm">
            <SparklesIcon className="h-5 w-5 text-[#C9A000]" />
            <span>{t("promotions.badge")}</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#3F2A1E] sm:text-4xl">
            {t("promotions.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#5C4A3A] sm:text-lg">
            {t("promotions.subtitle")}
          </p>
        </div>

        <div className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-3">
          {loading &&
            Array.from({ length: 2 }).map((_, idx) => (
              <article
                key={`promotion-skeleton-${idx}`}
                className="min-w-[290px] max-w-[620px] flex-none snap-start overflow-hidden rounded-3xl border-2 border-[#F9C74F]/30 bg-white/80 shadow-lg md:min-w-[360px]"
              >
                <div className="aspect-video w-full animate-pulse bg-[#FFEFC0]" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-[#FFEFC0]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[#FFF5D6]" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-[#FFF5D6]" />
                  <div className="h-10 w-full animate-pulse rounded-2xl bg-[#FFEFC0]" />
                </div>
              </article>
            ))}
          {promotions.map((promo) => (
            <article
              key={promo._id}
              className={`overflow-hidden rounded-3xl border-2 border-[#F9C74F]/40 bg-white/95 shadow-lg shadow-[#F9C74F]/20 ${
                isSinglePromotion
                  ? "mx-auto w-full max-w-[620px] flex-none snap-center"
                  : "min-w-[290px] max-w-[620px] flex-none snap-start md:min-w-[360px]"
              }`}
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2E1E14]/60 via-transparent to-transparent px-4 pb-4 pt-10">
                  <span className="inline-flex rounded-full border border-[#FFE8A3] bg-[#FFF8DB]/95 px-3 py-1 text-xs font-semibold text-[#6B4A2A]">
                    {t("promotions.validLabel")}{" "}
                    {new Date(promo.validUntil).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <h3 className="text-xl font-bold text-[#3F2A1E]">{promo.title}</h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-[#5C4A3A]">{promo.description}</p>
                <Button
                  asChild
                  className="w-full rounded-2xl border-2 border-[#F9C74F]/60 bg-[#FFCC00] font-bold text-[#3F2A1E] shadow-md hover:bg-[#FFE566]"
                >
                  <Link to="/appointments">{t("promotions.cta")}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
