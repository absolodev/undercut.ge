import { Notification, BrowserWindow, ipcMain } from "electron";

export function setupNotifications(mainWindow: BrowserWindow | null) {
  ipcMain.on("notify", (_, data: { title: string; body: string; urgency?: string }) => {
    if (!Notification.isSupported()) return;
    
    const notification = new Notification({
      title: data.title,
      body: data.body,
      urgency: data.urgency as any || "normal",
      silent: false,
    });
    
    notification.show();
    
    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });
}
