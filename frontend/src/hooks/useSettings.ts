import { useSyncExternalStore } from 'react';
import { DEFAULT_LLM_MODEL, DEFAULT_SYSTEM_PROMPT } from '../types/appProfile';
import { tauriAPI } from '../utils/tauriApi';
import { debug } from '../utils/debug';

export const DEFAULT_GROQ_MODEL = 'whisper-large-v3-turbo';

export const GROQ_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3',
  'distil-whisper-large-v3-en',
];

export const LLM_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

type Theme = 'light' | 'dark';
type RecordingMode = 'auto' | 'toggle' | 'push-to-talk';

type SettingsState = {
  apiKey: string;
  model: string;
  isKeyLoaded: boolean;
  llmEnabled: boolean;
  llmApiKey: string;
  llmModel: string;
  defaultSystemPrompt: string;
  language: string;
  autoDetectLanguage: boolean;
  onboardingComplete: boolean;
  theme: Theme;
  recordingMode: RecordingMode;
  microphoneId: string;
};

const LEGACY_SETTINGS_SCHEMA_VERSION_KEY = 'Trueears_SETTINGS_SCHEMA_VERSION';
const LEGACY_SETTINGS_SCHEMA_VERSION = '1';

const LEGACY_STORAGE_KEYS = {
  groqModel: 'GROQ_MODEL',
  llmEnabled: 'Trueears_LLM_ENABLED',
  llmApiKey: 'Trueears_LLM_API_KEY',
  llmModel: 'Trueears_LLM_MODEL',
  defaultSystemPrompt: 'Trueears_DEFAULT_SYSTEM_PROMPT',
  language: 'Trueears_LANGUAGE',
  autoDetectLanguage: 'Trueears_AUTO_DETECT_LANGUAGE',
  microphoneId: 'Trueears_MICROPHONE_ID',
} as const;

const defaultSettingsState: SettingsState = {
  apiKey: '',
  model: DEFAULT_GROQ_MODEL,
  isKeyLoaded: false,
  llmEnabled: false,
  llmApiKey: '',
  llmModel: DEFAULT_LLM_MODEL,
  defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
  language: 'en',
  autoDetectLanguage: false,
  onboardingComplete: false,
  theme: 'light',
  recordingMode: 'auto',
  microphoneId: 'default',
};

let settingsState: SettingsState = defaultSettingsState;
const subscribers = new Set<() => void>();
let initializePromise: Promise<void> | null = null;
let settingsChangedUnlisten: (() => void) | null = null;

const emitSettingsChange = (): void => {
  for (const subscriber of subscribers) {
    subscriber();
  }
};

const setSettingsState = (nextState: Partial<SettingsState>): void => {
  settingsState = {
    ...settingsState,
    ...nextState,
  };
  emitSettingsChange();
};

const applyTheme = (theme: Theme): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

const readLegacyStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLegacyStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore browser storage failures
  }
};

const parseTheme = (value: string | null): Theme => {
  return value === 'dark' || value === 'light' ? value : 'light';
};

const parseRecordingMode = (value: string | null): RecordingMode => {
  return value === 'toggle' || value === 'push-to-talk' || value === 'auto'
    ? value
    : 'auto';
};

const loadSettingsState = async (): Promise<void> => {
  const snapshot = await tauriAPI.getSettingsSnapshot();

  let groqKey = snapshot?.groqApiKey ?? null;
  let groqModel = snapshot?.groqModel ?? null;
  let savedLlmEnabled = snapshot?.llmEnabled ?? null;
  let savedLlmApiKey = snapshot?.llmApiKey ?? null;
  let savedLlmModel = snapshot?.llmModel ?? null;
  let savedSystemPrompt = snapshot?.defaultSystemPrompt ?? null;
  const savedOnboardingComplete = snapshot?.onboardingComplete ?? null;
  const savedTheme = snapshot?.theme ?? null;
  let savedLanguage = snapshot?.language ?? null;
  let savedAutoDetect = snapshot?.autoDetectLanguage ?? null;
  let savedRecordingMode = snapshot?.recordingMode ?? null;
  let savedMicId = snapshot?.microphoneId ?? null;

  debug.log('[useSettings] loadSettingsState - store values:', {
    groqKey,
    groqModel,
    savedLlmEnabled,
    savedLlmApiKey,
    savedLlmModel,
    savedSystemPrompt,
  });

  if (groqKey === null) {
    groqKey = '';
  }

  const pendingWrites: Array<Promise<void>> = [];

  if (groqModel === null) {
    groqModel = readLegacyStorage(LEGACY_STORAGE_KEYS.groqModel) || DEFAULT_GROQ_MODEL;
    pendingWrites.push(tauriAPI.setStoreValue('GROQ_MODEL', groqModel));
  }
  if (savedLlmEnabled === null) {
    savedLlmEnabled = readLegacyStorage(LEGACY_STORAGE_KEYS.llmEnabled) || 'false';
    pendingWrites.push(tauriAPI.setStoreValue('Trueears_LLM_ENABLED', savedLlmEnabled));
  }
  if (savedLlmApiKey === null) {
    savedLlmApiKey = readLegacyStorage(LEGACY_STORAGE_KEYS.llmApiKey) || groqKey || '';
    pendingWrites.push(tauriAPI.setStoreValue('Trueears_LLM_API_KEY', savedLlmApiKey));
  }
  if (savedLlmModel === null) {
    savedLlmModel = readLegacyStorage(LEGACY_STORAGE_KEYS.llmModel) || DEFAULT_LLM_MODEL;
    pendingWrites.push(tauriAPI.setStoreValue('Trueears_LLM_MODEL', savedLlmModel));
  }
  if (savedSystemPrompt === null) {
    savedSystemPrompt =
      readLegacyStorage(LEGACY_STORAGE_KEYS.defaultSystemPrompt) || DEFAULT_SYSTEM_PROMPT;
    pendingWrites.push(
      tauriAPI.setStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT', savedSystemPrompt)
    );
  }
  if (savedLanguage === null) {
    savedLanguage = readLegacyStorage(LEGACY_STORAGE_KEYS.language) || 'en';
    pendingWrites.push(tauriAPI.setStoreValue('Trueears_LANGUAGE', savedLanguage));
  }
  if (savedAutoDetect === null) {
    savedAutoDetect = readLegacyStorage(LEGACY_STORAGE_KEYS.autoDetectLanguage) || 'false';
    pendingWrites.push(
      tauriAPI.setStoreValue('Trueears_AUTO_DETECT_LANGUAGE', savedAutoDetect)
    );
  }
  if (savedRecordingMode === null) {
    savedRecordingMode = 'auto';
    pendingWrites.push(
      tauriAPI.setStoreValue('Trueears_RECORDING_MODE', savedRecordingMode)
    );
  }
  if (savedMicId === null) {
    savedMicId = readLegacyStorage(LEGACY_STORAGE_KEYS.microphoneId) || 'default';
    pendingWrites.push(tauriAPI.setStoreValue('Trueears_MICROPHONE_ID', savedMicId));
  }

  if (pendingWrites.length > 0) {
    await Promise.all(pendingWrites);
    writeLegacyStorage(
      LEGACY_SETTINGS_SCHEMA_VERSION_KEY,
      LEGACY_SETTINGS_SCHEMA_VERSION
    );
  }

  const nextTheme = parseTheme(savedTheme);
  applyTheme(nextTheme);

  settingsState = {
    apiKey: groqKey || '',
    model: groqModel || DEFAULT_GROQ_MODEL,
    isKeyLoaded: true,
    llmEnabled: savedLlmEnabled === 'true',
    llmApiKey: savedLlmApiKey || groqKey || '',
    llmModel: savedLlmModel || DEFAULT_LLM_MODEL,
    defaultSystemPrompt: savedSystemPrompt || DEFAULT_SYSTEM_PROMPT,
    language: savedLanguage || 'en',
    autoDetectLanguage: savedAutoDetect === 'true',
    onboardingComplete: savedOnboardingComplete === 'true',
    theme: nextTheme,
    recordingMode: parseRecordingMode(savedRecordingMode),
    microphoneId: savedMicId || 'default',
  };

  emitSettingsChange();
};

const initializeSettingsStore = async (): Promise<void> => {
  try {
    await loadSettingsState();
  } catch (error) {
    console.error('[useSettings] Failed to initialize settings store:', error);
    setSettingsState({ isKeyLoaded: true });
    return;
  }

  if (!settingsChangedUnlisten) {
    settingsChangedUnlisten = await tauriAPI.onSettingsChanged(() => {
      debug.log('[useSettings] settings-changed event received, reloading keys');
      void loadSettingsState().catch((error) => {
        console.error('[useSettings] Failed to reload settings state:', error);
      });
    });
  }
};

const ensureSettingsStoreInitialized = (): Promise<void> => {
  if (!initializePromise) {
    initializePromise = initializeSettingsStore();
  }
  return initializePromise;
};

const subscribe = (callback: () => void): (() => void) => {
  subscribers.add(callback);
  void ensureSettingsStoreInitialized();
  return () => {
    subscribers.delete(callback);
  };
};

const getSnapshot = (): SettingsState => settingsState;

const settingsActions = {
  saveApiKey: async (key: string): Promise<void> => {
    setSettingsState({ apiKey: key });
    await tauriAPI.setStoreValue('GROQ_API_KEY', key);
  },
  saveGroqModel: async (model: string): Promise<void> => {
    setSettingsState({ model });
    await tauriAPI.setStoreValue('GROQ_MODEL', model);
  },
  saveLlmEnabled: async (enabled: boolean): Promise<void> => {
    debug.log('[useSettings] saveLlmEnabled called with:', enabled);
    setSettingsState({ llmEnabled: enabled });
    await tauriAPI.setStoreValue('Trueears_LLM_ENABLED', enabled.toString());
  },
  saveLlmApiKey: async (key: string): Promise<void> => {
    setSettingsState({ llmApiKey: key });
    await tauriAPI.setStoreValue('Trueears_LLM_API_KEY', key);
  },
  saveLlmModel: async (model: string): Promise<void> => {
    setSettingsState({ llmModel: model });
    await tauriAPI.setStoreValue('Trueears_LLM_MODEL', model);
  },
  saveDefaultSystemPrompt: async (prompt: string): Promise<void> => {
    setSettingsState({ defaultSystemPrompt: prompt });
    await tauriAPI.setStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT', prompt);
  },
  markOnboardingComplete: async (): Promise<void> => {
    setSettingsState({ onboardingComplete: true });
    await tauriAPI.setStoreValue('Trueears_ONBOARDING_COMPLETE', 'true');
  },
  saveLanguage: async (language: string): Promise<void> => {
    setSettingsState({ language });
    await tauriAPI.setStoreValue('Trueears_LANGUAGE', language);
  },
  saveAutoDetectLanguage: async (enabled: boolean): Promise<void> => {
    setSettingsState({ autoDetectLanguage: enabled });
    await tauriAPI.setStoreValue('Trueears_AUTO_DETECT_LANGUAGE', enabled.toString());
  },
  saveTheme: async (theme: Theme): Promise<void> => {
    applyTheme(theme);
    setSettingsState({ theme });
    await tauriAPI.setStoreValue('Trueears_THEME', theme);
  },
  saveRecordingMode: async (recordingMode: RecordingMode): Promise<void> => {
    setSettingsState({ recordingMode });
    await tauriAPI.setStoreValue('Trueears_RECORDING_MODE', recordingMode);
  },
  saveMicrophoneId: async (microphoneId: string): Promise<void> => {
    setSettingsState({ microphoneId });
    writeLegacyStorage(LEGACY_STORAGE_KEYS.microphoneId, microphoneId);
    writeLegacyStorage(
      LEGACY_SETTINGS_SCHEMA_VERSION_KEY,
      LEGACY_SETTINGS_SCHEMA_VERSION
    );
    await tauriAPI.setStoreValue('Trueears_MICROPHONE_ID', microphoneId);
  },
};

export const useSettings = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    ...settingsActions,
  };
};
