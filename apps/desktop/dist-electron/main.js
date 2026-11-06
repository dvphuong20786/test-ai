import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 1440,
        height: 920,
        minWidth: 1100,
        minHeight: 720,
        webPreferences: {
            // Preload dùng CommonJS vì Electron nạp script sandbox theo định dạng này.
            preload: path.join(currentDirectory, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });
    if (app.isPackaged) {
        void mainWindow.loadFile(path.join(currentDirectory, "../dist/index.html"));
    }
    else {
        void mainWindow.loadURL("http://localhost:5173");
    }
}
ipcMain.handle("video:select", async (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow)
        throw new Error("Không xác định được cửa sổ đang yêu cầu chọn video.");
    const selectedFile = await dialog.showOpenDialog(senderWindow, {
        title: "Chọn video có phụ đề tiếng Trung",
        properties: ["openFile"],
        filters: [{ name: "Video", extensions: ["mp4", "mkv", "mov", "webm"] }]
    });
    return selectedFile.canceled ? null : selectedFile.filePaths[0];
});
ipcMain.handle("project:confirm-replace", async (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow)
        throw new Error("Không xác định được cửa sổ dự án hiện tại.");
    const result = await dialog.showMessageBox(senderWindow, {
        type: "warning",
        title: "Dự án có thay đổi chưa lưu",
        message: "Bạn muốn xử lý thay đổi hiện tại thế nào trước khi mở video khác?",
        detail: "Lưu sẽ giữ các chỉnh sửa trong dự án hiện tại. Bỏ thay đổi chỉ bỏ phần chưa lưu; dữ liệu đã lưu trước đó không bị xóa.",
        buttons: ["Lưu rồi mở video khác", "Bỏ thay đổi", "Hủy"],
        defaultId: 0,
        cancelId: 2,
        noLink: true
    });
    return ["SAVE", "DISCARD", "CANCEL"][result.response];
});
ipcMain.handle("file:show-output", (_event, outputPath) => {
    shell.showItemInFolder(outputPath);
});
app.whenReady().then(() => {
    createMainWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createMainWindow();
    });
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
