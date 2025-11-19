export class GroqService {
  private static readonly API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

  static async transcribe(audioBlob: Blob, apiKey: string): Promise<string> {
    const formData = new FormData();
    // Groq accepts m4a, mp3, webm, mp4, mpga, wav, mpeg
    // Chrome MediaRecorder usually results in audio/webm
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    // temperature 0 makes the output deterministic
    formData.append('temperature', '0'); 

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Do not set Content-Type header manually; fetch sets it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }
}