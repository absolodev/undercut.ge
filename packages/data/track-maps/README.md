# F1 Track Maps

Circuit outline data for UnderCut track map rendering.

## Source

- **Repository:** [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits)
- **License:** [MIT](https://github.com/bacinger/f1-circuits/blob/master/LICENSE.md)
- **Data:** `f1-circuits.geojson` — LineString geometries for 40 Formula 1 circuits
- **Interactive map:** https://svemir.co/f1/

GeoJSON lon/lat coordinates are projected to a normalized 1000×1000 canvas space (equirectangular with latitude correction) and converted to SVG path strings.

## Files

| File | Purpose |
|------|---------|
| `source/f1-circuits.geojson` | Upstream GeoJSON (do not edit) |
| `circuit-ref-map.json` | bacinger id → Jolpica `circuit_ref` |
| `circuits/*.json` | Per-circuit map data |
| `tracks.json` | All circuits keyed by `circuit_ref` |
| `manifest.json` | circuit_ref → display name |
| `generate.mjs` | Regenerate JSON from GeoJSON |

## Regenerating

```bash
# Refresh upstream data
curl -sL -o packages/data/track-maps/source/f1-circuits.geojson \
  https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson

node packages/data/track-maps/generate.mjs
```
