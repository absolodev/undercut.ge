import { TIRE_COLORS } from "@pitwall/constants";
import type { TireCompound } from "@pitwall/types";

interface TireCompoundIconProps {
  compound: TireCompound;
  size?: number;
}

export function TireCompoundIcon({ compound, size = 16 }: TireCompoundIconProps) {
  const color = TIRE_COLORS[compound] || "#888";
  const label = compound.charAt(0); // S, M, H, I, W

  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      {/* Outer ring — compound color */}
      <circle cx="8" cy="8" r="7" fill="none" stroke={color} strokeWidth="2.5" />
      {/* Inner fill */}
      <circle cx="8" cy="8" r="4.5" fill="#333" />
      {/* Letter */}
      <text x="8" y="11" textAnchor="middle" fill={color} fontSize="7" fontWeight="bold" fontFamily="monospace">
        {label}
      </text>
    </svg>
  );
}
