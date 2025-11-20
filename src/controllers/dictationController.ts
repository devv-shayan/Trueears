import { GroqService } from '../services/groqService';
import { GeminiService } from '../services/geminiService';
import { playSuccessSound } from '../utils/soundUtils';
import { Provider } from '../hooks/useSettings';

export const processTranscription = async (audioBlob: Blob, provider: Provider, apiKey: string, model: string): Promise<string> => {
  if (provider === 'gemini') {
    return await GeminiService.transcribe(audioBlob, apiKey, model);
  } else {
    return await GroqService.transcribe(audioBlob, apiKey, model);
  }
};

export const finalizeDictation = (text: string) => {
  if (window.electronAPI) {
    window.electronAPI.sendTranscription(text);
  } else {
    console.warn("Electron API not available, cannot type text:", text);
  }
  playSuccessSound();
};
