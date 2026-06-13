import { getRaceArchive } from "@/lib/data/races";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LapChart } from "@/components/historical/lap-chart";
import { TireStrategyDiagram } from "@/components/historical/tire-strategy-diagram";
import { GridVsFinish } from "@/components/historical/grid-vs-finish";
import { PitStopSummary } from "@/components/historical/pit-stop-summary";

export async function generateMetadata({ params }: { params: Promise<{ year: string, round: string }> }) {
  const { year, round } = await params;
  return { title: `Round ${round} - ${year} — UnderCut` };
}

export default async function RaceArchivePage({ params }: { params: Promise<{ year: string; round: string }> }) {
  const { year, round } = await params;
  const race = await getRaceArchive(parseInt(year), parseInt(round)) as any;
  if (!race) {
    notFound();
  }

  const raceSession = race.sessions.find((s: any) => s.session_type === "R");

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/f1/seasons/${year}`} className="text-[#E10600] text-sm hover:underline font-mono mb-2 inline-block">
          ← BACK TO {year} SEASON
        </Link>
        <div className="flex items-end gap-4 mb-2">
          <h1 className="font-display text-4xl font-bold">{race.race_name}</h1>
          <div className="text-xl text-white/50 pb-1">{year}</div>
        </div>
        <div className="text-sm text-white/70 font-mono">
          ROUND {round} • {race.circuit.name} • {new Date(race.race_date).toLocaleDateString()}
        </div>
      </div>

      <Tabs defaultValue="classification" className="space-y-6">
        <TabsList className="bg-[#111] border-b border-white/10 rounded-none w-full justify-start h-10 p-0 overflow-x-auto flex-nowrap">
          <TabsTrigger value="classification" className="rounded-none data-[state=active]:bg-[#222] data-[state=active]:border-t-2 data-[state=active]:border-t-[#E10600] h-full px-6 font-mono text-xs">CLASSIFICATION</TabsTrigger>
          <TabsTrigger value="grid-finish" className="rounded-none data-[state=active]:bg-[#222] data-[state=active]:border-t-2 data-[state=active]:border-t-[#E10600] h-full px-6 font-mono text-xs">GRID VS FINISH</TabsTrigger>
          <TabsTrigger value="lap-chart" className="rounded-none data-[state=active]:bg-[#222] data-[state=active]:border-t-2 data-[state=active]:border-t-[#E10600] h-full px-6 font-mono text-xs">LAP CHART</TabsTrigger>
          <TabsTrigger value="tire-strategy" className="rounded-none data-[state=active]:bg-[#222] data-[state=active]:border-t-2 data-[state=active]:border-t-[#E10600] h-full px-6 font-mono text-xs">TIRE STRATEGY</TabsTrigger>
          <TabsTrigger value="pit-stops" className="rounded-none data-[state=active]:bg-[#222] data-[state=active]:border-t-2 data-[state=active]:border-t-[#E10600] h-full px-6 font-mono text-xs">PIT STOPS</TabsTrigger>
        </TabsList>

        <TabsContent value="classification" className="mt-6 border-none outline-none">
          <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
                <tr>
                  <th className="p-3">POS</th>
                  <th className="p-3">NO</th>
                  <th className="p-3">DRIVER</th>
                  <th className="p-3">CONSTRUCTOR</th>
                  <th className="p-3">LAPS</th>
                  <th className="p-3">TIME/RETIRED</th>
                  <th className="p-3">PTS</th>
                </tr>
              </thead>
              <tbody>
                {raceSession?.results?.map((r: any) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3 font-mono font-bold">{r.finish_position || r.position_text}</td>
                    <td className="p-3 font-mono text-white/50">{r.number}</td>
                    <td className="p-3 font-semibold">{r.driver.full_name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: r.constructor.color_primary || "#888" }} />
                        <span className="text-white/70">{r.constructor.name}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-white/70">{r.laps}</td>
                    <td className="p-3 font-mono text-white/70">{r.status}</td>
                    <td className="p-3 font-mono font-bold text-[#00FF00]">{r.points > 0 ? `+${r.points}` : "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        <TabsContent value="grid-finish" className="mt-6 border-none outline-none">
          <GridVsFinish results={raceSession?.results || []} />
        </TabsContent>
        <TabsContent value="lap-chart" className="mt-6 border-none outline-none">
          <LapChart laps={raceSession?.laps || []} />
        </TabsContent>
        <TabsContent value="tire-strategy" className="mt-6 border-none outline-none">
          <TireStrategyDiagram stints={raceSession?.stints || []} totalLaps={race.total_laps || 0} />
        </TabsContent>
        <TabsContent value="pit-stops" className="mt-6 border-none outline-none">
          <PitStopSummary pitStops={raceSession?.pit_stops || []} />
        </TabsContent>

      </Tabs>
    </div>
  );
}
