# Phase 12: Cross-Platform Packaging (Week 12-14)

## Overview
Package the web app for desktop (Electron) and mobile (Expo/React Native). Desktop adds always-on-top, system tray, and native notifications. Mobile provides a responsive track map and timing tower.

## Prerequisites
- Phase 1-11 (Full web app working)

## Deliverables
- `apps/desktop/` — Electron wrapper with native features
- `apps/mobile/` — Expo project with React Native components
- Build configs for `.dmg`, `.exe`, `.AppImage`

---

## Task Breakdown

### 12.1 Electron Setup

```bash
cd apps/desktop
pnpm init
pnpm add electron electron-builder
pnpm add -D concurrently wait-on
```

**Directory structure:**
```
apps/desktop/
├── main/
│   ├── index.ts           # Main process entry
│   ├── window.ts          # Window management
│   ├── tray.ts            # System tray
│   ├── notifications.ts   # Native OS notifications
│   └── shortcuts.ts       # Global keyboard shortcuts
├── preload/
│   └── preload.ts         # Preload script
├── electron-builder.yml   # Build configuration
├── package.json
└── tsconfig.json
```

### 12.2 Main Process

```typescript
// apps/desktop/main/index.ts
import { app, BrowserWindow, globalShortcut } from "electron";
import { createTray } from "./tray";
import { registerShortcuts } from "./shortcuts";
import { setupNotifications } from "./notifications";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: "#000000",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: __dirname + "/../preload/preload.js",
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the Next.js app
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile("out/index.html"); // Static export
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray(mainWindow!);
  registerShortcuts(mainWindow!);
  setupNotifications(mainWindow!);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
```

### 12.3 System Tray

```typescript
// apps/desktop/main/tray.ts
import { Tray, Menu, BrowserWindow, nativeImage } from "electron";
import path from "path";

export function createTray(mainWindow: BrowserWindow) {
  const icon = nativeImage.createFromPath(path.join(__dirname, "../../assets/tray-icon.png"));
  const tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: "🟢 GREEN — LAP 34/57", enabled: false },
    { type: "separator" },
    { label: "Always on Top", type: "checkbox", checked: false, click: (item) => {
      mainWindow.setAlwaysOnTop(item.checked);
    }},
    { label: "Show PitWall", click: () => mainWindow.show() },
    { type: "separator" },
    { label: "Quit", click: () => { mainWindow.close(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip("PitWall — F1 Command Center");

  // Update tray tooltip with live status
  // This would be connected to a Socket.io listener in the main process
}
```

### 12.4 Native Notifications

```typescript
// apps/desktop/main/notifications.ts
import { Notification, BrowserWindow } from "electron";

export function setupNotifications(mainWindow: BrowserWindow) {
  // Listen for notification events from renderer
  const { ipcMain } = require("electron");

  ipcMain.on("notify", (_, data: { title: string; body: string; urgency?: string }) => {
    const notification = new Notification({
      title: data.title,
      body: data.body,
      urgency: data.urgency as any || "normal",
      silent: false,
    });
    notification.show();
    notification.on("click", () => {
      mainWindow.show();
      mainWindow.focus();
    });
  });
}

// Triggered from renderer on events like:
// - Safety Car deployed
// - Red Flag
// - Penalty for favorite driver
// - Race start
```

### 12.5 Global Keyboard Shortcuts

```typescript
// apps/desktop/main/shortcuts.ts
import { globalShortcut, BrowserWindow } from "electron";

export function registerShortcuts(mainWindow: BrowserWindow) {
  // Cmd+F / Ctrl+F = Toggle fullscreen track map
  globalShortcut.register("CommandOrControl+F", () => {
    mainWindow.webContents.send("toggle-fullscreen");
  });

  // Cmd+K / Ctrl+K = Open command palette
  globalShortcut.register("CommandOrControl+K", () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("open-command-palette");
  });

  // Cmd+T / Ctrl+T = Always on top toggle
  globalShortcut.register("CommandOrControl+T", () => {
    const isOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isOnTop);
  });
}
```

### 12.6 Electron Builder Config

```yaml
# apps/desktop/electron-builder.yml
appId: com.pitwall.app
productName: PitWall
directories:
  buildResources: assets
  output: dist

mac:
  category: public.app-category.sports
  icon: assets/icon.icns
  target:
    - dmg
    - zip

win:
  target:
    - nsis
    - portable
  icon: assets/icon.ico

linux:
  target:
    - AppImage
    - deb
  category: Sports

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

### 12.7 Expo Mobile App

```bash
cd apps/mobile
npx -y create-expo-app@latest ./ --template blank-typescript
pnpm add expo-router react-native-reanimated
pnpm add socket.io-client zustand
pnpm add @shopify/react-native-skia  # For track map rendering
```

### 12.8 Mobile App Structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx            # Root layout with tabs
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Tab navigator
│   │   ├── live.tsx           # Live console (simplified)
│   │   ├── standings.tsx      # Current standings
│   │   ├── calendar.tsx       # Race calendar
│   │   └── more.tsx           # Drivers, circuits, settings
│   ├── driver/[id].tsx        # Driver profile
│   └── race/[id].tsx          # Race details
├── components/
│   ├── MobileTimingTower.tsx   # Simplified timing tower (fewer columns)
│   ├── MobileTrackMap.tsx      # react-native-skia based track map
│   ├── RaceControlList.tsx     # FlatList of race control messages
│   └── StandingsTable.tsx      # Championship standings table
├── app.json
└── package.json
```

### 12.9 Mobile Track Map (react-native-skia)

```typescript
// apps/mobile/components/MobileTrackMap.tsx
import { Canvas, Path, Circle, Text as SkiaText } from "@shopify/react-native-skia";
import { usePositionsStore } from "@pitwall/stores";

export function MobileTrackMap({ circuitPath, width, height }: any) {
  const positions = usePositionsStore((s) => s.positions);

  return (
    <Canvas style={{ width, height }}>
      {/* Track outline */}
      <Path path={circuitPath} color="#333" style="stroke" strokeWidth={3} />

      {/* Driver dots */}
      {positions.map((pos) => (
        <Circle
          key={pos.driverNumber}
          cx={pos.x} // Pre-mapped to canvas coords
          cy={pos.y}
          r={6}
          color="#E10600"
        />
      ))}
    </Canvas>
  );
}
```

### 12.10 Mobile Timing Tower (Simplified)

```typescript
// apps/mobile/components/MobileTimingTower.tsx
// Simplified to 6 columns for mobile: POS, DRV, GAP, LAST, TIRE, PIT
// Swipe left/right to see additional columns
// Pull-to-refresh gesture
// FlatList for performance with 20 items
```

---

## Acceptance Criteria
- [ ] Electron app launches and loads Next.js app
- [ ] Always-on-top toggle works from tray menu
- [ ] System tray shows with context menu
- [ ] Native OS notifications fire for SC/Red Flag events
- [ ] Global shortcuts work (Cmd+F, Cmd+K, Cmd+T)
- [ ] Electron builds produce .dmg (Mac), .exe (Win), .AppImage (Linux)
- [ ] Expo app runs in iOS/Android simulator
- [ ] Mobile timing tower renders with correct data
- [ ] Mobile track map renders via react-native-skia
- [ ] Socket.io connection works from React Native

## Key Dependencies
```
# Desktop
electron electron-builder concurrently wait-on

# Mobile
expo expo-router react-native-reanimated
@shopify/react-native-skia
socket.io-client zustand
```
