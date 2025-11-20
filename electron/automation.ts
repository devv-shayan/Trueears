import { clipboard } from 'electron';
import { keyboard, Key } from '@nut-tree-fork/nut-js';

// Optimize keyboard speed
keyboard.config.autoDelayMs = 0;

export async function pasteText(text: string) {
    console.log('Transcription received:', text);
    try {
        console.log('Writing to clipboard...');
        clipboard.writeText(text);

        // Reduced delay for faster pasting
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log('Sending Paste command...');

        // Cross-platform paste using nut.js
        if (process.platform === 'darwin') {
            await keyboard.pressKey(Key.LeftSuper);
            await keyboard.pressKey(Key.V);
            await keyboard.releaseKey(Key.V);
            await keyboard.releaseKey(Key.LeftSuper);
        } else {
            await keyboard.pressKey(Key.LeftControl);
            await keyboard.pressKey(Key.V);
            await keyboard.releaseKey(Key.V);
            await keyboard.releaseKey(Key.LeftControl);
        }

        console.log('Paste command sent');
    } catch (error) {
        console.error('Error pasting text:', error);
        throw error;
    }
}
