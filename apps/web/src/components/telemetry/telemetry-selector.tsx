"use client";

import { useEffect, useState } from "react";

export interface TelemetrySessionOption {
  id: number;
  label: string;
  sessionType: string;
  circuitRef: string;
}

export interface TelemetryDriverOption {
  id: number;
  fullName: string;
  broadcastName: string;
  number: number | null;
  constructorRef: string | null;
  laps: number[];
}

interface TelemetrySelectorProps {
  onSessionChange: (sessionId: number | null) => void;
  onDriverAChange: (driver: { id: number; lap: number } | null) => void;
  onDriverBChange: (driver: { id: number; lap: number } | null) => void;
}

export function TelemetrySelector({
  onSessionChange,
  onDriverAChange,
  onDriverBChange,
}: TelemetrySelectorProps) {
  const [sessions, setSessions] = useState<TelemetrySessionOption[]>([]);
  const [drivers, setDrivers] = useState<TelemetryDriverOption[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [driverAId, setDriverAId] = useState<number | null>(null);
  const [driverBId, setDriverBId] = useState<number | null>(null);
  const [lapA, setLapA] = useState(1);
  const [lapB, setLapB] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/telemetry/sessions")
      .then((res) => res.json())
      .then((data: { sessions: TelemetrySessionOption[] }) => {
        setSessions(data.sessions);
        if (data.sessions[0]) {
          setSessionId(data.sessions[0].id);
        }
      })
      .catch(() => setError("Could not load telemetry sessions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setDrivers([]);
      return;
    }

    fetch(`/api/telemetry/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data: { drivers: TelemetryDriverOption[] }) => {
        setDrivers(data.drivers);
        if (data.drivers[0]) {
          setDriverAId(data.drivers[0].id);
          setLapA(data.drivers[0].laps[0] ?? 1);
        }
        if (data.drivers[1]) {
          setDriverBId(data.drivers[1].id);
          setLapB(data.drivers[1].laps[0] ?? 1);
        } else if (data.drivers[0]) {
          setDriverBId(data.drivers[0].id);
          setLapB(data.drivers[0].laps[1] ?? data.drivers[0].laps[0] ?? 1);
        }
      })
      .catch(() => setError("Could not load session drivers"));
  }, [sessionId]);

  const driverA = drivers.find((d) => d.id === driverAId);
  const driverB = drivers.find((d) => d.id === driverBId);

  const handleApply = () => {
    onSessionChange(sessionId);
    onDriverAChange(driverAId ? { id: driverAId, lap: lapA } : null);
    onDriverBChange(driverBId ? { id: driverBId, lap: lapB } : null);
  };

  if (loading) {
    return (
      <div className="bg-[#111] border border-white/10 rounded-lg p-4 text-white/40 font-mono text-sm">
        Loading available telemetry sessions…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-[#111] border border-dashed border-white/20 rounded-lg p-6 text-center">
        <p className="text-white/50 font-mono text-sm">No telemetry data in the database yet.</p>
        <p className="text-white/30 font-mono text-xs mt-2">
          Run <code className="text-[#E10600]">pnpm db:seed</code> to load sample lap traces for comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs font-mono text-[#E10600]">{error}</p>}
      <div className="bg-[#111] border border-white/10 rounded-lg p-4 font-mono text-sm flex flex-col md:flex-row items-end gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-white/50 text-xs block">SESSION</label>
          <select
            value={sessionId ?? ""}
            onChange={(e) => setSessionId(Number(e.target.value))}
            className="w-full bg-[#222] border border-white/10 rounded p-2 text-white outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-2 border-l border-white/10 pl-4">
          <label className="text-[#E10600] font-bold text-xs block">DRIVER A</label>
          <div className="flex gap-2">
            <select
              value={driverAId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setDriverAId(id);
                const d = drivers.find((x) => x.id === id);
                if (d?.laps[0]) setLapA(d.laps[0]);
              }}
              className="w-full bg-[#222] border border-white/10 rounded p-2 text-white outline-none"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.number ? `#${d.number} ` : ""}
                  {d.fullName}
                </option>
              ))}
            </select>
            <select
              value={lapA}
              onChange={(e) => setLapA(Number(e.target.value))}
              className="w-20 bg-[#222] border border-white/10 rounded p-2 text-white outline-none text-center"
            >
              {(driverA?.laps ?? []).map((lap) => (
                <option key={lap} value={lap}>
                  L{lap}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 space-y-2 border-l border-white/10 pl-4">
          <label className="text-[#00A2FF] font-bold text-xs block">DRIVER B</label>
          <div className="flex gap-2">
            <select
              value={driverBId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setDriverBId(id);
                const d = drivers.find((x) => x.id === id);
                if (d?.laps[0]) setLapB(d.laps[0]);
              }}
              className="w-full bg-[#222] border border-white/10 rounded p-2 text-white outline-none"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.number ? `#${d.number} ` : ""}
                  {d.fullName}
                </option>
              ))}
            </select>
            <select
              value={lapB}
              onChange={(e) => setLapB(Number(e.target.value))}
              className="w-20 bg-[#222] border border-white/10 rounded p-2 text-white outline-none text-center"
            >
              {(driverB?.laps ?? []).map((lap) => (
                <option key={lap} value={lap}>
                  L{lap}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleApply}
          className="bg-white text-black font-bold px-6 py-2 rounded hover:bg-white/80 transition-colors h-[38px]"
        >
          LOAD
        </button>
      </div>
      <p className="text-[10px] font-mono text-white/30">
        {drivers.length} drivers · {sessions.find((s) => s.id === sessionId)?.circuitRef ?? "circuit"} track data
      </p>
    </div>
  );
}
