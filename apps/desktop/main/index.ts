import { app, BrowserWindow, shell } from "electron";
import * as path from "path";
import { setupTray } from "./tray";
import { setupShortcuts } from "./shortcuts";
import { setupNotifications } from "./notifications";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "UnderCut F1 Dashboard",
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  // In production we would load a static built HTML or run a local server
  // For dev, load the next.js app
  const url = process.env.NODE_ENV === "production" 
    ? `file://${path.join(__dirname, "../../web/out/index.html")}` 
    : "http://localhost:3000";

  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  setupShortcuts(mainWindow);
}

app.on("ready", () => {
  createWindow();
  setupTray(mainWindow);
  setupNotifications(mainWindow);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
