import { Link } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamLogo } from "@/components/ui/team-logo";
import { enrichConstructor } from "@/lib/assets/constructors";
import type { ConstructorQuickStat } from "@/lib/data/constructors-profile";

type Constructor = {
  id: number;
  constructor_ref: string;
  name: string;
  nationality: string | null;
  color_primary: string | null;
  is_active: boolean;
  logo_url?: string | null;
};

function ConstructorGrid({
  constructors,
  statsById,
  emptyMessage,
  labels,
}: {
  constructors: Constructor[];
  statsById: Map<number, ConstructorQuickStat>;
  emptyMessage?: string;
  labels: {
    active: string;
    historical: string;
    wins: string;
    bestFinish: string;
  };
}) {
  if (constructors.length === 0) {
    return (
      <p className="text-sm text-white/40 font-mono py-8 text-center">
        {emptyMessage ?? "No constructors found for this season."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {constructors.map((raw) => {
        const c = enrichConstructor(raw);
        const quick = statsById.get(c.id);
        return (
          <Link
            key={c.id}
            href={`/f1/constructors/${c.constructor_ref}`}
            className="bg-[#111] border border-white/10 rounded-lg p-4 hover:bg-[#222] hover:border-[#E10600]/50 transition-all group flex flex-col"
            style={{
              borderLeftColor: c.color_primary ?? undefined,
              borderLeftWidth: "4px",
            }}
          >
            <div className="flex gap-3 mb-2">
              <TeamLogo
                constructorRef={c.constructor_ref}
                name={c.name}
                logoUrl={c.logo_url}
                color={c.color_primary}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-lg text-white group-hover:text-[#E10600] transition-colors leading-tight truncate">
                  {c.name}
                </div>
                <div className="text-xs text-white/50 mt-1 truncate">{c.nationality}</div>
              </div>
            </div>
            <div className="mt-auto pt-3 flex justify-between items-end gap-2">
              <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded uppercase">
                {c.is_active ? labels.active : labels.historical}
              </span>
              {quick && (quick.wins > 0 || quick.best_finish != null) && (
                <div className="text-right text-[10px] font-mono text-white/40 leading-tight">
                  {quick.wins > 0 && (
                    <div>
                      {quick.wins} {labels.wins}
                    </div>
                  )}
                  {quick.best_finish != null && (
                    <div>
                      {labels.bestFinish} P{quick.best_finish}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ConstructorsTabs({
  currentGrid,
  archive,
  statsById,
  labels,
}: {
  currentGrid: Constructor[];
  archive: Constructor[];
  statsById: Map<number, ConstructorQuickStat>;
  labels: {
    currentTab: string;
    archiveTab: string;
    active: string;
    historical: string;
    wins: string;
    bestFinish: string;
  };
}) {
  return (
    <Tabs defaultValue="current">
      <TabsList className="bg-[#111] border border-white/10 mb-8">
        <TabsTrigger value="current" className="font-mono text-xs">
          {labels.currentTab} ({currentGrid.length})
        </TabsTrigger>
        <TabsTrigger value="archive" className="font-mono text-xs">
          {labels.archiveTab} ({archive.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="current">
        <ConstructorGrid
          constructors={currentGrid}
          statsById={statsById}
          labels={labels}
        />
      </TabsContent>
      <TabsContent value="archive">
        <ConstructorGrid
          constructors={archive}
          statsById={statsById}
          labels={labels}
        />
      </TabsContent>
    </Tabs>
  );
}
