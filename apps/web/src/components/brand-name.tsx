import { PUBLIC_BRAND } from "@/lib/public-branding";

type BrandNameProps = {
  className?: string;
};

export function BrandName({ className }: BrandNameProps) {
  const name = PUBLIC_BRAND.name;

  // Keeps the brand suffix ("ii") colored like the logo icon on both themes.
  if (name.endsWith("ii")) {
    return (
      <span className={className}>
        <span className="text-foreground">{name.slice(0, -2)}</span>
        <span className="text-[#0e7a6f]">ii</span>
      </span>
    );
  }

  return <span className={className}>{name}</span>;
}
