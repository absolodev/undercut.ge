import { getAllCircuits } from "@/lib/data/circuits";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { buildPageMetadata } from "@/lib/seo";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export const metadata = buildPageMetadata({
  title: "F1 Circuits — UnderCut",
  description: "Track layouts, corner guides, and race history for every Formula 1 circuit.",
  path: "/f1/circuits",
});

export default async function CircuitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await setLocaleFromParams(params);
  const circuits = await getAllCircuits();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Circuits"
        description="Track maps, DRS zones, and historical results for venues on the F1 calendar."
        breadcrumbs={[{ label: "F1", href: "/f1/seasons" }, { label: "Circuits" }]}
      />

      {circuits.length === 0 ? (
        <p className="text-sm text-white/40 font-mono">
          Circuit data is not loaded yet. Run the database seed to populate venues.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {circuits.map((c) => (
            <Link
              key={c.id}
              href={`/f1/circuits/${c.circuit_ref}`}
              className="bg-[#111] border border-white/10 rounded-lg p-5 hover:bg-[#222] hover:border-[#E10600]/50 transition-all group flex flex-col h-40"
            >
              <div className="font-display font-bold text-lg text-white group-hover:text-[#E10600] transition-colors leading-tight mb-1">
                {c.name}
              </div>
              <div className="text-xs text-white/50">
                {c.location}, {c.country}
              </div>

              <div className="mt-auto flex justify-between items-end">
                {c.length_meters && (
                  <div className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">
                    {(c.length_meters / 1000).toFixed(3)} km
                  </div>
                )}
                {!c.map_svg_path && (
                  <span className="text-[10px] font-mono text-white/30">Map pending</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
