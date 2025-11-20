import { app, BrowserWindow, ipcMain } from 'electron';
import { createWindow, getMainWindow } from './windowManager';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { pasteText } from './automation';

app.whenReady().then(() => {
    createWindow();
    registerShortcuts();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    unregisterShortcuts();
});

// IPC Handlers
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
});

ipcMain.on('transcription-complete', async (event, text) => {
    try {
        await pasteText(text);
        // Hide the window after pasting
        setTimeout(() => {
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.hide();
        }, 500);
    } catch (error) {
        console.error('Error in transcription-complete handler:', error);
    }
});
