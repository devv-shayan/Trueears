import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { processTranscription, finalizeDictation } from '../controllers/dictationController';
import { Provider } from './useSettings';

export type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export const useDictation = () => {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const { isRecording, mediaStream, startRecording, stopRecording } = useAudioRecorder();
  const isProcessingRef = useRef(false);

  const startDictation = async () => {
    try {
      await startRecording();
      setStatus('recording');
    } catch (error) {
      setStatus('error');
      throw error;
    }
  };

  const stopDictation = useCallback(async (provider: Provider, apiKey: string, model: string, onError?: (msg: string) => void) => {
    if (!isRecording || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setStatus('processing');

    try {
      const audioBlob = await stopRecording();
      
      if (audioBlob.size === 0) {
        throw new Error("No audio captured");
      }

      const text = await processTranscription(audioBlob, provider, apiKey, model);

      if (text) {
        finalizeDictation(text);
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          isProcessingRef.current = false;
        }, 1500);
      } else {
        setStatus('idle');
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Dictation failed", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (onError) {
        onError(errorMessage);
      }
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        isProcessingRef.current = false;
      }, 2000);
    }
  }, [isRecording, stopRecording]);

  return {
    status,
    mediaStream,
    startDictation,
    stopDictation
  };
};
