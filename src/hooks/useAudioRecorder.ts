import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsRecording(true);
      audioChunksRef.current = [];

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
      throw err;
    }
  };

  const stopRecording = useCallback(async (): Promise<Blob> => {
    if (!isRecording || !mediaRecorderRef.current) {
      return new Blob([]);
    }

    const recorder = mediaRecorderRef.current;
    const stream = mediaStream;

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Cleanup
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        setMediaStream(null);
        setIsRecording(false);
        
        resolve(audioBlob);
      };
      recorder.stop();
    });
  }, [isRecording, mediaStream]);

  return {
    isRecording,
    mediaStream,
    startRecording,
    stopRecording
  };
};
