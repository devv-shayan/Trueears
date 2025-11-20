# Voice Dictation

A minimalist, AI-powered voice dictation application built with Electron, React, and Vite. This tool allows you to record your voice using a global hotkey and automatically pastes the transcribed text into your active application using **Groq's Whisper models** or **Google's Gemini models**.

## Features

- 🎙️ **Global Hotkey**: Press `Ctrl+Shift+K` (or `Cmd+Shift+K` on macOS) to toggle recording from anywhere.
- ⚙️ **Quick Settings**: Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on macOS) to open the settings panel.
- 🤖 **Multi-Provider Support**: Choose between Groq (Whisper Large V3 Turbo) for speed or Google Gemini (Flash 1.5/2.0) for advanced reasoning and transcription.
- 📋 **Auto-Paste**: Automatically types the transcribed text into the currently active text field.
- 🪟 **Minimalist Overlay**: A non-intrusive floating overlay shows recording status and audio visualization.
- ⚡ **Fast & Lightweight**: Built on Vite and Electron for performance.

## Prerequisites

- Node.js (v18 or higher recommended)
- A **Groq API Key** or a **Google Gemini API Key**

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

1. **First Launch**:
   - When you first launch the application, you can open settings with `Ctrl+Shift+L` or by clicking the settings icon.
   - Select your preferred provider (**Groq** or **Gemini**).
   - Enter your API Key for the selected provider.
   - Choose your desired model.
   - The settings are saved locally for future use.

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
3. Press **`Ctrl+Shift+K`** (Windows/Linux) or **`Cmd+Shift+K`** (macOS) to start recording.
4. Speak your text.
5. Press the hotkey again to stop recording.
6. The text will be transcribed and automatically pasted into your active window.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend/Shell**: Electron
- **AI Services**: 
  - Groq API (REST)
  - Google Gemini SDK (`@google/genai`)
- **Audio**: Native Web Audio API
- **Automation**: Nut.js (for auto-typing)

## Project Structure

```
STT/
├── electron/           # Electron main process code
│   ├── main.ts         # Main entry point & window management
│   ├── preload.ts      # IPC bridge between Main and Renderer
│   ├── automation.ts   # Keyboard automation (Nut.js) logic
│   └── shortcuts.ts    # Global hotkey registration
├── src/                # React renderer process code
│   ├── components/     # UI Components (Overlay, Settings, etc.)
│   ├── hooks/          # Custom hooks (useAudioRecorder, useDictation)
│   ├── services/       # AI Service integrations (Groq, Gemini)
│   ├── utils/          # Audio processing and helpers
│   └── App.tsx         # Main application component
├── dist-electron/      # Compiled Electron files (generated)
├── public/             # Static assets
├── index.html          # Entry HTML file
├── package.json        # Project dependencies and scripts
└── vite.config.ts      # Vite configuration
```

## License

MIT
