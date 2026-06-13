export interface CircuitMapData {
  id: string;                    // 'silverstone'
  name: string;                  // 'Silverstone Circuit'
  svgPath: string;               // SVG path d attribute for track outline
  pitLanePath?: string;          // SVG path for pit lane
  viewBox: { x: number; y: number; width: number; height: number };

  /** Optional OpenF1 telemetry bounds for driver dot positioning */
  telemetryBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  
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
    number: number | string;
    name?: string;               // "Copse", "Maggots"
    position: { x: number; y: number };
  }>;

  startFinishLine: { x1: number; y1: number; x2: number; y2: number };
}
