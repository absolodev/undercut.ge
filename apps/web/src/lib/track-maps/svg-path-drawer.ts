import { Graphics } from "pixi.js";
import type { CircuitMapData } from "./types";

type Point = { x: number; y: number };

function tokenizePath(path: string): string[] {
  const normalized = path.replace(/,/g, " ").trim();
  const tokens: string[] = [];
  let current = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (/[a-zA-Z]/.test(ch)) {
      if (current.trim()) tokens.push(current.trim());
      tokens.push(ch);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function parseNumbers(token: string): number[] {
  return token
    .split(/\s+/)
    .map((n) => parseFloat(n))
    .filter((n) => !Number.isNaN(n));
}

export function computeViewBoxFromPath(path: string): CircuitMapData["viewBox"] {
  const tokens = tokenizePath(path);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let i = 0;
  let cx = 0;
  let cy = 0;

  const track = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    cx = x;
    cy = y;
  };

  while (i < tokens.length) {
    const cmd = tokens[i++];
    const nums = parseNumbers(tokens[i] ?? "");
    if (cmd === "M" || cmd === "L") {
      for (let j = 0; j < nums.length; j += 2) track(nums[j], nums[j + 1]);
      if (cmd === "M" && nums.length >= 2) i++;
    } else if (cmd === "m" || cmd === "l") {
      for (let j = 0; j < nums.length; j += 2) track(cx + nums[j], cy + nums[j + 1]);
    } else if (cmd === "Z" || cmd === "z") {
      // close
    } else if (cmd === "C") {
      for (let j = 0; j < nums.length; j += 6) {
        track(nums[j + 4], nums[j + 5]);
      }
    } else if (nums.length) {
      i--;
    }
    i++;
  }

  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 1000, height: 600 };
  }

  const pad = 80;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

export function createViewBoxTransform(
  viewBox: CircuitMapData["viewBox"],
  canvasWidth: number,
  canvasHeight: number,
  padding = 24
): (x: number, y: number) => Point {
  const availW = canvasWidth - padding * 2;
  const availH = canvasHeight - padding * 2;
  const scale = Math.min(availW / viewBox.width, availH / viewBox.height);

  const offsetX = padding + (availW - viewBox.width * scale) / 2;
  const offsetY = padding + (availH - viewBox.height * scale) / 2;

  return (x: number, y: number) => ({
    x: (x - viewBox.x) * scale + offsetX,
    y: (y - viewBox.y) * scale + offsetY,
  });
}

export function drawSvgPathOnGraphics(
  g: Graphics,
  path: string,
  viewBox: CircuitMapData["viewBox"],
  canvasWidth: number,
  canvasHeight: number,
  options: { color?: number; width?: number; alpha?: number } = {}
): void {
  const toCanvas = createViewBoxTransform(viewBox, canvasWidth, canvasHeight);
  const tokens = tokenizePath(path);
  let i = 0;
  let cx = 0;
  let cy = 0;
  let started = false;

  const move = (x: number, y: number) => {
    const p = toCanvas(x, y);
    g.moveTo(p.x, p.y);
    cx = x;
    cy = y;
    started = true;
  };

  const line = (x: number, y: number) => {
    const p = toCanvas(x, y);
    if (!started) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
    cx = x;
    cy = y;
    started = true;
  };

  while (i < tokens.length) {
    const cmd = tokens[i++];
    const nums = parseNumbers(tokens[i] ?? "");

    switch (cmd) {
      case "M":
        for (let j = 0; j < nums.length; j += 2) move(nums[j], nums[j + 1]);
        break;
      case "m":
        for (let j = 0; j < nums.length; j += 2) move(cx + nums[j], cy + nums[j + 1]);
        break;
      case "L":
        for (let j = 0; j < nums.length; j += 2) line(nums[j], nums[j + 1]);
        break;
      case "l":
        for (let j = 0; j < nums.length; j += 2) line(cx + nums[j], cy + nums[j + 1]);
        break;
      case "C":
        for (let j = 0; j < nums.length; j += 6) line(nums[j + 4], nums[j + 5]);
        break;
      case "Z":
      case "z":
        break;
      default:
        if (nums.length >= 2) line(nums[0], nums[1]);
    }
    i++;
  }

  g.stroke({
    width: options.width ?? 3,
    color: options.color ?? 0xcccccc,
    alpha: options.alpha ?? 1,
    cap: "round",
    join: "round",
  });
}
