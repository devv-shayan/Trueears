import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { GroqService } from '../services/groqService';

// Declare electronAPI for TypeScript visibility
declare global {
  interface Window {
    electronAPI?: {
      onToggleRecording: (callback: () => void) => () => void;
      sendTranscription: (text: string) => void;
    };
  }
}

// ... (rest of file)

// -- Listeners: Electron IPC & Keyboard Shortcuts --
// ... (rest of file)

// -- Listeners: Electron IPC & Keyboard Shortcuts --
// (Moved back inside component)

// Synthesize a pleasant "ding" sound using Web Audio API
const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // A clean sine wave at 880Hz (High A) creates a bell-like tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    // ADSR Envelope: Fast attack, slow exponential decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0); // Decay

    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.0);
  } catch (error) {
    // Ignore audio errors
  }
};

export const RecorderOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  // States: 
  // 'idle': Extension hidden or ready
  // 'setup': Asking for API Key
  // 'recording': Microphone active
  // 'processing': Sending file to Groq
  // 'success': Text pasted
  // 'error': Something went wrong
  const [status, setStatus] = useState<'idle' | 'setup' | 'recording' | 'processing' | 'success' | 'error'>('idle');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Storage handling
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);

  const [tempKeyInput, setTempKeyInput] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);

  // -- Load API Key (LocalStorage) --
  useEffect(() => {
    const loadKey = () => {
      const key = localStorage.getItem('GROQ_API_KEY');
      if (key) setApiKey(key);
      setIsKeyLoaded(true);
    };
    loadKey();
  }, []);

  // -- Action: Save API Key --
  const handleSaveKey = () => {
    if (tempKeyInput.trim().startsWith('gsk_')) {
      const key = tempKeyInput.trim();
      setApiKey(key);
      localStorage.setItem('GROQ_API_KEY', key);

      setStatus('idle');
      // Immediately start recording after save using the new key explicitly
      setTimeout(() => startRecording(key), 100);
    } else {
      alert('Invalid Groq API Key. It usually starts with "gsk_"');
    }
  };

  // -- Action: Start Recording --
  const startRecording = async (manualKey?: string) => {
    const effectiveKey = manualKey || apiKey;

    // If no API key, force setup mode
    if (!effectiveKey) {
      setStatus('setup');
      setIsVisible(true); // Ensure visible for setup
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setStatus('recording');
      setIsVisible(true); // Ensure visible when recording starts
      isProcessingRef.current = false;
      audioChunksRef.current = [];

      // Use MediaRecorder for standard webm capture
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
    } catch (err) {
      console.error("Microphone error:", err);
      setStatus('error');
      setTimeout(() => setIsVisible(false), 2000);
    }
  };

  // -- Action: Stop Recording & Transcribe --
  const stopRecording = useCallback(async () => {
    if (status !== 'recording') return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const recorder = mediaRecorderRef.current;
    const stream = mediaStream;

    // Create a promise that resolves when the recorder actually stops and flushing data
    const stopPromise = new Promise<Blob>((resolve) => {
      if (!recorder) {
        resolve(new Blob([]));
        return;
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(audioBlob);
      };
      recorder.stop();
    });

    // Stop the visualizer/mic tracks immediately
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setMediaStream(null); // Unmount visualizer immediately

    setStatus('processing'); // Transition to processing (will show pulsing dot)

    try {
      const audioBlob = await stopPromise;

      if (audioBlob.size === 0) {
        throw new Error("No audio captured");
      }

      // Send to Groq
      const text = await GroqService.transcribe(audioBlob, apiKey);

      if (text) {
        // Send to Electron Main Process
        if (window.electronAPI) {
          window.electronAPI.sendTranscription(text);
        } else {
          console.warn("Electron API not available, cannot type text:", text);
          // Fallback for browser testing? Alert?
          // alert("Transcription: " + text);
        }

        playSuccessSound(); // Ring the bell!
        setStatus('success');
        setTimeout(() => {
          setIsVisible(false);
          setStatus('idle');
          isProcessingRef.current = false;
        }, 1500);
      } else {
        // Empty response
        setIsVisible(false);
        setStatus('idle');
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Transcription failed", error);
      setStatus('error');
      setTimeout(() => {
        setIsVisible(false);
        setStatus('idle');
        isProcessingRef.current = false;
      }, 2000);
    }
  }, [status, mediaStream, apiKey]);

  const lastToggleTimeRef = useRef(0);

  // -- Trigger: Toggle Visibility --
  const handleToggle = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 500) {
      return; // Ignore rapid toggles (debounce)
    }
    lastToggleTimeRef.current = now;

    if (!isKeyLoaded) return; // Wait for storage check

    if (status === 'recording') {
      stopRecording();
    } else if (status === 'setup') {
      // Close if toggled while in setup
      setIsVisible(false);
      setStatus('idle');
    } else {
      // Start Recording
      startRecording();
    }
  }, [status, stopRecording, apiKey, isKeyLoaded]);

  // -- Listeners: Electron IPC & Keyboard Shortcuts --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // DISABLED: We're using global shortcut (Ctrl+Shift+K) instead
      // if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      //   e.preventDefault();
      //   handleToggle();
      // }
      if (e.key === 'Escape' && isVisible) {
        if (status === 'recording') stopRecording();
        else setIsVisible(false);
      }
      if (status === 'setup' && e.key === 'Enter' && isVisible) {
        handleSaveKey();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Electron IPC Listener
    let removeIpcListener: (() => void) | undefined;
    if (window.electronAPI) {
      removeIpcListener = window.electronAPI.onToggleRecording(() => {
        handleToggle();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (removeIpcListener) removeIpcListener();
    };
  }, [handleToggle, isVisible, stopRecording, status, tempKeyInput]);

  if (!isVisible) return null;

  return (
    <div className="fixed z-[9999] bottom-10 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end">
      {/* 
        Capsule Container
      */}
      <div
        className={`
          pointer-events-auto
          flex items-center justify-center
          bg-[#0a0a0a] 
          border border-white/10 
          shadow-[0_8px_32px_rgba(0,0,0,0.5)]
          backdrop-blur-xl
          rounded-full
          transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1)
          will-change-[width, height, transform]
          overflow-hidden
          ${status === 'setup' ? 'w-80 h-12 rounded-xl' : ''}
          ${status === 'recording' ? 'w-40 h-9' : ''}
          ${(status === 'idle' || status === 'processing' || status === 'success' || status === 'error') ? 'w-9 h-9' : ''}
        `}
      >
        <div className="relative w-full h-full flex items-center justify-center">

          {/* SETUP MODE: Input Field */}
          {status === 'setup' && (
            <div className="flex items-center w-full px-3 gap-2 animate-fadeIn">
              <input
                autoFocus
                type="password"
                placeholder="Enter Groq API Key (gsk_...)"
                className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-gray-500 font-mono"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
              />
              <button
                onClick={handleSaveKey}
                className="text-[10px] bg-white text-black font-bold px-2 py-1 rounded hover:bg-gray-200 transition-colors"
              >
                SAVE
              </button>
            </div>
          )}

          {/* RECORDING MODE: Visualizer */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${status === 'recording' && mediaStream ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Visualizer logic remains same */}
            {status === 'recording' && mediaStream && <AudioVisualizer stream={mediaStream} isRecording={true} />}
          </div>

          {/* STATUS ICONS */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${status !== 'recording' && status !== 'setup' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
          >
            {status === 'success' ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'error' ? (
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Idle or Processing (Subtle pulse if processing)
              <div className={`w-1.5 h-1.5 rounded-full ${status === 'processing' ? 'bg-white/60 animate-pulse' : 'bg-white/20'}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};