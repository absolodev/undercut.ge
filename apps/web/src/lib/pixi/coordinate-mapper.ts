import type { CircuitMapData } from "../track-maps/types";
import { createViewBoxTransform } from "../track-maps/svg-path-drawer";

const DEFAULT_TELEMETRY_BOUNDS = { minX: -2500, maxX: 2500, minY: -2500, maxY: 2500 };

export class CoordinateMapper {
  private tx: number;
  private ty: number;
  private sx: number;
  private sy: number;
  private cos: number;
  private sin: number;
  private useViewBoxMapping: boolean;

  constructor(
    private circuit: CircuitMapData,
    private canvasWidth: number,
    private canvasHeight: number
  ) {
    const { translateX, translateY, scaleX, scaleY, rotation } = circuit.transform;
    this.tx = translateX;
    this.ty = translateY;
    this.sx = scaleX;
    this.sy = scaleY;
    const rad = (rotation * Math.PI) / 180;
    this.cos = Math.cos(rad);
    this.sin = Math.sin(rad);
    this.useViewBoxMapping = Math.abs(scaleX) <= 1.1 && Math.abs(scaleY) <= 1.1;
  }

  /**
   * Convert telemetry coordinates (from OpenF1 /location endpoint)
   * to canvas pixel coordinates.
   *
   * Telemetry X/Y are in 1/10th meter coordinates from a track-specific reference point.
   * Bundled GeoJSON maps use normalized viewBox coords (scale 1) — telemetry is mapped
   * into viewBox space via telemetryBounds before canvas projection.
   */
  telemetryToCanvas(telX: number, telY: number): { x: number; y: number } {
    if (this.useViewBoxMapping) {
      const bounds = this.circuit.telemetryBounds ?? DEFAULT_TELEMETRY_BOUNDS;
      const { viewBox } = this.circuit;
      const nx =
        viewBox.x + ((telX - bounds.minX) / (bounds.maxX - bounds.minX)) * viewBox.width;
      const ny =
        viewBox.y + ((bounds.maxY - telY) / (bounds.maxY - bounds.minY)) * viewBox.height;
      const toCanvas = createViewBoxTransform(viewBox, this.canvasWidth, this.canvasHeight);
      return toCanvas(nx, ny);
    }

    let x = telX + this.tx;
    let y = telY + this.ty;

    const rotX = x * this.cos - y * this.sin;
    const rotY = x * this.sin + y * this.cos;

    const canvasX = rotX * this.sx + this.canvasWidth / 2;
    const canvasY = rotY * this.sy + this.canvasHeight / 2;

    return { x: canvasX, y: canvasY };
  }
}
