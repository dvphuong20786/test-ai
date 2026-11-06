const { contextBridge, ipcRenderer, webUtils } = require("electron") as typeof import("electron");

contextBridge.exposeInMainWorld("vietvoiceDesktop", {
  selectVideo: (): Promise<string | null> => ipcRenderer.invoke("video:select"),
  confirmProjectReplacement: (): Promise<"SAVE" | "DISCARD" | "CANCEL"> => ipcRenderer.invoke("project:confirm-replace"),
  getDroppedFilePath: (file: File): string => webUtils.getPathForFile(file),
  showOutputFile: (outputPath: string): Promise<void> => ipcRenderer.invoke("file:show-output", outputPath)
});
