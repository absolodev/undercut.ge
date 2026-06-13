import constructorsData from "@pitwall/data/current/constructors.json";

export type ConstructorAsset = {
  constructor_ref: string;
  name: string;
  color_primary: string;
  logo_url: string;
};

/** Map Ergast/Jolpica refs to bundled CDN logo keys. */
const REF_ALIASES: Record<string, string> = {
  toro_rosso: "alphatauri",
  alphatauri: "alphatauri",
  racing_point: "aston_martin",
  force_india: "aston_martin",
  alfa: "sauber",
  kick_sauber: "sauber",
  rb_f1_team: "rb",
};

const byRef = new Map(
  (constructorsData as ConstructorAsset[]).map((c) => [c.constructor_ref.toLowerCase(), c])
);

export function resolveConstructorRef(constructorRef: string | null | undefined): string | null {
  if (!constructorRef) return null;
  const lower = constructorRef.toLowerCase();
  return REF_ALIASES[lower] ?? lower;
}

export function getConstructorAsset(constructorRef: string | null | undefined): ConstructorAsset | null {
  const resolved = resolveConstructorRef(constructorRef);
  if (!resolved) return null;
  return byRef.get(resolved) ?? null;
}

export function resolveConstructorLogoUrl(
  constructorRef: string | null | undefined,
  dbLogoUrl?: string | null
): string | null {
  if (dbLogoUrl) return dbLogoUrl;
  return getConstructorAsset(constructorRef)?.logo_url ?? null;
}

export function resolveConstructorColor(
  constructorRef: string | null | undefined,
  dbColor?: string | null
): string | null {
  if (dbColor && dbColor !== "#FFFFFF") return dbColor;
  return getConstructorAsset(constructorRef)?.color_primary ?? dbColor ?? null;
}

export function enrichConstructor<
  T extends {
    constructor_ref: string;
    color_primary?: string | null;
    logo_url?: string | null;
  },
>(constructor: T): T & { logo_url: string | null; color_primary: string | null } {
  const asset = getConstructorAsset(constructor.constructor_ref);
  return {
    ...constructor,
    logo_url: constructor.logo_url ?? asset?.logo_url ?? null,
    color_primary: resolveConstructorColor(constructor.constructor_ref, constructor.color_primary),
  };
}
