import type { SVGProps } from "react";
import HeroBannerSvg from "@/assets/hero-banner.svg?react";

type HeroBannerProps = SVGProps<SVGSVGElement> & {
  title?: string;
  /** Crop to left portion (cartoon dog) when used in split hero layout */
  cropLeft?: boolean;
};

export default function HeroBanner({
  title,
  className,
  cropLeft,
  viewBox,
  preserveAspectRatio,
  ...props
}: HeroBannerProps) {
  const vb = viewBox ?? (cropLeft ? "0 0 1180 666.67" : undefined);
  const par =
    preserveAspectRatio ?? (cropLeft ? "xMinYMid meet" : "xMidYMid meet");

  return (
    <div className={cropLeft ? "w-full" : "w-full bg-[#FFFDF7]"}>
      <HeroBannerSvg
        role="img"
        aria-label={title ?? "PetGround"}
        viewBox={vb}
        preserveAspectRatio={par}
        className={["block w-full max-w-full h-auto", className].filter(Boolean).join(" ")}
        {...props}
      />
    </div>
  );
}
