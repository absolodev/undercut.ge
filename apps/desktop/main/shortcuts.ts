import { globalShortcut, BrowserWindow } from "electron";

export function setupShortcuts(mainWindow: BrowserWindow | null) {
  // Fullscreen toggle
  globalShortcut.register("CommandOrControl+F", () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // We could add more global shortcuts here, but Cmd+K should be handled by the web app itself
  // unless we want it to work even when the app is minimized, which we probably don't.
}

// Ensure shortcuts are unregistered on app quit
import { app } from "electron";
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
