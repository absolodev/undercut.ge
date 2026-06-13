# Phase 5: Live Console — Track Map (Week 4-5)

## Overview
Build the WebGL-accelerated live track map using PixiJS — the hero component showing 20 cars moving around the circuit in real-time. Includes lerp-based interpolation for smooth 60fps rendering, DRS zones, flag overlays, driver focus modal, and fullscreen mode.

## Prerequisites
- Phase 1 (Next.js, Tailwind, layout grid)
- Phase 4 (Zustand stores: `usePositionsStore`, `useUIStore`, `useTelemetryStore`)
- At least one circuit SVG coordinate dataset

## Deliverables
- `apps/web/components/live/track-map/` — PixiJS canvas with all layers
- `apps/web/lib/pixi/` — PixiJS scene management
- `apps/web/lib/track-maps/` — Circuit coordinate data + SVG paths
- Smooth car dot interpolation at 60fps from 3.7Hz data
- DRS zone, sector boundary, flag overlays
- Driver focus modal (click a car dot)
- Fullscreen mode

---

## Task Breakdown

### 5.1 PixiJS Setup

```bash
cd apps/web
pnpm add pixi.js@8
```

### 5.2 Circuit Coordinate Data Format

Each circuit needs a JSON file with the track outline and metadata:

```typescript
// apps/web/lib/track-maps/types.ts
export interface CircuitMapData {
  id: string;                    // 'silverstone'
  name: string;                  // 'Silverstone Circuit'
  svgPath: string;               // SVG path d attribute for track outline
  pitLanePath?: string;          // SVG path for pit lane
  viewBox: { x: number; y: number; width: number; height: number };
  
  // Coordinate transform: telemetry (x,y) → canvas
  transform: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;            // degrees
  };

  drsZones: Array<{
    detectionPathSegment: string;   // SVG path segment for detection line
    activationPathSegment: string;  // SVG path segment for DRS zone
  }>;

  sectorBoundaries: Array<{
    position: { x: number; y: number };
    label: string;               // "S1/S2", "S2/S3"
  }>;

  corners: Array<{
    number: number;
    name?: string;               // "Copse", "Maggots"
    position: { x: number; y: number };
  }>;

  startFinishLine: { x1: number; y1: number; x2: number; y2: number };
}
```

**Example circuit data file:**
```typescript
// apps/web/lib/track-maps/circuits/silverstone.ts
import type { CircuitMapData } from "../types";

export const silverstone: CircuitMapData = {
  id: "silverstone",
  name: "Silverstone Circuit",
  svgPath: "M 100,200 C 150,100 250,50 ...", // Actual SVG path from tracing
  viewBox: { x: 0, y: 0, width: 1000, height: 600 },
  transform: {
    translateX: -2000,
    translateY: -3500,
    scaleX: 0.08,
    scaleY: -0.08, // Y is often inverted in telemetry
    rotation: 0,
  },
  drsZones: [
    {
      detectionPathSegment: "M 850,300 L 900,280",
      activationPathSegment: "M 900,280 C 950,260 980,240 ...",
    },
  ],
  sectorBoundaries: [
    { position: { x: 450, y: 150 }, label: "S1/S2" },
    { position: { x: 700, y: 400 }, label: "S2/S3" },
  ],
  corners: [
    { number: 1, name: "Abbey", position: { x: 200, y: 300 } },
    { number: 2, name: "Farm", position: { x: 250, y: 250 } },
    // ... all corners
  ],
  startFinishLine: { x1: 100, y1: 195, x2: 100, y2: 205 },
};
```

### 5.3 Coordinate Transformation

```typescript
// apps/web/lib/pixi/coordinate-mapper.ts
import type { CircuitMapData } from "../track-maps/types";

export class CoordinateMapper {
  private tx: number;
  private ty: number;
  private sx: number;
  private sy: number;
  private cos: number;
  private sin: number;

  constructor(private circuit: CircuitMapData, private canvasWidth: number, private canvasHeight: number) {
    const { translateX, translateY, scaleX, scaleY, rotation } = circuit.transform;
    this.tx = translateX;
    this.ty = translateY;
    this.sx = scaleX;
    this.sy = scaleY;
    const rad = (rotation * Math.PI) / 180;
    this.cos = Math.cos(rad);
    this.sin = Math.sin(rad);
  }

  /**
   * Convert telemetry coordinates (from OpenF1 /location endpoint)
   * to canvas pixel coordinates.
   * 
   * Telemetry X/Y are in 1/10th meter coordinates from a track-specific reference point.
   */
  telemetryToCanvas(telX: number, telY: number): { x: number; y: number } {
    // 1. Translate to center
    let x = telX + this.tx;
    let y = telY + this.ty;

    // 2. Apply rotation
    const rotX = x * this.cos - y * this.sin;
    const rotY = x * this.sin + y * this.cos;

    // 3. Scale to canvas
    const canvasX = rotX * this.sx + this.canvasWidth / 2;
    const canvasY = rotY * this.sy + this.canvasHeight / 2;

    return { x: canvasX, y: canvasY };
  }
}
```

### 5.4 PixiJS Scene Manager

```typescript
// apps/web/lib/pixi/scene-manager.ts
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { CoordinateMapper } from "./coordinate-mapper";
import { usePositionsStore } from "@pitwall/stores";
import { useStandingsStore } from "@pitwall/stores";
import { lerp } from "@pitwall/utils";
import type { CircuitMapData } from "../track-maps/types";

interface DriverDot {
  graphics: Graphics;
  label: Text;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  teamColor: string;
  driverNumber: number;
}

export class TrackMapScene {
  private app: Application;
  private mapper!: CoordinateMapper;
  private trackLayer!: Container;
  private drsLayer!: Container;
  private driverLayer!: Container;
  private overlayLayer!: Container;
  private driverDots: Map<number, DriverDot> = new Map();
  private lastDataTime = 0;
  private readonly DATA_INTERVAL = 270; // ~3.7Hz = ~270ms between updates

  constructor() {
    this.app = new Application();
  }

  async init(canvas: HTMLCanvasElement, circuit: CircuitMapData): Promise<void> {
    await this.app.init({
      canvas,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.mapper = new CoordinateMapper(circuit, canvas.clientWidth, canvas.clientHeight);

    // Create layers (bottom to top)
    this.trackLayer = new Container();
    this.drsLayer = new Container();
    this.driverLayer = new Container();
    this.overlayLayer = new Container();

    this.app.stage.addChild(this.trackLayer);
    this.app.stage.addChild(this.drsLayer);
    this.app.stage.addChild(this.driverLayer);
    this.app.stage.addChild(this.overlayLayer);

    // Draw static elements
    this.drawTrackOutline(circuit);
    this.drawDrsZones(circuit);
    this.drawSectorBoundaries(circuit);
    this.drawStartFinish(circuit);
    this.drawCornerLabels(circuit);

    // Start render loop
    this.app.ticker.add(() => this.renderLoop());
  }

  private drawTrackOutline(circuit: CircuitMapData): void {
    const g = new Graphics();
    // Parse SVG path and draw — simplified for illustration
    // In production, use a proper SVG path parser
    g.setStrokeStyle({ width: 4, color: 0x333333, cap: "round", join: "round" });
    // Draw the path... (needs SVG path parser)
    this.trackLayer.addChild(g);
  }

  private drawDrsZones(circuit: CircuitMapData): void {
    for (const zone of circuit.drsZones) {
      const g = new Graphics();
      g.setStrokeStyle({ width: 3, color: 0x00ff00, alpha: 0.5 });
      // Draw activation zone path as dashed line
      this.drsLayer.addChild(g);
    }
  }

  private drawSectorBoundaries(circuit: CircuitMapData): void {
    for (const boundary of circuit.sectorBoundaries) {
      const text = new Text({
        text: boundary.label,
        style: new TextStyle({ fill: "#555", fontSize: 9, fontFamily: "monospace" }),
      });
      text.position.set(boundary.position.x, boundary.position.y);
      this.trackLayer.addChild(text);
    }
  }

  private drawStartFinish(circuit: CircuitMapData): void {
    const g = new Graphics();
    const sf = circuit.startFinishLine;
    g.setStrokeStyle({ width: 3, color: 0xffffff });
    g.moveTo(sf.x1, sf.y1);
    g.lineTo(sf.x2, sf.y2);
    this.trackLayer.addChild(g);
  }

  private drawCornerLabels(circuit: CircuitMapData): void {
    for (const corner of circuit.corners) {
      const text = new Text({
        text: `${corner.number}`,
        style: new TextStyle({ fill: "#444", fontSize: 8, fontFamily: "monospace" }),
      });
      text.position.set(corner.position.x, corner.position.y);
      this.trackLayer.addChild(text);
    }
  }

  /**
   * THE CORE RENDER LOOP — runs at 60fps
   * Reads from Zustand store imperatively (NOT React subscription)
   * Interpolates car positions between data updates for smooth movement
   */
  private renderLoop(): void {
    const posState = usePositionsStore.getState();
    const standingsState = useStandingsStore.getState();
    const now = Date.now();

    // If we got new position data, update targets
    if (posState.lastUpdateTime !== this.lastDataTime) {
      this.lastDataTime = posState.lastUpdateTime;

      for (const pos of posState.positions) {
        const canvasPos = this.mapper.telemetryToCanvas(pos.x, pos.y);

        let dot = this.driverDots.get(pos.driverNumber);
        if (!dot) {
          dot = this.createDriverDot(pos.driverNumber, standingsState.standings);
          this.driverDots.set(pos.driverNumber, dot);
        }

        // Move current position to where we were heading
        dot.currentX = dot.graphics.x;
        dot.currentY = dot.graphics.y;
        // Set new target
        dot.targetX = canvasPos.x;
        dot.targetY = canvasPos.y;
      }
    }

    // Interpolate all dots toward their targets
    const elapsed = now - this.lastDataTime;
    const t = Math.min(elapsed / this.DATA_INTERVAL, 1); // 0..1 over DATA_INTERVAL ms

    for (const dot of this.driverDots.values()) {
      dot.graphics.x = lerp(dot.currentX, dot.targetX, t);
      dot.graphics.y = lerp(dot.currentY, dot.targetY, t);
      dot.label.x = dot.graphics.x;
      dot.label.y = dot.graphics.y - 10;
    }
  }

  private createDriverDot(driverNumber: number, standings: any[]): DriverDot {
    const standing = standings.find((s) => s.driverNumber === driverNumber);
    const teamColor = standing?.teamColor || "#888888";
    const colorHex = parseInt(teamColor.replace("#", ""), 16);

    // Circle dot
    const g = new Graphics();
    g.circle(0, 0, 6);
    g.fill({ color: colorHex });
    g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });

    // Driver number label
    const label = new Text({
      text: String(driverNumber),
      style: new TextStyle({
        fill: "#ffffff",
        fontSize: 7,
        fontFamily: "monospace",
        fontWeight: "bold",
      }),
    });
    label.anchor.set(0.5, 1.5);

    // Make dot interactive
    g.eventMode = "static";
    g.cursor = "pointer";
    g.on("pointerover", () => {
      g.scale.set(1.3);
    });
    g.on("pointerout", () => {
      g.scale.set(1.0);
    });
    g.on("pointertap", () => {
      // Open driver focus modal
      const { useUIStore } = require("@pitwall/stores");
      useUIStore.getState().setSelectedDriver(driverNumber);
    });

    this.driverLayer.addChild(g);
    this.driverLayer.addChild(label);

    return {
      graphics: g,
      label,
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      teamColor,
      driverNumber,
    };
  }

  // --- Flag Overlays ---

  showYellowFlag(sector: number): void {
    // Flash yellow overlay on specific track section
    const overlay = new Graphics();
    overlay.rect(0, 0, this.app.canvas.width, this.app.canvas.height);
    overlay.fill({ color: 0xffd700, alpha: 0.08 });
    this.overlayLayer.addChild(overlay);
    // Auto-remove after flag cleared
  }

  showRedFlag(): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, this.app.canvas.width, this.app.canvas.height);
    overlay.fill({ color: 0xff0000, alpha: 0.12 });
    this.overlayLayer.addChild(overlay);
  }

  clearOverlays(): void {
    this.overlayLayer.removeChildren();
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
```

### 5.5 React Component Wrapper

```typescript
// apps/web/components/live/track-map/track-map.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { TrackMapScene } from "@/lib/pixi/scene-manager";
import { useUIStore, useSessionStore } from "@pitwall/stores";
import { subscribeToMap, unsubscribeFromMap } from "@pitwall/socket-client";
import { DriverFocusModal } from "./driver-focus-modal";
import { getCircuitData } from "@/lib/track-maps";

export function TrackMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TrackMapScene | null>(null);
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const selectedDriver = useUIStore((s) => s.selectedDriver);
  const toggleFullscreen = useUIStore((s) => s.toggleFullscreen);
  const circuitName = useSessionStore((s) => s.circuitName);

  useEffect(() => {
    // Subscribe to map data when component mounts
    subscribeToMap();
    return () => unsubscribeFromMap();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !circuitName) return;

    const circuit = getCircuitData(circuitName);
    if (!circuit) return;

    const scene = new TrackMapScene();
    scene.init(canvasRef.current, circuit);
    sceneRef.current = scene;

    // Handle resize
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        scene.resize(width, height);
      }
    });
    observer.observe(canvasRef.current.parentElement!);

    return () => {
      observer.disconnect();
      scene.destroy();
      sceneRef.current = null;
    };
  }, [circuitName]);

  return (
    <div className={`relative h-full ${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 bg-bg-elevated/80 text-text-secondary hover:text-white px-2 py-1 rounded text-xs backdrop-blur-sm"
      >
        {isFullscreen ? "EXIT ✕" : "⛶ FULLSCREEN"}
      </button>

      {/* Driver focus modal */}
      {selectedDriver && (
        <DriverFocusModal driverNumber={selectedDriver} />
      )}
    </div>
  );
}
```

### 5.6 Driver Focus Modal

```typescript
// apps/web/components/live/track-map/driver-focus-modal.tsx
"use client";

import { useStandingsStore, useTelemetryStore, useUIStore } from "@pitwall/stores";
import { subscribeToTelemetry, unsubscribeFromTelemetry } from "@pitwall/socket-client";
import { useEffect } from "react";
import { TIRE_COLORS } from "@pitwall/constants";
import { formatLapTime } from "@pitwall/utils";

interface DriverFocusModalProps {
  driverNumber: number;
}

export function DriverFocusModal({ driverNumber }: DriverFocusModalProps) {
  const standings = useStandingsStore((s) => s.standings);
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const setSelectedDriver = useUIStore((s) => s.setSelectedDriver);

  const driver = standings.find((s) => s.driverNumber === driverNumber);

  useEffect(() => {
    subscribeToTelemetry(driverNumber);
    return () => unsubscribeFromTelemetry();
  }, [driverNumber]);

  if (!driver) return null;

  return (
    <div className="absolute bottom-4 left-4 w-64 bg-bg-surface/95 backdrop-blur-md border border-border-default rounded-lg p-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded" style={{ backgroundColor: driver.teamColor }} />
          <span className="font-display text-sm font-bold">#{driverNumber} {driver.broadcastName}</span>
        </div>
        <button
          onClick={() => setSelectedDriver(null)}
          className="text-text-muted hover:text-white text-xs"
        >
          ✕
        </button>
      </div>

      {/* Telemetry data */}
      <div className="space-y-1.5 font-mono text-xs">
        <TelemetryBar label="SPEED" value={telemetry?.speed ?? 0} max={370} unit="km/h" color="#00ff00" />
        <TelemetryBar label="THROTTLE" value={telemetry?.throttle ?? 0} max={100} unit="%" color="#00ff00" />
        <TelemetryBar label="BRAKE" value={telemetry?.brake ? 100 : 0} max={100} unit="%" color="#ff0000" />

        <div className="flex justify-between">
          <span className="text-text-muted">GEAR</span>
          <span className="font-bold">{telemetry?.gear ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">RPM</span>
          <span>{telemetry?.rpm?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">DRS</span>
          <span className={telemetry?.drs === 2 ? "text-flag-green font-bold" : "text-text-muted"}>
            {telemetry?.drs === 2 ? "🟢 ACTIVE" : telemetry?.drs === 1 ? "AVAILABLE" : "OFF"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">GAP</span>
          <span>{driver.position === 1 ? "LEADER" : driver.gapToLeader}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">TIRE</span>
          <span style={{ color: TIRE_COLORS[driver.compound || "MEDIUM"] }}>
            {driver.compound} ({driver.tyreAge}L)
          </span>
        </div>
      </div>
    </div>
  );
}

function TelemetryBar({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted w-16">{label}</span>
      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-75" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-14 text-right">{Math.round(value)} {unit}</span>
    </div>
  );
}
```

---

## Acceptance Criteria
- [ ] Track outline renders on PixiJS canvas from SVG path data
- [ ] 20 car dots appear colored by team color with driver number labels
- [ ] Cars move smoothly at 60fps via lerp interpolation (no jitter)
- [ ] DRS zones shown as green dashed overlays
- [ ] Sector boundaries labeled
- [ ] Start/finish line visible
- [ ] Corner numbers displayed
- [ ] Hovering a car dot scales it up
- [ ] Clicking a car dot opens Driver Focus Modal
- [ ] Focus Modal shows live speed/throttle/brake bars
- [ ] Fullscreen button expands map to 100vw × 100vh
- [ ] ESC key exits fullscreen
- [ ] Canvas resizes properly on window resize
- [ ] Yellow/Red flag overlays work
- [ ] FPS stays above 55 with all 20 cars animating

## Key Dependencies
```
pixi.js@8
@pitwall/stores @pitwall/utils @pitwall/socket-client
```
