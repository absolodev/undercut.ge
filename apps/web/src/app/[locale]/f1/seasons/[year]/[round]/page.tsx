import { getRaceArchive } from "@/lib/data/races";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LapChart } from "@/components/historical/lap-chart";
import { TireStrategyDiagram } from "@/components/historical/tire-strategy-diagram";
import { GridVsFinish } from "@/components/historical/grid-vs-finish";
import { PitStopSummary } from "@/components/historical/pit-stop-summary";
import { StaticTrackMap } from "@/components/circuits/static-track-map";
import { getCircuitData } from "@/lib/track-maps";
import { setLocaleFromParams } from "@/i18n/set-request-locale";
import { formatLapTime } from "@pitwall/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; year: string; round: string }> }) {
  const { year, round } = await params;
  return { title: `Round ${round} - ${year} — UnderCut` };
}

const tabClass =
  "rounded-none data-[state=active]:bg-[#222] data-[state=active]:border-t-2 data-[state=active]:border-t-[#E10600] h-full px-4 font-mono text-xs shrink-0";

function bestSectorLap(laps: any[], driverId: number) {
  const mine = laps.filter((lap) => lap.driver_id === driverId && lap.lap_time_ms);
  if (mine.length === 0) return null;
  const best = mine.reduce((current, lap) => (lap.lap_time_ms < current.lap_time_ms ? lap : current));
  if (best.sector_1_ms == null && best.sector_2_ms == null && best.sector_3_ms == null) return null;
  return best;
}

function maxSpeedByDriver(laps: any[]) {
  const byDriver = new Map<number, any>();
  for (const lap of laps) {
    if (lap.st_speed == null) continue;
    const previous = byDriver.get(lap.driver_id);
    if (!previous || lap.st_speed > previous.st_speed) byDriver.set(lap.driver_id, lap);
  }
  return [...byDriver.values()].sort((a, b) => b.st_speed - a.st_speed);
}

function ResultTable({
  rows,
  laps,
}: {
  rows: any[];
  laps?: any[];
}) {
  const sectorRows = laps ? rows.map((row) => bestSectorLap(laps, row.driver_id)) : [];
  const showSectors = sectorRows.some(Boolean);

  return (
    <div className="bg-[#111] rounded-lg border border-white/10 overflow-x-auto">
      <table className="w-full text-left text-sm min-w-[760px]">
        <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
          <tr>
            <th className="p-3">POS</th>
            <th className="p-3">NO</th>
            <th className="p-3">DRIVER</th>
            <th className="p-3">CONSTRUCTOR</th>
            <th className="p-3">GRID</th>
            <th className="p-3">LAPS</th>
            <th className="p-3">TIME</th>
            <th className="p-3">FL</th>
            {showSectors && (
              <>
                <th className="p-3">S1</th>
                <th className="p-3">S2</th>
                <th className="p-3">S3</th>
              </>
            )}
            <th className="p-3">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const sectors = sectorRows[index];
            return (
              <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 font-mono font-bold">{row.finish_position || row.position_text}</td>
                <td className="p-3 font-mono text-white/50">{row.number}</td>
                <td className="p-3 font-semibold">
                  <Link href={`/f1/drivers/${row.driver.driver_ref}`} className="hover:text-[#E10600]">
                    {row.driver.full_name}
                  </Link>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: row.constructor.color_primary || "#888" }} />
                    <span className="text-white/70">{row.constructor.name}</span>
                  </div>
                </td>
                <td className="p-3 font-mono text-white/70">{row.grid_position && row.grid_position > 0 ? row.grid_position : "—"}</td>
                <td className="p-3 font-mono text-white/70">{row.laps}</td>
                <td className="p-3 font-mono text-white/70">{row.time_str || row.status || "—"}</td>
                <td className="p-3 font-mono text-[#b026ff]">
                  {row.fastest_lap ? formatLapTime(row.fastest_lap_time_ms) : "—"}
                </td>
                {showSectors && (
                  <>
                    <td className="p-3 font-mono text-white/60">{sectors ? formatLapTime(sectors.sector_1_ms) : "—"}</td>
                    <td className="p-3 font-mono text-white/60">{sectors ? formatLapTime(sectors.sector_2_ms) : "—"}</td>
                    <td className="p-3 font-mono text-white/60">{sectors ? formatLapTime(sectors.sector_3_ms) : "—"}</td>
                  </>
                )}
                <td className="p-3 font-mono font-bold text-[#00FF00]">{row.points > 0 ? `+${row.points}` : "0"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SpeedTrap({ laps }: { laps: any[] }) {
  const rows = maxSpeedByDriver(laps);
  if (rows.length === 0) return null;
  return (
    <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
          <tr>
            <th className="p-3">POS</th>
            <th className="p-3">DRIVER</th>
            <th className="p-3 text-right">ST</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((lap, index) => (
            <tr key={lap.driver_id} className="border-b border-white/5">
              <td className="p-3 font-mono text-white/50">{index + 1}</td>
              <td className="p-3">
                <Link href={`/f1/drivers/${lap.driver.driver_ref}`} className="hover:text-[#E10600]">
                  {lap.driver.broadcast_name || lap.driver.full_name}
                </Link>
              </td>
              <td className="p-3 font-mono text-right">{lap.st_speed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RaceArchivePage({
  params,
}: {
  params: Promise<{ locale: string; year: string; round: string }>;
}) {
  await setLocaleFromParams(params);
  const { year, round } = await params;
  const race = await getRaceArchive(parseInt(year), parseInt(round)) as any;
  if (!race) notFound();

  const raceSession = race.sessions.find((session: any) => session.session_type === "R");
  const qualiSession = race.sessions.find((session: any) => session.session_type === "Q");
  const sprintSession = race.sessions.find((session: any) => session.session_type === "S");
  const sprintQuali = race.sessions.find((session: any) => session.session_type === "SQ");
  const practiceSessions = ["FP1", "FP2", "FP3"]
    .map((type) => race.sessions.find((session: any) => session.session_type === type))
    .filter((session) => session?.results?.length);
  const map = race.circuit?.circuit_ref ? getCircuitData(race.circuit.circuit_ref) : undefined;
  const qualiRows = qualiSession?.qualifying_results ?? [];
  const qualiTimesMissing = qualiRows.length > 0 && qualiRows.every(
    (row: any) => row.q1_time_ms == null && row.q2_time_ms == null && row.q3_time_ms == null,
  );
  const qualiSpeeds = maxSpeedByDriver(qualiSession?.laps ?? []);
  const raceSpeeds = maxSpeedByDriver(raceSession?.laps ?? []);
  const weather = raceSession?.weather_snapshots ?? [];
  const control = raceSession?.race_control_messages ?? [];
  const showSprint = (sprintSession?.results?.length ?? 0) > 0;
  const showSprintQuali = (sprintQuali?.results?.length ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
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

      {map && (
        <div className="mb-8 max-w-3xl">
          <StaticTrackMap
            svgPath={map.svgPath}
            corners={map.corners}
            drsZones={map.drsZones}
            viewBox={map.viewBox}
            startFinishLine={map.startFinishLine}
          />
        </div>
      )}

      <Tabs defaultValue="classification" className="space-y-6">
        <TabsList className="bg-[#111] border-b border-white/10 rounded-none w-full justify-start h-10 p-0 overflow-x-auto flex-nowrap">
          <TabsTrigger value="classification" className={tabClass}>CLASSIFICATION</TabsTrigger>
          {qualiRows.length > 0 && <TabsTrigger value="qualifying" className={tabClass}>QUALIFYING</TabsTrigger>}
          {showSprint && <TabsTrigger value="sprint" className={tabClass}>SPRINT</TabsTrigger>}
          {showSprintQuali && <TabsTrigger value="sprint-qualifying" className={tabClass}>SPRINT QUALIFYING</TabsTrigger>}
          {practiceSessions.length > 0 && <TabsTrigger value="practice" className={tabClass}>PRACTICE</TabsTrigger>}
          <TabsTrigger value="grid-finish" className={tabClass}>GRID VS FINISH</TabsTrigger>
          <TabsTrigger value="lap-chart" className={tabClass}>LAP CHART</TabsTrigger>
          <TabsTrigger value="tire-strategy" className={tabClass}>TIRE STRATEGY</TabsTrigger>
          <TabsTrigger value="pit-stops" className={tabClass}>PIT STOPS</TabsTrigger>
          {weather.length > 0 && <TabsTrigger value="weather" className={tabClass}>WEATHER</TabsTrigger>}
          {control.length > 0 && <TabsTrigger value="race-control" className={tabClass}>RACE CONTROL</TabsTrigger>}
          {raceSpeeds.length > 0 && <TabsTrigger value="speed-trap" className={tabClass}>SPEED TRAP</TabsTrigger>}
        </TabsList>

        <TabsContent value="classification" className="mt-6 border-none outline-none">
          <ResultTable rows={raceSession?.results ?? []} laps={raceSession?.laps ?? []} />
        </TabsContent>

        {qualiRows.length > 0 && (
          <TabsContent value="qualifying" className="mt-6 border-none outline-none space-y-4">
            {qualiTimesMissing && (
              <p className="text-sm font-mono text-white/50">
                Segment times are not in the Jolpica feed for this round yet.
              </p>
            )}
            <div className="bg-[#111] rounded-lg border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[680px]">
                <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
                  <tr>
                    <th className="p-3">POS</th>
                    <th className="p-3">NO</th>
                    <th className="p-3">DRIVER</th>
                    <th className="p-3">CONSTRUCTOR</th>
                    <th className="p-3">Q1</th>
                    <th className="p-3">Q2</th>
                    <th className="p-3">Q3</th>
                    {qualiSpeeds.length > 0 && <th className="p-3 text-right">ST</th>}
                  </tr>
                </thead>
                <tbody>
                  {qualiRows.map((row: any) => {
                    const speed = qualiSpeeds.find((lap) => lap.driver_id === row.driver_id);
                    return (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-mono font-bold">{row.position ?? "—"}</td>
                        <td className="p-3 font-mono text-white/50">{row.number}</td>
                        <td className="p-3 font-semibold">
                          <Link href={`/f1/drivers/${row.driver.driver_ref}`} className="hover:text-[#E10600]">
                            {row.driver.full_name}
                          </Link>
                        </td>
                        <td className="p-3 text-white/70">{row.constructor.name}</td>
                        <td className="p-3 font-mono">{formatLapTime(row.q1_time_ms)}</td>
                        <td className="p-3 font-mono">{formatLapTime(row.q2_time_ms)}</td>
                        <td className="p-3 font-mono">{formatLapTime(row.q3_time_ms)}</td>
                        {qualiSpeeds.length > 0 && (
                          <td className="p-3 font-mono text-right">{speed?.st_speed ?? "—"}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {showSprint && (
          <TabsContent value="sprint" className="mt-6 border-none outline-none">
            <ResultTable rows={sprintSession.results} />
          </TabsContent>
        )}

        {showSprintQuali && (
          <TabsContent value="sprint-qualifying" className="mt-6 border-none outline-none">
            <div className="bg-[#111] rounded-lg border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#222] font-mono text-[10px] text-white/50">
                  <tr>
                    <th className="p-3">POS</th>
                    <th className="p-3">DRIVER</th>
                    <th className="p-3">CONSTRUCTOR</th>
                    <th className="p-3">BEST</th>
                    <th className="p-3">GAP</th>
                  </tr>
                </thead>
                <tbody>
                  {sprintQuali.results.map((row: any) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="p-3 font-mono">{row.finish_position || row.position_text}</td>
                      <td className="p-3">
                        <Link href={`/f1/drivers/${row.driver.driver_ref}`} className="hover:text-[#E10600]">
                          {row.driver.full_name}
                        </Link>
                      </td>
                      <td className="p-3 text-white/70">{row.constructor.name}</td>
                      <td className="p-3 font-mono">{formatLapTime(row.time_ms)}</td>
                      <td className="p-3 font-mono">{row.time_str || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {practiceSessions.length > 0 && (
          <TabsContent value="practice" className="mt-6 border-none outline-none">
            <Tabs defaultValue={practiceSessions[0].session_type}>
              <TabsList className="bg-[#111] border border-white/10 mb-4">
                {practiceSessions.map((session: any) => (
                  <TabsTrigger key={session.session_type} value={session.session_type} className="font-mono text-xs">
                    {session.session_type}
                  </TabsTrigger>
                ))}
              </TabsList>
              {practiceSessions.map((session: any) => (
                <TabsContent key={session.session_type} value={session.session_type}>
                  <div className="bg-[#111] rounded-lg border border-white/10 overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[640px]">
                      <thead className="bg-[#222] font-mono text-[10px] text-white/50">
                        <tr>
                          <th className="p-3">POS</th>
                          <th className="p-3">DRIVER</th>
                          <th className="p-3">CONSTRUCTOR</th>
                          <th className="p-3">LAPS</th>
                          <th className="p-3">BEST</th>
                          <th className="p-3">GAP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.results.map((row: any) => (
                          <tr key={row.id} className="border-t border-white/5">
                            <td className="p-3 font-mono">{row.finish_position || row.position_text || "—"}</td>
                            <td className="p-3">
                              <Link href={`/f1/drivers/${row.driver.driver_ref}`} className="hover:text-[#E10600]">
                                {row.driver.full_name}
                              </Link>
                            </td>
                            <td className="p-3 text-white/70">{row.constructor.name}</td>
                            <td className="p-3 font-mono">{row.laps}</td>
                            <td className="p-3 font-mono">{formatLapTime(row.time_ms)}</td>
                            <td className="p-3 font-mono">{row.time_str || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        )}

        <TabsContent value="grid-finish" className="mt-6 border-none outline-none">
          <GridVsFinish results={raceSession?.results || []} />
        </TabsContent>
        <TabsContent value="lap-chart" className="mt-6 border-none outline-none">
          <LapChart laps={raceSession?.laps || []} />
        </TabsContent>
        <TabsContent value="tire-strategy" className="mt-6 border-none outline-none space-y-3">
          <p className="text-xs font-mono text-white/40">
            Compound colours are official only when the stint source is OpenF1. Otherwise the bar is the pit-stop window.
          </p>
          <TireStrategyDiagram stints={raceSession?.stints || []} totalLaps={race.total_laps || 0} />
        </TabsContent>
        <TabsContent value="pit-stops" className="mt-6 border-none outline-none">
          <PitStopSummary pitStops={raceSession?.pit_stops || []} />
        </TabsContent>

        {weather.length > 0 && (
          <TabsContent value="weather" className="mt-6 border-none outline-none">
            <WeatherSummary snapshots={weather} />
          </TabsContent>
        )}

        {control.length > 0 && (
          <TabsContent value="race-control" className="mt-6 border-none outline-none">
            <div className="bg-[#111] rounded-lg border border-white/10 overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-[#222] font-mono text-[10px] text-white/50 sticky top-0">
                  <tr>
                    <th className="p-3">LAP</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">FLAG</th>
                    <th className="p-3">DRIVER</th>
                    <th className="p-3">MESSAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {control.map((message: any) => (
                    <tr key={message.id} className="border-t border-white/5 align-top">
                      <td className="p-3 font-mono text-white/50">{message.lap_number ?? "—"}</td>
                      <td className="p-3 font-mono text-xs">{message.category}</td>
                      <td className="p-3 font-mono text-xs">{message.flag_status ?? "—"}</td>
                      <td className="p-3 text-white/70">{message.driver_name ?? "—"}</td>
                      <td className="p-3 text-white/80">{message.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {raceSpeeds.length > 0 && (
          <TabsContent value="speed-trap" className="mt-6 border-none outline-none">
            <SpeedTrap laps={raceSession?.laps ?? []} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function WeatherSummary({ snapshots }: { snapshots: any[] }) {
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const rain = snapshots.some((row) => row.rainfall);
  const cells = [
    ["Air, first", first.air_temp],
    ["Air, last", last.air_temp],
    ["Track, first", first.track_temp],
    ["Track, last", last.track_temp],
    ["Humidity, first", first.humidity],
    ["Humidity, last", last.humidity],
    ["Wind, first", first.wind_speed],
    ["Wind, last", last.wind_speed],
  ] as const;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-5">
      <p className="font-mono text-xs text-white/40 mb-4">
        {rain ? "Rain recorded during the session." : "No rainfall recorded."}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cells.map(([label, value]) => (
          <div key={label} className="bg-black/40 rounded p-3">
            <div className="text-[10px] font-mono text-white/40 uppercase">{label}</div>
            <div className="font-mono text-lg mt-1">{value == null ? "—" : Number(value).toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
