"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    onToggleRecording: (callback) => {
        const subscription = (_event) => callback();
        electron_1.ipcRenderer.on('toggle-recording', subscription);
        return () => {
            electron_1.ipcRenderer.removeListener('toggle-recording', subscription);
        };
    },
    sendTranscription: (text) => electron_1.ipcRenderer.send('transcription-complete', text),
});
//# sourceMappingURL=preload.js.map