"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer, webUtils } = require("electron");
contextBridge.exposeInMainWorld("vietvoiceDesktop", {
    selectVideo: () => ipcRenderer.invoke("video:select"),
    confirmProjectReplacement: () => ipcRenderer.invoke("project:confirm-replace"),
    getDroppedFilePath: (file) => webUtils.getPathForFile(file),
    showOutputFile: (outputPath) => ipcRenderer.invoke("file:show-output", outputPath)
});
