import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class GeminiLiveSession {
  private sessionPromise: Promise<any> | null = null;
  private currentTranscription = "";
  private onTranscriptionUpdate: (text: string) => void;

  constructor(onTranscriptionUpdate: (text: string) => void) {
    this.onTranscriptionUpdate = onTranscriptionUpdate;
  }

  start() {
    this.currentTranscription = "";
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO], 
        inputAudioTranscription: {},
        systemInstruction: {
          parts: [{ text: "You are a precise transcriber. Your only job is to transcribe the user's speech into text. Do not reply effectively. Do not speak." }]
        }
      },
      callbacks: {
        onopen: () => console.log("Gemini Live: Connected"),
        onmessage: (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            this.currentTranscription += text;
            this.onTranscriptionUpdate(this.currentTranscription);
          }
        },
        onclose: () => console.log("Gemini Live: Closed"),
        onerror: (error) => console.error("Gemini Live: Error", error),
      }
    });
  }

  async sendAudioChunk(base64PCM: string) {
    if (!this.sessionPromise) return;
    try {
      const session = await this.sessionPromise;
      session.sendRealtimeInput({
        media: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64PCM
        }
      });
    } catch (error) {
      console.error("Error sending audio chunk", error);
    }
  }

  stop() {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.close();
      });
      this.sessionPromise = null;
    }
    return this.currentTranscription;
  }
}