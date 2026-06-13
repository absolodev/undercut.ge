import Image from "next/image";
import { resolveConstructorColor, resolveConstructorLogoUrl } from "@/lib/assets/constructors";

interface TeamLogoProps {
  constructorRef?: string | null;
  name?: string;
  logoUrl?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}

export function TeamLogo({
  constructorRef,
  name,
  logoUrl,
  color,
  size = 20,
  className = "",
}: TeamLogoProps) {
  const src = resolveConstructorLogoUrl(constructorRef, logoUrl);
  const teamColor = resolveConstructorColor(constructorRef, color);

  if (src) {
    return (
      <Image
        src={src}
        alt={name ? `${name} logo` : "Team logo"}
        width={size}
        height={size}
        className={`object-contain shrink-0 ${className}`}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: teamColor ?? "#666",
      }}
      aria-hidden
    />
  );
}
