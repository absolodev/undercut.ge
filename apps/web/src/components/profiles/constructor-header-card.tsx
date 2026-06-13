import { Link } from "@/i18n/navigation";
import { TeamLogo } from "@/components/ui/team-logo";
import { resolveConstructorColor } from "@/lib/assets/constructors";

type ConstructorHeaderCardProps = {
  constructor: {
    constructor_ref: string;
    name: string;
    full_name?: string | null;
    nationality?: string | null;
    color_primary?: string | null;
    logo_url?: string | null;
    is_active: boolean;
  };
  backLabel: string;
  activeLabel: string;
  historicalLabel: string;
};

export function ConstructorHeaderCard({
  constructor,
  backLabel,
  activeLabel,
  historicalLabel,
}: ConstructorHeaderCardProps) {
  const color = resolveConstructorColor(constructor.constructor_ref, constructor.color_primary);

  return (
    <div>
      <Link
        href="/f1/constructors"
        className="text-[#E10600] text-sm hover:underline font-mono mb-4 inline-block"
      >
        {backLabel}
      </Link>
      <div
        className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-white/10 pb-6 gap-6"
        style={{ borderBottomColor: color ?? undefined }}
      >
        <div className="flex items-end gap-5">
          <TeamLogo
            constructorRef={constructor.constructor_ref}
            name={constructor.name}
            logoUrl={constructor.logo_url}
            color={color}
            size={72}
            className="rounded-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl md:text-5xl font-bold">{constructor.name}</h1>
              <span
                className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded uppercase"
                style={color ? { borderLeft: `3px solid ${color}` } : undefined}
              >
                {constructor.is_active ? activeLabel : historicalLabel}
              </span>
            </div>
            <div className="text-white/50 mt-2">
              {constructor.full_name && constructor.full_name !== constructor.name
                ? `${constructor.full_name} • `
                : ""}
              {constructor.nationality}
            </div>
          </div>
        </div>
        {color && (
          <div
            className="hidden sm:block w-24 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
