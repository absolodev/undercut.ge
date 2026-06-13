import { contextBridge, ipcRenderer } from "electron";

// Expose safe APIs to the web app
contextBridge.exposeInMainWorld("electronAPI", {
  // We can add specific IPC calls here if the web app needs to talk to the main process
  // e.g. for native notifications
  onMessage: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
});
