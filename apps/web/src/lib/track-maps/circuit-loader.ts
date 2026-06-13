import { prisma } from "@pitwall/db";
import type { CircuitMapData } from "./types";
import { computeViewBoxFromPath } from "./svg-path-drawer";
import { getCircuitData } from "./index";

interface DbTransform {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

function parseCorners(raw: unknown): CircuitMapData["corners"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: Record<string, unknown>) => ({
    number: (c.number ?? c.num ?? "?") as number | string,
    name: c.name as string | undefined,
    position: (c.position as { x: number; y: number }) ?? { x: 0, y: 0 },
  }));
}

function parseDrsZones(raw: unknown): CircuitMapData["drsZones"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((z: Record<string, unknown>) => ({
    detectionPathSegment: String(z.detectionPathSegment ?? z.detection_path ?? ""),
    activationPathSegment: String(z.activationPathSegment ?? z.activation_path ?? ""),
  }));
}

function mergeDbExtras(
  base: CircuitMapData,
  circuit: {
    name: string;
    transform_data: unknown;
    corner_data: unknown;
    drs_zones: unknown;
  }
): CircuitMapData {
  const transformRaw = (circuit.transform_data ?? {}) as DbTransform;
  const corners = parseCorners(circuit.corner_data);
  const drsZones = parseDrsZones(circuit.drs_zones);

  return {
    ...base,
    name: circuit.name || base.name,
    transform: {
      translateX: transformRaw.translateX ?? base.transform.translateX,
      translateY: transformRaw.translateY ?? base.transform.translateY,
      scaleX: transformRaw.scaleX ?? base.transform.scaleX,
      scaleY: transformRaw.scaleY ?? base.transform.scaleY,
      rotation: transformRaw.rotation ?? base.transform.rotation,
    },
    corners: corners.length ? corners : base.corners,
    drsZones: drsZones.length ? drsZones : base.drsZones,
  };
}

export function circuitRecordToMapData(circuit: {
  circuit_ref: string;
  name: string;
  map_svg_path: string | null;
  transform_data: unknown;
  corner_data: unknown;
  drs_zones: unknown;
}): CircuitMapData | null {
  const bundled = getCircuitData(circuit.circuit_ref);
  if (bundled) {
    return mergeDbExtras(bundled, circuit);
  }

  if (!circuit.map_svg_path) return null;

  const transformRaw = (circuit.transform_data ?? {}) as DbTransform;
  const viewBox = computeViewBoxFromPath(circuit.map_svg_path);

  return {
    id: circuit.circuit_ref,
    name: circuit.name,
    svgPath: circuit.map_svg_path,
    viewBox,
    transform: {
      translateX: transformRaw.translateX ?? 0,
      translateY: transformRaw.translateY ?? 0,
      scaleX: transformRaw.scaleX ?? 1,
      scaleY: transformRaw.scaleY ?? 1,
      rotation: transformRaw.rotation ?? 0,
    },
    drsZones: parseDrsZones(circuit.drs_zones),
    sectorBoundaries: [],
    corners: parseCorners(circuit.corner_data),
    startFinishLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
  };
}

export async function getCircuitMapData(circuitRef: string): Promise<CircuitMapData | undefined> {
  const bundled = getCircuitData(circuitRef);
  if (bundled) {
    const circuit = await prisma.f1_circuits.findUnique({
      where: { circuit_ref: circuitRef.toLowerCase() },
      select: {
        name: true,
        transform_data: true,
        corner_data: true,
        drs_zones: true,
      },
    });
    if (circuit) {
      return mergeDbExtras(bundled, circuit);
    }
    return bundled;
  }

  const circuit = await prisma.f1_circuits.findUnique({
    where: { circuit_ref: circuitRef.toLowerCase() },
    select: {
      circuit_ref: true,
      name: true,
      map_svg_path: true,
      transform_data: true,
      corner_data: true,
      drs_zones: true,
    },
  });

  if (!circuit) return undefined;
  return circuitRecordToMapData(circuit) ?? undefined;
}
