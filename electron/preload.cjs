/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kasaDesktop", {
  collapseOverlay: () => ipcRenderer.invoke("desktop:collapse-overlay"),
  collapseSetup: () => ipcRenderer.invoke("desktop:collapse-setup"),
  closeWindow: () => ipcRenderer.invoke("desktop:close-window"),
  endOverlay: () => ipcRenderer.invoke("desktop:end-overlay"),
  expandOverlay: (payload) => ipcRenderer.invoke("desktop:expand-overlay", payload),
  expandSetup: () => ipcRenderer.invoke("desktop:expand-setup"),
  getPlatform: () => ipcRenderer.invoke("desktop:get-platform"),
  getScreenSnapshot: () => ipcRenderer.invoke("desktop:get-screen-snapshot"),
  minimizeWindow: () => ipcRenderer.invoke("desktop:minimize-window"),
  onSession: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop:session", listener);
    return () => ipcRenderer.removeListener("desktop:session", listener);
  },
  openOverlay: (payload) => ipcRenderer.invoke("desktop:open-overlay", payload),
  openLogin: () => ipcRenderer.invoke("desktop:open-login"),
  resizeOverlay: (payload) => ipcRenderer.invoke("desktop:resize-overlay", payload),
  setOverlayMode: (mode) => ipcRenderer.invoke("desktop:set-overlay-mode", mode),
  setOpacity: (opacity) => ipcRenderer.invoke("desktop:set-opacity", opacity),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("desktop:toggle-always-on-top"),
});
