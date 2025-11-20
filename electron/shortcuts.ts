import { globalShortcut } from 'electron';
import { getActiveWindow } from '@nut-tree-fork/nut-js';
import { getMainWindow } from './windowManager';

export function registerShortcuts() {
    // Register a 'CommandOrControl+Shift+K' shortcut listener.
    const ret = globalShortcut.register('CommandOrControl+Shift+K', async () => {
        console.log('CommandOrControl+Shift+K is pressed');
        const mainWindow = getMainWindow();
        if (mainWindow) {
            try {
                const win = await getActiveWindow();
                const title = await win.title;
                console.log('Active window:', title);
                
                if (!title || title === 'Program Manager' || title === 'Windows Default Lock Screen') {
                     mainWindow.setAlwaysOnTop(true, 'screen-saver');
                     mainWindow.webContents.send('show-warning', 'Please select a text box first');
                     mainWindow.showInactive();
                     return;
                }
            } catch (e) {
                console.error('Error checking active window:', e);
            }

            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.webContents.send('toggle-recording');
            mainWindow.showInactive();
        }
    });

    // Register a 'CommandOrControl+Shift+L' shortcut listener for Settings.
    const retSettings = globalShortcut.register('CommandOrControl+Shift+L', () => {
        console.log('CommandOrControl+Shift+L is pressed');
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.webContents.send('open-settings');
            mainWindow.showInactive();
        }
    });

    if (!ret) {
        console.log('registration failed');
    }

    console.log('Shortcut registered:', globalShortcut.isRegistered('CommandOrControl+Shift+K'));
}

export function unregisterShortcuts() {
    globalShortcut.unregisterAll();
}
