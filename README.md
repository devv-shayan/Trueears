# Voice Dictation

A minimalist, AI-powered voice dictation application built with Electron, React, and Vite. This tool allows you to record your voice using a global hotkey and automatically pastes the transcribed text into your active application using Groq's Whisper models.

## Features

- 🎙️ **Global Hotkey**: Press `Ctrl+Shift+K` (or `Cmd+Shift+K` on macOS) to toggle recording from anywhere.
- 🤖 **AI Transcription**: Uses Groq's Whisper Large V3 Turbo for fast and accurate speech-to-text.
- 📋 **Auto-Paste**: Automatically types the transcribed text into the currently active text field.
- 🪟 **Minimalist Overlay**: A non-intrusive floating overlay shows recording status and audio visualization.
- ⚡ **Fast & Lightweight**: Built on Vite and Electron for performance.

## Prerequisites

- Node.js (v18 or higher recommended)
- A Groq API Key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd STT
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. **API Key Setup**:
   - When you first launch the application and press the hotkey (`Ctrl+Shift+K`), you will be prompted to enter your **Groq API Key**.
   - The key is saved locally for future use.

## Development

To run the application in development mode with hot-reloading:

```bash
npm run electron:dev
```

This will start the Vite dev server and launch the Electron application.

## Building

To build the application for production:

```bash
npm run electron:build
```

The output executable will be generated in the `dist` or `release` folder (depending on electron-builder configuration).

## Usage

1. Launch the application. It will start in the background.
2. Place your cursor in any text field (e.g., Notepad, Browser, IDE).
3. Press **`Ctrl+Shift+K`** (Windows/Linux) or **`Cmd+Shift+K`** (macOS).
4. If it's your first time, enter your Groq API key in the overlay input field and press Enter.
5. Speak your text.
6. Press the hotkey again to stop recording.
7. The text will be transcribed and automatically pasted into your active window.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend/Shell**: Electron
- **AI Services**: Groq SDK
- **Audio**: Native Web Audio API

## License

MIT
