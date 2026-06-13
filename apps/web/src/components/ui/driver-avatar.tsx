import Image from "next/image";
import { resolveDriverHeadshotUrl } from "@/lib/assets/drivers";

interface DriverAvatarProps {
  driverRef?: string | null;
  name: string;
  headshotUrl?: string | null;
  size?: number;
  className?: string;
}

export function DriverAvatar({
  driverRef,
  name,
  headshotUrl,
  size = 40,
  className = "",
}: DriverAvatarProps) {
  const src = resolveDriverHeadshotUrl(driverRef, headshotUrl);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover object-top bg-[#222] shrink-0 ${className}`}
        unoptimized
      />
    );
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={`rounded-full bg-[#222] border border-white/10 flex items-center justify-center font-mono text-[10px] text-white/50 shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
