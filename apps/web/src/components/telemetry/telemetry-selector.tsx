"use client";

import { useEffect, useRef, useState } from "react";

export interface TelemetrySessionOption {
  id: number;
  label: string;
  sessionType: string;
  circuitRef: string;
}

interface LapTime {
  lap: number;
  ms: number | null;
  pit: boolean;
}

export interface TelemetryDriverOption {
  id: number;
  fullName: string;
  broadcastName: string;
  number: number | null;
  constructorName: string | null;
  bestLapMs: number | null;
  laps: number[];
  lapTimes: LapTime[];
}

export interface TelemetrySelection {
  sessionId: number;
  circuitRef: string;
  driverA: { id: number; lap: number; name: string };
  driverB: { id: number; lap: number; name: string };
}

function formatLap(ms: number | null): string {
  if (!ms) return "";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return minutes > 0 ? `${minutes}:${seconds.padStart(6, "0")}` : `${seconds}s`;
}

function bestLap(driver: TelemetryDriverOption | undefined): number {
  if (!driver) return 1;
  const timed = driver.lapTimes.filter((lap) => lap.ms && !lap.pit);
  if (!timed.length) return driver.laps[0] ?? 1;
  return timed.reduce((best, lap) => ((lap.ms ?? Infinity) < (best.ms ?? Infinity) ? lap : best)).lap;
}

function driverLabel(driver: TelemetryDriverOption): string {
  const best = formatLap(driver.bestLapMs);
  const number = driver.number ? `#${driver.number} ` : "";
  return `${number}${driver.broadcastName || driver.fullName}${best ? `  ${best}` : ""}`;
}

export function TelemetrySelector({ onSelection }: { onSelection: (selection: TelemetrySelection | null) => void }) {
  const [sessions, setSessions] = useState<TelemetrySessionOption[]>([]);
  const [drivers, setDrivers] = useState<TelemetryDriverOption[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [driverAId, setDriverAId] = useState<number | null>(null);
  const [driverBId, setDriverBId] = useState<number | null>(null);
  const [lapA, setLapA] = useState(1);
  const [lapB, setLapB] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onSelectionRef = useRef(onSelection);
  onSelectionRef.current = onSelection;

  useEffect(() => {
    fetch("/api/telemetry/sessions")
      .then((res) => res.json())
      .then((data: { sessions: TelemetrySessionOption[] }) => {
        const qualifying = data.sessions.find((session) => session.sessionType === "Q");
        setSessions(data.sessions);
        setSessionId((qualifying ?? data.sessions[0])?.id ?? null);
      })
      .catch(() => setError("Could not load telemetry sessions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setDrivers([]);
      onSelectionRef.current(null);
      return;
    }

    let cancelled = false;
    setDriverAId(null);
    setDriverBId(null);
    fetch(`/api/telemetry/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data: { drivers: TelemetryDriverOption[] }) => {
        if (cancelled) return;
        setDrivers(data.drivers);
        const first = data.drivers[0];
        const second = data.drivers[1] ?? data.drivers[0];
        if (first) {
          setDriverAId(first.id);
          setLapA(bestLap(first));
        }
        if (second) {
          setDriverBId(second.id);
          setLapB(bestLap(second));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load session drivers");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    const session = sessions.find((item) => item.id === sessionId);
    const driverA = drivers.find((driver) => driver.id === driverAId);
    const driverB = drivers.find((driver) => driver.id === driverBId);
    if (!session || !driverA || !driverB) return;
    onSelectionRef.current({
      sessionId: session.id,
      circuitRef: session.circuitRef,
      driverA: { id: driverA.id, lap: lapA, name: driverA.broadcastName || driverA.fullName },
      driverB: { id: driverB.id, lap: lapB, name: driverB.broadcastName || driverB.fullName },
    });
  }, [sessionId, sessions, drivers, driverAId, driverBId, lapA, lapB]);

  const driverA = drivers.find((driver) => driver.id === driverAId);
  const driverB = drivers.find((driver) => driver.id === driverBId);

  if (loading) {
    return (
      <div className="bg-[#111] border border-white/10 rounded-lg p-4 text-white/40 font-mono text-sm">
        Loading telemetry sessions…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-[#111] border border-dashed border-white/20 rounded-lg p-6 text-center">
        <p className="text-white/50 font-mono text-sm">No car data for a completed session yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-mono text-[#E10600]">{error}</p>}
      <div className="bg-[#111] border border-white/10 rounded-lg p-4 font-mono text-sm grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] gap-4">
        <label className="space-y-2 block">
          <span className="text-white/50 text-xs">SESSION</span>
          <select
            value={sessionId ?? ""}
            onChange={(event) => setSessionId(Number(event.target.value))}
            className="w-full bg-[#222] border border-white/10 rounded p-2 text-white outline-none"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.label}
              </option>
            ))}
          </select>
        </label>

        <DriverPick
          label="DRIVER A"
          accent="text-[#E10600]"
          drivers={drivers}
          driverId={driverAId}
          lap={lapA}
          laps={driverA?.lapTimes ?? []}
          onDriver={(id) => {
            setDriverAId(id);
            setLapA(bestLap(drivers.find((driver) => driver.id === id)));
          }}
          onLap={setLapA}
        />
        <DriverPick
          label="DRIVER B"
          accent="text-[#00A2FF]"
          drivers={drivers}
          driverId={driverBId}
          lap={lapB}
          laps={driverB?.lapTimes ?? []}
          onDriver={(id) => {
            setDriverBId(id);
            setLapB(bestLap(drivers.find((driver) => driver.id === id)));
          }}
          onLap={setLapB}
        />
      </div>
      <p className="text-[10px] font-mono text-white/30">
        {drivers.length} drivers with car data
        {driverA?.constructorName ? ` · ${driverA.constructorName}` : ""}
        {driverB?.constructorName ? ` vs ${driverB.constructorName}` : ""}
        {" · fastest lap is selected"}
      </p>
    </div>
  );
}

function DriverPick({
  label,
  accent,
  drivers,
  driverId,
  lap,
  laps,
  onDriver,
  onLap,
}: {
  label: string;
  accent: string;
  drivers: TelemetryDriverOption[];
  driverId: number | null;
  lap: number;
  laps: LapTime[];
  onDriver: (id: number) => void;
  onLap: (lap: number) => void;
}) {
  return (
    <div className="space-y-2">
      <span className={`${accent} font-bold text-xs block`}>{label}</span>
      <div className="flex gap-2">
        <select
          value={driverId ?? ""}
          onChange={(event) => onDriver(Number(event.target.value))}
          className="w-full bg-[#222] border border-white/10 rounded p-2 text-white outline-none"
        >
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driverLabel(driver)}
            </option>
          ))}
        </select>
        <select
          value={lap}
          onChange={(event) => onLap(Number(event.target.value))}
          className="w-28 bg-[#222] border border-white/10 rounded p-2 text-white outline-none text-center"
        >
          {laps.map((item) => (
            <option key={item.lap} value={item.lap}>
              L{item.lap}
              {item.ms ? ` ${formatLap(item.ms)}` : ""}
              {item.pit ? " pit" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
