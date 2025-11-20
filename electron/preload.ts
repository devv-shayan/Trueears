import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    onToggleRecording: (callback: () => void) => {
        const subscription = (_event: any) => callback();
        ipcRenderer.on('toggle-recording', subscription);
        return () => {
            ipcRenderer.removeListener('toggle-recording', subscription);
        };
    },
    onOpenSettings: (callback: () => void) => {
        const subscription = (_event: any) => callback();
        ipcRenderer.on('open-settings', subscription);
        return () => {
            ipcRenderer.removeListener('open-settings', subscription);
        };
    },
    onShowWarning: (callback: (message: string) => void) => {
        const subscription = (_event: any, message: string) => callback(message);
        ipcRenderer.on('show-warning', subscription);
        return () => {
            ipcRenderer.removeListener('show-warning', subscription);
        };
    },
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
    sendTranscription: (text: string) => ipcRenderer.send('transcription-complete', text),
});
