/**
 * Verifies bundled track maps have valid SVG paths and viewBoxes.
 * Run: node apps/web/scripts/verify-track-maps.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tracksPath = join(__dirname, "../../../packages/data/track-maps/tracks.json");
const tracks = JSON.parse(readFileSync(tracksPath, "utf8"));

const REQUIRED = ["silverstone", "monaco", "monza", "spa"];

function parsePathBounds(path) {
  const nums = path.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

let ok = true;

for (const ref of REQUIRED) {
  const t = tracks[ref];
  if (!t) {
    console.error(`FAIL: missing ${ref}`);
    ok = false;
    continue;
  }
  if (!t.svgPath?.startsWith("M ")) {
    console.error(`FAIL: ${ref} invalid svgPath`);
    ok = false;
    continue;
  }
  const bounds = parsePathBounds(t.svgPath);
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const aspect = spanX / spanY;
  if (spanX < 100 || spanY < 100) {
    console.error(`FAIL: ${ref} track too small (${spanX.toFixed(0)} x ${spanY.toFixed(0)})`);
    ok = false;
    continue;
  }
  console.log(
    `OK: ${ref} (${t.name}) — ${spanX.toFixed(0)}x${spanY.toFixed(0)}px, aspect ${aspect.toFixed(2)}, viewBox ${t.viewBox.width.toFixed(0)}x${t.viewBox.height.toFixed(0)}`
  );
}

console.log(`\nTotal circuits: ${Object.keys(tracks).length}`);
process.exit(ok ? 0 : 1);
