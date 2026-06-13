/**
 * Generates normalized track map JSON from bacinger/f1-circuits GeoJSON.
 * Source: https://github.com/bacinger/f1-circuits (MIT License)
 * Run: node packages/data/track-maps/generate.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** bacinger GeoJSON feature id → Jolpica/Ergast circuit_ref */
const BACINGER_TO_CIRCUIT_REF = {
  "au-1953": "albert_park",
  "az-2016": "baku",
  "es-1991": "catalunya",
  "ar-1952": "galvez",
  "hu-1986": "hungaroring",
  "us-1956": "watkins_glen",
  "pt-1972": "estoril",
  "de-1932": "hockenheimring",
  "it-1953": "imola",
  "us-1909": "indianapolis",
  "tr-2005": "istanbul",
  "br-1977": "jacarepagua",
  "sa-2021": "jeddah",
  "za-1961": "kyalami",
  "us-2023": "vegas",
  "fr-1969": "ricard",
  "qa-2004": "losail",
  "es-2026": "madring",
  "fr-1960": "magny_cours",
  "mx-1962": "rodriguez",
  "us-2022": "miami",
  "mc-1929": "monaco",
  "ca-1978": "villeneuve",
  "it-1922": "monza",
  "de-1927": "nurburgring",
  "pt-2008": "portimao",
  "bh-2002": "bahrain",
  "br-1940": "interlagos",
  "it-1914": "mugello",
  "my-1999": "sepang",
  "cn-2004": "shanghai",
  "gb-1948": "silverstone",
  "sg-2008": "marina_bay",
  "ru-2014": "sochi",
  "be-1925": "spa",
  "at-1969": "red_bull_ring",
  "jp-1962": "suzuka",
  "ae-2009": "yas_marina",
  "nl-1948": "zandvoort",
  "us-2012": "americas",
};

const CANVAS_SIZE = 1000;
const PADDING = 50;

function geojsonToTrackMap(feature, circuitRef) {
  const coords = feature.geometry.coordinates;
  const name = feature.properties?.name ?? circuitRef;

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const centerLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  const projW = (maxLon - minLon) * cosLat;
  const projH = maxLat - minLat;
  const scale = (CANVAS_SIZE - PADDING * 2) / Math.max(projW, projH);

  const points = coords.map(([lon, lat]) => ({
    x: (lon - minLon) * cosLat * scale + PADDING,
    y: (maxLat - lat) * scale + PADDING,
  }));

  const svgPath =
    `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} ` +
    points
      .slice(1)
      .map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ") +
    " Z";

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = 20;
  const viewBox = {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    width: Math.max(...xs) - Math.min(...xs) + pad * 2,
    height: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };

  return {
    id: circuitRef,
    name,
    bacingerId: feature.properties?.id,
    svgPath,
    viewBox,
    transform: {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    drsZones: [],
    sectorBoundaries: [],
    corners: [],
    startFinishLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
  };
}

function main() {
  const geojsonPath = join(__dirname, "source", "f1-circuits.geojson");
  if (!existsSync(geojsonPath)) {
    console.error("Missing source/f1-circuits.geojson — download from bacinger/f1-circuits");
    process.exit(1);
  }

  const geojson = JSON.parse(readFileSync(geojsonPath, "utf8"));
  const circuitsDir = join(__dirname, "circuits");
  mkdirSync(circuitsDir, { recursive: true });

  const manifest = {};
  let count = 0;

  for (const feature of geojson.features) {
    const bacingerId = feature.properties?.id;
    const circuitRef = BACINGER_TO_CIRCUIT_REF[bacingerId];
    if (!circuitRef) {
      console.warn(`No circuit_ref mapping for ${bacingerId}`);
      continue;
    }

    const trackMap = geojsonToTrackMap(feature, circuitRef);
    writeFileSync(join(circuitsDir, `${circuitRef}.json`), JSON.stringify(trackMap, null, 2));
    manifest[circuitRef] = trackMap.name;
    count++;
    console.log(`  ${circuitRef} (${trackMap.name}) — ${feature.geometry.coordinates.length} pts`);
  }

  writeFileSync(join(__dirname, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(__dirname, "circuit-ref-map.json"),
    JSON.stringify(BACINGER_TO_CIRCUIT_REF, null, 2)
  );
  console.log(`\nGenerated ${count} circuit maps.`);
}

main();
