import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { CoordinateMapper } from "./coordinate-mapper";
import { usePositionsStore } from "@pitwall/stores";
import { useStandingsStore } from "@pitwall/stores";
import { lerp } from "@pitwall/utils";
import type { CircuitMapData } from "../track-maps/types";
import { useUIStore } from "@pitwall/stores";
import { createViewBoxTransform, drawSvgPathOnGraphics } from "../track-maps/svg-path-drawer";

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
  private circuitData!: CircuitMapData;
  private lastDataTime = 0;
  private readonly DATA_INTERVAL = 270; // ~3.7Hz = ~270ms between updates
  private initialized = false;
  private destroyed = false;
  private readonly onTick = () => this.renderLoop();

  constructor() {
    this.app = new Application();
  }

  async init(canvas: HTMLCanvasElement, circuit: CircuitMapData): Promise<void> {
    if (this.destroyed) return;

    await this.app.init({
      canvas,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed) {
      this.disposeApp();
      return;
    }

    this.circuitData = circuit;
    this.mapper = new CoordinateMapper(circuit, this.app.renderer.width, this.app.renderer.height);

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

    if (this.destroyed) {
      this.disposeApp();
      return;
    }

    // Start render loop
    this.app.ticker.add(this.onTick);
    this.initialized = true;
  }

  private drawTrackOutline(circuit: CircuitMapData): void {
    const g = new Graphics();
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;

    if (circuit.svgPath) {
      drawSvgPathOnGraphics(g, circuit.svgPath, circuit.viewBox, w, h, {
        color: 0xcccccc,
        width: 3,
      });
    }

    this.trackLayer.addChild(g);
  }

  private drawDrsZones(circuit: CircuitMapData): void {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;

    for (const zone of circuit.drsZones) {
      if (!zone.activationPathSegment) continue;
      const g = new Graphics();
      drawSvgPathOnGraphics(g, zone.activationPathSegment, circuit.viewBox, w, h, {
        color: 0x00ff00,
        width: 5,
        alpha: 0.55,
      });
      this.drsLayer.addChild(g);
    }
  }

  private drawSectorBoundaries(circuit: CircuitMapData): void {
    for (const boundary of circuit.sectorBoundaries) {
      const text = new Text({
        text: boundary.label,
        style: new TextStyle({ fill: "#555555", fontSize: 9, fontFamily: "monospace" }),
      });
      text.position.set(boundary.position.x, boundary.position.y);
      this.trackLayer.addChild(text);
    }
  }

  private drawStartFinish(circuit: CircuitMapData): void {
    const g = new Graphics();
    const sf = circuit.startFinishLine;
    g.moveTo(sf.x1, sf.y1);
    g.lineTo(sf.x2, sf.y2);
    g.stroke({ width: 3, color: 0xffffff });
    this.trackLayer.addChild(g);
  }

  private drawCornerLabels(circuit: CircuitMapData): void {
    const toCanvas = createViewBoxTransform(
      circuit.viewBox,
      this.app.renderer.width,
      this.app.renderer.height
    );

    for (const corner of circuit.corners) {
      const p = toCanvas(corner.position.x, corner.position.y);
      const text = new Text({
        text: `${corner.number}`,
        style: new TextStyle({ fill: "#666666", fontSize: 9, fontFamily: "monospace" }),
      });
      text.position.set(p.x, p.y);
      this.trackLayer.addChild(text);
    }
  }

  private renderLoop(): void {
    const posState = usePositionsStore.getState();
    const standingsState = useStandingsStore.getState();
    const now = Date.now();

    if (posState.lastUpdateTime !== this.lastDataTime) {
      this.lastDataTime = posState.lastUpdateTime;

      for (const pos of posState.positions) {
        const canvasPos = this.mapper.telemetryToCanvas(pos.x, pos.y);

        let dot = this.driverDots.get(pos.driverNumber);
        if (!dot) {
          dot = this.createDriverDot(pos.driverNumber, standingsState.standings);
          this.driverDots.set(pos.driverNumber, dot);
        }

        dot.currentX = dot.graphics.x;
        dot.currentY = dot.graphics.y;
        dot.targetX = canvasPos.x;
        dot.targetY = canvasPos.y;
      }
    }

    const elapsed = now - this.lastDataTime;
    const t = Math.min(elapsed / this.DATA_INTERVAL, 1);

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

    const g = new Graphics();
    g.circle(0, 0, 6);
    g.fill({ color: colorHex });
    g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });

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

    g.eventMode = "static";
    g.cursor = "pointer";
    g.on("pointerover", () => {
      g.scale.set(1.3);
    });
    g.on("pointerout", () => {
      g.scale.set(1.0);
    });
    g.on("pointertap", () => {
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

  showYellowFlag(): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, this.app.renderer.width, this.app.renderer.height);
    overlay.fill({ color: 0xffd700, alpha: 0.08 });
    this.overlayLayer.addChild(overlay);
  }

  showRedFlag(): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, this.app.renderer.width, this.app.renderer.height);
    overlay.fill({ color: 0xff0000, alpha: 0.12 });
    this.overlayLayer.addChild(overlay);
  }

  clearOverlays(): void {
    this.overlayLayer.removeChildren();
  }

  resize(width: number, height: number): void {
    if (!this.initialized || !this.app.renderer) return;
    this.app.renderer.resize(width, height);
    this.mapper = new CoordinateMapper(this.circuitData, width, height);

    this.trackLayer.removeChildren();
    this.drsLayer.removeChildren();
    this.drawTrackOutline(this.circuitData);
    this.drawDrsZones(this.circuitData);
    this.drawSectorBoundaries(this.circuitData);
    this.drawStartFinish(this.circuitData);
    this.drawCornerLabels(this.circuitData);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.disposeApp();
  }

  private disposeApp(): void {
    if (!this.initialized || !this.app.renderer) return;

    this.app.ticker.remove(this.onTick);
    this.app.ticker.stop();
    this.driverDots.clear();
    this.overlayLayer?.removeChildren();

    try {
      this.app.destroy(true, { children: true });
    } catch (error) {
      console.warn("[TrackMapScene] Pixi destroy failed:", error);
    } finally {
      this.initialized = false;
    }
  }
}
