import { getCircuitProfile } from "@/lib/data/circuits";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { CircuitHeader } from "@/components/circuits/circuit-header";
import { StaticTrackMap } from "@/components/circuits/static-track-map";
import { ElevationProfile } from "@/components/circuits/elevation-profile";
import { DrsZoneVisualization } from "@/components/circuits/drs-zones";
import { RaceHistoryTable } from "@/components/circuits/race-history-table";
import { CircuitRecords } from "@/components/circuits/circuit-records";
import { LapTimeEvolution } from "@/components/circuits/lap-time-evolution";
import { getCircuitMapData } from "@/lib/track-maps/circuit-loader";
import { buildPageMetadata } from "@/lib/seo";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const data = await getCircuitProfile(id);
  if (!data) return buildPageMetadata({ title: "Circuit — UnderCut", path: `/f1/circuits/${id}` });
  return buildPageMetadata({
    title: `${data.circuit.name} — UnderCut`,
    description: `Track map, records, and race history for ${data.circuit.name}.`,
    path: `/f1/circuits/${id}`,
  });
}

export default async function CircuitProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await setLocaleFromParams(params);
  const { id } = await params;
  const data = await getCircuitProfile(id);
  if (!data) notFound();

  const { circuit, mostWins, raceHistory, fastestQualifying, poleEvolution } = data;
  const mapData = (await getCircuitMapData(circuit.circuit_ref)) ?? undefined;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header: Name, location, country flag, key stats */}
      <CircuitHeader circuit={circuit} />

      {/* Track map */}
      <div className="bg-bg-surface border border-border-default rounded-lg p-4 md:p-6">
        <h2 className="font-display text-sm font-bold mb-4">Track Layout</h2>
        <StaticTrackMap
          svgPath={mapData ? mapData.svgPath : circuit.map_svg_path}
          corners={mapData ? mapData.corners : circuit.corner_data}
          drsZones={mapData ? mapData.drsZones : circuit.drs_zones}
          viewBox={mapData?.viewBox ?? null}
        />
      </div>

      {/* Key stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Length" value={circuit.length_meters ? `${(circuit.length_meters / 1000).toFixed(3)} km` : "N/A"} />
        <StatCard label="Turns" value={circuit.turns || "N/A"} />
        <StatCard label="Pit Loss" value={circuit.pit_loss_time ? `~${circuit.pit_loss_time}s` : "N/A"} />
        <StatCard label="DRS Zones" value={(circuit.drs_zones as any[])?.length || 0} />
        <StatCard label="First GP" value={raceHistory[raceHistory.length - 1]?.season_year || "N/A"} />
      </div>

      {/* DRS Zone Visualization */}
      <DrsZoneVisualization
        drsZones={mapData ? mapData.drsZones : circuit.drs_zones}
        svgPath={mapData ? mapData.svgPath : circuit.map_svg_path}
        viewBox={
          mapData?.viewBox
            ? `${mapData.viewBox.x} ${mapData.viewBox.y} ${mapData.viewBox.width} ${mapData.viewBox.height}`
            : null
        }
      />

      {/* Elevation Profile */}
      {circuit.elevation_data && (
        <ElevationProfile data={circuit.elevation_data as any} />
      )}

      {/* Lap Time Evolution */}
      <LapTimeEvolution data={poleEvolution as any} />

      {/* Circuit Records */}
      <CircuitRecords
        fastestQualifying={fastestQualifying as any}
        mostWins={mostWins as any}
      />

      {/* Race History Table */}
      <RaceHistoryTable races={raceHistory} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-3">
      <div className="text-[10px] text-text-muted uppercase">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
