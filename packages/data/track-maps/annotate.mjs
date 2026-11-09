/**
 * Marks straight-mode (2026 overtake) zones and corner apexes on bundled circuit polylines.
 * Zones are the longest low-curvature stretches, counted to match the 2026 FIA straight-mode
 * allocation where that is published. Detection ticks sit at the start of each zone.
 *
 * Run: node packages/data/track-maps/annotate.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 2026 straight-mode zone counts. Unlisted circuits fall back to their long straights, max 3. */
const STRAIGHT_MODE_ZONES = {
  albert_park: 5,
  shanghai: 4,
  suzuka: 2,
  miami: 3,
  villeneuve: 3,
  monaco: 0,
  catalunya: 4,
  red_bull_ring: 4,
  silverstone: 4,
  spa: 5,
  hungaroring: 4,
  zandvoort: 2,
  monza: 4,
  madring: 2,
  baku: 2,
  sepang: 4,
  americas: 2,
  rodriguez: 3,
  interlagos: 2,
  vegas: 2,
  losail: 2,
  yas_marina: 2,
  jeddah: 3,
  bahrain: 4,
  marina_bay: 5,
};

function parsePoints(svgPath) {
  const re = /[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
  const points = [];
  let match;
  while ((match = re.exec(svgPath))) {
    points.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  if (points.length > 2) {
    const a = points[0];
    const b = points[points.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1.5) points.pop();
  }
  return points;
}

function metrics(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const close = Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
  return { cum, total: cum[cum.length - 1] + close };
}

function wrap(dist, total) {
  return ((dist % total) + total) % total;
}

function pointAt(points, cum, total, dist) {
  const d = wrap(dist, total);
  const n = points.length;
  if (d >= cum[n - 1]) {
    const seg = total - cum[n - 1];
    const t = seg === 0 ? 0 : (d - cum[n - 1]) / seg;
    const a = points[n - 1];
    const b = points[0];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  const seg = cum[lo + 1] - cum[lo];
  const t = seg === 0 ? 0 : (d - cum[lo]) / seg;
  const a = points[lo];
  const b = points[lo + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function headingAt(points, cum, total, dist, window) {
  const a = pointAt(points, cum, total, dist - window);
  const b = pointAt(points, cum, total, dist + window);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function straightLength(straight, total) {
  return straight.end >= straight.start ? straight.end - straight.start : total - straight.start + straight.end;
}

function along(straight, total, fraction) {
  const len = straightLength(straight, total);
  return wrap(straight.start + fraction * len, total);
}

function findStraights(points, cum, total) {
  const step = total * 0.004;
  const window = total * 0.012;
  const samples = [];
  for (let d = 0; d < total; d += step) {
    const turn = Math.abs(
      angleDiff(
        headingAt(points, cum, total, d + window, window * 0.5),
        headingAt(points, cum, total, d - window, window * 0.5)
      )
    );
    samples.push({ d, straight: turn < 0.16 });
  }
  if (!samples.length) return [];

  const groups = [];
  let current = null;
  for (const sample of samples) {
    if (sample.straight) {
      if (!current) current = { start: sample.d, end: sample.d };
      current.end = sample.d;
    } else if (current) {
      groups.push(current);
      current = null;
    }
  }
  if (current) groups.push(current);

  if (groups.length > 1 && samples[0].straight && samples[samples.length - 1].straight) {
    const first = groups[0];
    const last = groups[groups.length - 1];
    groups[0] = { start: last.start, end: first.end };
    groups.pop();
  }

  return groups
    .map((group) => ({ ...group, length: straightLength(group, total) }))
    .filter((group) => group.length >= total * 0.02)
    .sort((a, b) => b.length - a.length);
}

function selectStraights(straights, total, wanted) {
  if (wanted <= 0) return [];
  for (const fraction of [0.05, 0.035, 0.025, 0.02]) {
    const eligible = straights.filter((straight) => straight.length >= total * fraction);
    if (eligible.length >= wanted) return eligible.slice(0, wanted);
  }
  return straights.slice(0, wanted);
}

function findCorners(points, cum, total, startDist) {
  const step = total * 0.003;
  const window = total * 0.008;
  const samples = [];
  for (let d = 0; d < total; d += step) {
    const turn = Math.abs(
      angleDiff(
        headingAt(points, cum, total, d + window, window),
        headingAt(points, cum, total, d - window, window)
      )
    );
    samples.push({ d, turn });
  }

  const minGap = total * 0.028;
  const peaks = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const turn = samples[i].turn;
    if (turn < 0.42) continue;
    if (turn < samples[i - 1].turn || turn < samples[i + 1].turn) continue;
    const prev = peaks[peaks.length - 1];
    if (prev && Math.min(Math.abs(samples[i].d - prev.d), total - Math.abs(samples[i].d - prev.d)) < minGap) {
      if (turn > prev.turn) peaks[peaks.length - 1] = samples[i];
      continue;
    }
    peaks.push(samples[i]);
  }

  peaks.sort((a, b) => {
    const da = wrap(a.d - startDist, total);
    const db = wrap(b.d - startDist, total);
    return da - db;
  });

  const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  centroid.x /= points.length;
  centroid.y /= points.length;
  const labelDist = Math.min(
    ...points.map((p) => Math.hypot(p.x - centroid.x, p.y - centroid.y))
  );
  const offset = Math.max(14, Math.min(28, labelDist * 0.08));

  return peaks.slice(0, 20).map((peak, index) => {
    const p = pointAt(points, cum, total, peak.d);
    const h = headingAt(points, cum, total, peak.d, window);
    let nx = -Math.sin(h);
    let ny = Math.cos(h);
    const outward = (p.x - centroid.x) * nx + (p.y - centroid.y) * ny;
    if (outward < 0) {
      nx = -nx;
      ny = -ny;
    }
    return {
      number: index + 1,
      position: {
        x: Number((p.x + nx * offset).toFixed(2)),
        y: Number((p.y + ny * offset).toFixed(2)),
      },
    };
  });
}

function pathBetween(points, cum, total, start, end) {
  const step = Math.max(total * 0.0025, 1.2);
  const pts = [];
  const push = (d) => pts.push(pointAt(points, cum, total, d));
  if (end >= start) {
    for (let d = start; d < end; d += step) push(d);
    push(end);
  } else {
    for (let d = start; d < total; d += step) push(d);
    for (let d = 0; d < end; d += step) push(d);
    push(end);
  }
  if (pts.length < 2) return "";
  return (
    `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} ` +
    pts
      .slice(1)
      .map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ")
  );
}

function tick(points, cum, total, dist, half) {
  const p = pointAt(points, cum, total, dist);
  const h = headingAt(points, cum, total, dist, total * 0.006);
  const nx = -Math.sin(h);
  const ny = Math.cos(h);
  return {
    x1: p.x + nx * half,
    y1: p.y + ny * half,
    x2: p.x - nx * half,
    y2: p.y - ny * half,
  };
}

function linePath(line) {
  return `M ${line.x1.toFixed(2)},${line.y1.toFixed(2)} L ${line.x2.toFixed(2)},${line.y2.toFixed(2)}`;
}

function boundsViewBox(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 36;
  return {
    x: Number((minX - pad).toFixed(2)),
    y: Number((minY - pad).toFixed(2)),
    width: Number((maxX - minX + pad * 2).toFixed(2)),
    height: Number((maxY - minY + pad * 2).toFixed(2)),
  };
}

export function annotateTrack(track) {
  const points = parsePoints(track.svgPath);
  if (points.length < 8) return track;
  const { cum, total } = metrics(points);
  const straights = findStraights(points, cum, total);
  const wanted = STRAIGHT_MODE_ZONES[track.id] ?? Math.min(3, straights.length);
  const chosen = selectStraights(straights, total, wanted);
  const longest = straights[0];
  const halfTick = Math.max(10, Math.min(track.viewBox.width, track.viewBox.height) * 0.018);

  const startDist = longest ? along(longest, total, 0.08) : 0;
  const startLine = tick(points, cum, total, startDist, halfTick * 1.35);

  const zones = chosen
    .map((straight) => ({ straight, order: along(straight, total, 0.5) }))
    .sort((a, b) => wrap(a.order - startDist, total) - wrap(b.order - startDist, total))
    .map((entry, index) => {
      const activationStart = along(entry.straight, total, 0.22);
      const activationEnd = along(entry.straight, total, 0.9);
      const detection = tick(points, cum, total, along(entry.straight, total, 0.14), halfTick);
      return {
        label: String(index + 1),
        detectionPathSegment: linePath(detection),
        activationPathSegment: pathBetween(points, cum, total, activationStart, activationEnd),
      };
    });

  const corners = findCorners(points, cum, total, startDist);

  return {
    ...track,
    viewBox: boundsViewBox([
      ...points,
      ...corners.map((c) => c.position),
      { x: startLine.x1, y: startLine.y1 },
      { x: startLine.x2, y: startLine.y2 },
    ]),
    drsZones: zones,
    corners,
    startFinishLine: {
      x1: Number(startLine.x1.toFixed(2)),
      y1: Number(startLine.y1.toFixed(2)),
      x2: Number(startLine.x2.toFixed(2)),
      y2: Number(startLine.y2.toFixed(2)),
    },
  };
}

export function annotateAll() {
  const circuitsDir = join(__dirname, "circuits");
  const files = readdirSync(circuitsDir).filter((name) => name.endsWith(".json"));
  const tracks = {};
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(circuitsDir, file), "utf8"));
    const annotated = annotateTrack(raw);
    writeFileSync(join(circuitsDir, file), JSON.stringify(annotated, null, 2));
    tracks[annotated.id] = annotated;
    const pct = annotated.drsZones.length;
    console.log(`  ${annotated.id}: ${pct} straight-mode zones, ${annotated.corners.length} corners`);
  }
  writeFileSync(join(__dirname, "tracks.json"), JSON.stringify(tracks));
  console.log(`Annotated ${files.length} circuits.`);
  return tracks;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  annotateAll();
}
