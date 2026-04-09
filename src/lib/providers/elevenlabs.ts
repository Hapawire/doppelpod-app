import type { VoiceProvider } from "../voice-provider";

const BASE_URL = "https://api.elevenlabs.io/v1";
// Default preset voice — "Adam" (neutral male). Override via ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

export class ElevenLabsProvider implements VoiceProvider {
  readonly name = "ElevenLabs";
  readonly profileColumn = "elevenlabs_voice_id" as const;

  private get apiKey(): string {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("[ElevenLabs] ELEVENLABS_API_KEY is not set");
    return key;
  }

  async cloneVoice({
    audioBuffer,
    name,
  }: {
    audioBuffer: Buffer;
    name: string;
    mimeType: string;
  }): Promise<string> {
    const form = new FormData();
    form.append("name", name);
    form.append(
      "files",
      new Blob([audioBuffer], { type: "audio/mpeg" }),
      `${name}.mp3`
    );
    form.append("description", "DoppelPod user voice clone");

    const res = await fetch(`${BASE_URL}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": this.apiKey },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`[ElevenLabs] cloneVoice failed ${res.status}: ${err}`);
    }

    const data = await res.json();
    const voiceId: string = data.voice_id;
    if (!voiceId) throw new Error("[ElevenLabs] cloneVoice: no voice_id in response");

    console.log(`[ElevenLabs] Voice cloned: ${voiceId} (${name})`);
    return voiceId;
  }

  async generateSpeech({
    text,
    voiceId,
    stability = 0.5,
  }: {
    text: string;
    voiceId: string;
    stability?: number;
  }): Promise<Buffer> {
    const id = voiceId || DEFAULT_VOICE_ID;

    const res = await fetch(`${BASE_URL}/text-to-speech/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 1000),
        voice_settings: {
          stability: Math.max(0, Math.min(1, stability)),
          similarity_boost: 0.75,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`[ElevenLabs] generateSpeech failed ${res.status}: ${err}`);
    }

    return res.arrayBuffer();
  }

  async deleteVoice(voiceId: string): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": this.apiKey },
      });
      if (!res.ok) {
        console.warn(`[ElevenLabs] deleteVoice ${voiceId} returned ${res.status}`);
      } else {
        console.log(`[ElevenLabs] Voice deleted: ${voiceId}`);
      }
    } catch (err) {
      console.error(`[ElevenLabs] deleteVoice error:`, err);
    }
  }
}
