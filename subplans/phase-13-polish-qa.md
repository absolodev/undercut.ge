# Phase 13: Polish & QA (Week 14-16)

## Overview
Final polish pass: performance optimization, testing (unit/integration/visual/E2E/load), accessibility audit, error boundaries, loading states, progressive enhancement (HTTP polling fallback), and bundle analysis.

## Prerequisites
- All previous phases complete

## Deliverables
- Vitest unit test suite for stores, utils, formatters
- Playwright E2E tests for key user flows
- Visual regression baselines for timing tower, track map, profiles
- k6 load testing script for 1000+ WebSocket connections
- Error boundaries on all major components
- Loading skeletons for all async content
- HTTP polling fallback if WebSocket fails
- Lighthouse CI configuration
- Bundle size analysis and optimization

---

## Task Breakdown

### 13.1 Performance Profiling

**PixiJS FPS Monitor:**
```typescript
// apps/web/lib/pixi/fps-monitor.ts
export class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;

  tick(): void {
    this.frames++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
      if (this.fps < 55) {
        console.warn(`[PERF] Track map FPS: ${this.fps} (target: 60)`);
      }
    }
  }

  getFPS(): number { return this.fps; }
}
```

**Bundle Analysis:**
```bash
cd apps/web
pnpm add -D @next/bundle-analyzer

# next.config.ts:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
# export default withBundleAnalyzer(nextConfig);

ANALYZE=true pnpm build
```

### 13.2 Vitest Setup

```bash
pnpm add -Dw vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts (root)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

**Unit Tests for Utils:**
```typescript
// packages/utils/src/__tests__/formatters.test.ts
import { describe, it, expect } from "vitest";
import { formatLapTime, formatGap, lerp, getSectorColor } from "../index";

describe("formatLapTime", () => {
  it("formats sub-minute time", () => {
    expect(formatLapTime(83456)).toBe("1:23.456");
  });
  it("formats with minutes", () => {
    expect(formatLapTime(123456)).toBe("2:03.456");
  });
  it("handles null", () => {
    expect(formatLapTime(null)).toBe("—");
  });
});

describe("formatGap", () => {
  it("formats positive gap", () => {
    expect(formatGap(1.234)).toBe("+1.234");
  });
  it("handles string gap", () => {
    expect(formatGap("+1 LAP")).toBe("+1 LAP");
  });
});

describe("lerp", () => {
  it("interpolates at 0", () => expect(lerp(0, 100, 0)).toBe(0));
  it("interpolates at 0.5", () => expect(lerp(0, 100, 0.5)).toBe(50));
  it("interpolates at 1", () => expect(lerp(0, 100, 1)).toBe(100));
  it("clamps above 1", () => expect(lerp(0, 100, 1.5)).toBe(100));
});

describe("getSectorColor", () => {
  it("returns purple for overall best", () => expect(getSectorColor(true, false)).toBe("purple"));
  it("returns green for personal best", () => expect(getSectorColor(false, true)).toBe("green"));
  it("returns yellow otherwise", () => expect(getSectorColor(false, false)).toBe("yellow"));
});
```

**Unit Tests for Stores:**
```typescript
// packages/stores/src/__tests__/standings-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useStandingsStore } from "../standings-store";

describe("useStandingsStore", () => {
  beforeEach(() => {
    useStandingsStore.setState({ standings: [], previousPositions: new Map() });
  });

  it("sets standings", () => {
    const standings = [
      { driverNumber: 1, position: 1, broadcastName: "VER", gapToLeader: "LEADER" },
      { driverNumber: 4, position: 2, broadcastName: "NOR", gapToLeader: "+1.234" },
    ] as any;

    useStandingsStore.getState().setStandings(standings);
    expect(useStandingsStore.getState().standings).toHaveLength(2);
    expect(useStandingsStore.getState().standings[0].broadcastName).toBe("VER");
  });

  it("tracks previous positions on update", () => {
    const initial = [{ driverNumber: 1, position: 1 }] as any;
    const updated = [{ driverNumber: 1, position: 2 }] as any;

    useStandingsStore.getState().setStandings(initial);
    useStandingsStore.getState().setStandings(updated);

    expect(useStandingsStore.getState().previousPositions.get(1)).toBe(1);
  });
});
```

### 13.3 Playwright E2E Tests

```bash
pnpm add -Dw @playwright/test
npx playwright install
```

```typescript
// tests/e2e/live-console.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Live Console", () => {
  test("renders timing tower with 20 rows", async ({ page }) => {
    await page.goto("/f1/live");
    const rows = page.locator("[data-testid='timing-row']");
    await expect(rows).toHaveCount(20);
  });

  test("clicking a driver opens focus modal", async ({ page }) => {
    await page.goto("/f1/live");
    await page.locator("[data-testid='timing-row']").first().click();
    await expect(page.locator("[data-testid='driver-focus-modal']")).toBeVisible();
  });

  test("fullscreen toggle works", async ({ page }) => {
    await page.goto("/f1/live");
    await page.locator("[data-testid='fullscreen-toggle']").click();
    await expect(page.locator("[data-testid='track-map-container']")).toHaveClass(/fixed/);
  });
});

test.describe("Search", () => {
  test("searches for a driver", async ({ page }) => {
    await page.goto("/f1/search");
    await page.fill("[data-testid='search-input']", "Verstappen");
    await expect(page.locator("[data-testid='search-result']").first()).toContainText("Verstappen");
  });
});

test.describe("Driver Profile", () => {
  test("shows career stats", async ({ page }) => {
    await page.goto("/f1/drivers/max_verstappen");
    await expect(page.locator("[data-testid='career-wins']")).toBeVisible();
    await expect(page.locator("[data-testid='season-table']")).toBeVisible();
  });
});
```

### 13.4 Visual Regression Tests

```typescript
// tests/visual/timing-tower.spec.ts
import { test, expect } from "@playwright/test";

test("timing tower screenshot", async ({ page }) => {
  await page.goto("/f1/live");
  await page.waitForSelector("[data-testid='timing-tower']");
  await expect(page.locator("[data-testid='timing-tower']")).toHaveScreenshot("timing-tower.png", {
    maxDiffPixelRatio: 0.01,
  });
});
```

### 13.5 k6 Load Testing

```javascript
// tests/load/websocket-load.js
import ws from "k6/ws";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "1m", target: 500 },
    { duration: "1m", target: 1000 },
    { duration: "30s", target: 0 },
  ],
};

export default function () {
  const url = "ws://localhost:3001/socket.io/?EIO=4&transport=websocket";
  const res = ws.connect(url, {}, function (socket) {
    socket.on("open", () => {
      // Join rooms
      socket.send('42["subscribe:map"]');
    });

    socket.on("message", (data) => {
      // Verify we receive standings data
    });

    socket.setTimeout(() => socket.close(), 60000);
  });

  check(res, { "status is 101": (r) => r && r.status === 101 });
}

// Run: k6 run tests/load/websocket-load.js
```

### 13.6 Error Boundaries

```typescript
// apps/web/components/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-bg-surface rounded border border-border-default p-4">
          <div className="text-center">
            <div className="text-f1-red text-lg mb-1">⚠️</div>
            <div className="text-xs text-text-muted">{this.props.name} failed to load</div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-3 py-1 text-xs bg-bg-elevated rounded hover:bg-f1-red/20"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage: <ErrorBoundary name="Timing Tower"><TimingTower /></ErrorBoundary>
```

### 13.7 Loading Skeletons

```typescript
// apps/web/components/skeletons/timing-tower-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function TimingTowerSkeleton() {
  return (
    <div className="space-y-0.5 p-1">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="flex items-center h-[28px] gap-1 px-1">
          <Skeleton className="w-[30px] h-4" />
          <Skeleton className="w-[4px] h-full" />
          <Skeleton className="w-[50px] h-4" />
          <Skeleton className="w-[70px] h-4" />
          <Skeleton className="w-[60px] h-4" />
          <Skeleton className="w-[80px] h-4" />
        </div>
      ))}
    </div>
  );
}
```

### 13.8 HTTP Polling Fallback

```typescript
// apps/web/lib/polling-fallback.ts
// If WebSocket connection fails after 3 retries, fall back to HTTP polling
// Poll /api/live/standings every 2 seconds
// Poll /api/live/positions every 1 second
// Show degraded mode indicator in header

export function startPollingFallback() {
  console.warn("[WS] Falling back to HTTP polling");

  const pollStandings = setInterval(async () => {
    try {
      const res = await fetch("/api/live/standings");
      const data = await res.json();
      useStandingsStore.getState().setStandings(data);
    } catch {}
  }, 2000);

  const pollPositions = setInterval(async () => {
    try {
      const res = await fetch("/api/live/positions");
      const data = await res.json();
      usePositionsStore.getState().setPositions(data);
    } catch {}
  }, 1000);

  return () => {
    clearInterval(pollStandings);
    clearInterval(pollPositions);
  };
}
```

### 13.9 Performance Targets Checklist

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Track map FPS | ≥ 55 fps | FPSMonitor class + Chrome DevTools Performance |
| Timing tower update | < 16ms render | React DevTools Profiler |
| WebSocket → UI latency | < 100ms | Timestamp comparison in store |
| Initial page load (LCP) | < 2.5s | Lighthouse CI |
| Live console hydration | < 3s | Custom performance mark |
| Bundle size (main) | < 250KB gzipped | @next/bundle-analyzer |
| Memory (live console 30min) | < 200MB | Chrome DevTools Memory tab |
| Redis memory during race | < 256MB | redis-cli INFO memory |

### 13.10 Final QA Checklist

- [ ] All 20+ pages render without errors
- [ ] Dark theme consistent across all pages (no white flashes)
- [ ] Fonts load correctly (Orbitron, Inter, JetBrains Mono)
- [ ] Responsive layout works at 1024px minimum
- [ ] Keyboard navigation works for interactive elements
- [ ] Color contrast meets WCAG AA for all text
- [ ] ARIA labels on all interactive elements
- [ ] Error boundaries catch and display fallbacks
- [ ] Loading skeletons appear during data fetch
- [ ] WebSocket reconnects after network interruption
- [ ] HTTP polling fallback activates if WebSocket fails
- [ ] No memory leaks after 30min on live console
- [ ] Data is accurate (cross-reference with official F1 timing)

---

## Acceptance Criteria
- [ ] `pnpm test` runs all unit tests with >80% coverage on utils/stores
- [ ] `pnpm test:e2e` runs Playwright tests successfully
- [ ] Visual regression screenshots captured as baselines
- [ ] k6 load test sustains 1000 WebSocket connections
- [ ] Lighthouse score >90 for Performance on historical pages
- [ ] Bundle size under 250KB gzipped (main chunk)
- [ ] Error boundaries work on all major panels
- [ ] Loading skeletons appear for all async data
- [ ] HTTP polling fallback activates when WebSocket fails

## Key Dependencies
```
vitest @testing-library/react @testing-library/jest-dom jsdom
@playwright/test
@next/bundle-analyzer
k6 (system install)
```
