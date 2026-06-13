import { Link } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverAvatar } from "@/components/ui/driver-avatar";

type Driver = {
  id: number;
  driver_ref: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  number: number | null;
  nationality: string | null;
  code: string | null;
  is_active: boolean;
  headshot_url?: string | null;
};

function DriverGrid({ drivers, emptyMessage }: { drivers: Driver[]; emptyMessage?: string }) {
  if (drivers.length === 0) {
    return (
      <p className="text-sm text-white/40 font-mono py-8 text-center">
        {emptyMessage ?? "No drivers found for this season. Entries appear once race results are recorded."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {drivers.map((d) => (
        <Link
          key={d.id}
          href={`/f1/drivers/${d.driver_ref}`}
          className="bg-[#111] border border-white/10 rounded-lg p-4 hover:bg-[#222] hover:border-[#E10600]/50 transition-all group flex flex-col"
        >
          <div className="flex gap-3 mb-2">
            <DriverAvatar
              driverRef={d.driver_ref}
              name={d.full_name ?? `${d.first_name} ${d.last_name}`}
              headshotUrl={d.headshot_url}
              size={44}
            />
            <div className="flex-1 min-w-0 flex justify-between items-start">
              <div className="font-display font-bold text-lg text-white group-hover:text-[#E10600] transition-colors leading-tight">
                {d.first_name} <br />
                <span className="text-xl">{d.last_name}</span>
              </div>
              {d.number && (
                <div className="text-lg font-mono font-bold text-white/30 group-hover:text-[#E10600]/30 transition-colors">
                  {d.number}
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto pt-4 flex justify-between items-end">
            <div className="text-xs text-white/50">{d.nationality}</div>
            {d.code && (
              <div className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">
                {d.code}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function DriversTabs({
  currentGrid,
  archive,
  seasonYear,
}: {
  currentGrid: Driver[];
  archive: Driver[];
  seasonYear: number;
}) {
  return (
    <Tabs defaultValue="current">
      <TabsList className="bg-[#111] border border-white/10 mb-8">
        <TabsTrigger value="current" className="font-mono text-xs">
          {seasonYear} GRID ({currentGrid.length})
        </TabsTrigger>
        <TabsTrigger value="archive" className="font-mono text-xs">
          ALL-TIME ARCHIVE
        </TabsTrigger>
      </TabsList>
      <TabsContent value="current">
        <DriverGrid drivers={currentGrid} />
      </TabsContent>
      <TabsContent value="archive">
        <DriverGrid drivers={archive} />
      </TabsContent>
    </Tabs>
  );
}
