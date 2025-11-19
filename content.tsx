import React from 'react';
import ReactDOM from 'react-dom/client';
import { RecorderOverlay } from './components/RecorderOverlay';

// Fix: Declare chrome to avoid TypeScript errors
declare const chrome: any;

// 1. Create a container for our extension
const rootId = 'groq-recorder-extension-root';
let container = document.getElementById(rootId);

if (!container) {
  container = document.createElement('div');
  container.id = rootId;
  // Position it fixed so it doesn't affect layout, though ShadowDOM handles style isolation
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '2147483647'; // Max Z-Index
  container.style.pointerEvents = 'none'; // Let clicks pass through when not active
  document.body.appendChild(container);

  // 2. Create Shadow DOM to isolate our CSS from the website's CSS
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // 3. Inject Styles
  // Note: In a real build, your bundler (Vite/Webpack) will generate a CSS file.
  // We need to link that CSS file inside the Shadow DOM.
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  try {
    // chrome.runtime is only available in the actual extension environment
    styleLink.href = chrome.runtime.getURL('assets/style.css');
  } catch (e) {
    console.warn("Running in dev mode: Styles might not load in ShadowDOM without chrome.runtime");
  }
  shadowRoot.appendChild(styleLink);

  // 4. Mount React
  const root = ReactDOM.createRoot(shadowRoot);
  root.render(
    <React.StrictMode>
      {/* We wrap in a div that resets pointer-events for the specific overlay elements */}
      <div className="pointer-events-auto">
        <RecorderOverlay />
      </div>
    </React.StrictMode>
  );
}