import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    onToggleRecording: (callback: () => void) => {
        const subscription = (_event: any) => callback();
        ipcRenderer.on('toggle-recording', subscription);
        return () => {
            ipcRenderer.removeListener('toggle-recording', subscription);
        };
    },
    sendTranscription: (text: string) => ipcRenderer.send('transcription-complete', text),
});
