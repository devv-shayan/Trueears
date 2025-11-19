"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const nut_js_1 = require("@nut-tree-fork/nut-js");
let mainWindow = null;
function createWindow() {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = 400;
    const windowHeight = 200;
    mainWindow = new electron_1.BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: Math.round((width - windowWidth) / 2),
        y: Math.round(height - windowHeight - 20),
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        type: 'toolbar', // Helps with staying on top on some systems
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: false, // Start hidden
    });
    // Set to highest possible level to stay above everything
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    // Ensure it shows over fullscreen apps and on all virtual desktops
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadURL('http://localhost:3000');
    }
    // Start hidden - don't show until shortcut is pressed
}
electron_1.app.whenReady().then(() => {
    createWindow();
    // Register a 'CommandOrControl+Shift+K' shortcut listener.
    const ret = electron_1.globalShortcut.register('CommandOrControl+Shift+K', () => {
        console.log('CommandOrControl+Shift+K is pressed');
        if (mainWindow) {
            // Re-assert always on top status before showing
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.webContents.send('toggle-recording');
            // Show window WITHOUT stealing focus
            mainWindow.showInactive();
        }
    });
    if (!ret) {
        console.log('registration failed');
    }
    console.log(electron_1.globalShortcut.isRegistered('CommandOrControl+Shift+K'));
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
});
// IPC Handlers
electron_1.ipcMain.on('transcription-complete', (event, text) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Transcription received:', text);
    try {
        console.log('Writing to clipboard...');
        electron_1.clipboard.writeText(text);
        // Just wait a moment before pasting
        yield new Promise(resolve => setTimeout(resolve, 300));
        console.log('Sending Paste command...');
        // Cross-platform paste using nut.js
        if (process.platform === 'darwin') {
            yield nut_js_1.keyboard.pressKey(nut_js_1.Key.LeftSuper);
            yield nut_js_1.keyboard.pressKey(nut_js_1.Key.V);
            yield nut_js_1.keyboard.releaseKey(nut_js_1.Key.V);
            yield nut_js_1.keyboard.releaseKey(nut_js_1.Key.LeftSuper);
        }
        else {
            yield nut_js_1.keyboard.pressKey(nut_js_1.Key.LeftControl);
            yield nut_js_1.keyboard.pressKey(nut_js_1.Key.V);
            yield nut_js_1.keyboard.releaseKey(nut_js_1.Key.V);
            yield nut_js_1.keyboard.releaseKey(nut_js_1.Key.LeftControl);
        }
        console.log('Paste command sent');
        // Hide the window after pasting
        setTimeout(() => {
            if (mainWindow)
                mainWindow.hide();
        }, 500);
    }
    catch (error) {
        console.error('Error pasting text:', error);
    }
}));
//# sourceMappingURL=main.js.map