import { app, Tray, Menu, BrowserWindow } from "electron";
import * as path from "path";

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow | null) {
  // In a real app we'd need a proper icon file (e.g. tray-icon.png)
  // We'll use a placeholder path for now
  const iconPath = path.join(__dirname, "../../assets/tray-icon.png");
  
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    // Fallback if icon doesn't exist
    console.warn("Tray icon missing, using native empty image");
    // Just mock for this phase since we don't have an icon yet
  }

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => mainWindow?.show()
      },
      {
        label: "Always on Top",
        type: "checkbox",
        checked: mainWindow?.isAlwaysOnTop() || false,
        click: (menuItem) => {
          mainWindow?.setAlwaysOnTop(menuItem.checked);
        }
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit()
      }
    ]);

    tray.setToolTip("UnderCut F1 Dashboard");
    tray.setContextMenu(contextMenu);
  }
}
