"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { marketingLandingNav } from "@/lib/site";
import { scrollToLandingSection } from "@/components/marketing/scroll-to-landing-section";

type MarketingNavLinksProps = {
  linkClassName: string;
};

export function MarketingNavLinks({ linkClassName }: MarketingNavLinksProps) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <>
      {marketingLandingNav.map((item) =>
        onHome ? (
          <a
            key={item.sectionId}
            href={`#${item.sectionId}`}
            className={linkClassName}
            onClick={(e) => {
              e.preventDefault();
              scrollToLandingSection(item.sectionId);
            }}
          >
            {item.label}
          </a>
        ) : (
          <Link key={item.sectionId} href={`/#${item.sectionId}`} className={linkClassName}>
            {item.label}
          </Link>
        ),
      )}
    </>
  );
}
