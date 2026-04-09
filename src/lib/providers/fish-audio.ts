import type { VoiceProvider } from "../voice-provider";

const BASE_URL = "https://api.fish.audio/v1";

export class FishAudioProvider implements VoiceProvider {
  readonly name = "Fish Audio";
  readonly profileColumn = "fish_voice_id" as const;

  private get apiKey(): string {
    const key = process.env.FISH_AUDIO_API_KEY;
    if (!key) throw new Error("[FishAudio] FISH_AUDIO_API_KEY is not set");
    return key;
  }

  async cloneVoice({
    audioBuffer,
    name,
    mimeType,
  }: {
    audioBuffer: Buffer;
    name: string;
    mimeType: string;
  }): Promise<string> {
    // Fish Audio model creation — multipart form with audio sample
    const form = new FormData();
    form.append("title", name);
    form.append("visibility", "private");
    form.append(
      "voices",
      new Blob([audioBuffer], { type: mimeType }),
      `${name}.mp3`
    );

    const res = await fetch(`${BASE_URL}/model`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`[FishAudio] cloneVoice failed ${res.status}: ${err}`);
    }

    const data = await res.json();
    // Fish Audio returns { _id: "...", ... }
    const modelId: string = data._id ?? data.id;
    if (!modelId) throw new Error("[FishAudio] cloneVoice: no model ID in response");

    console.log(`[FishAudio] Voice cloned: ${modelId} (${name})`);
    return modelId;
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
    // Fish Audio TTS endpoint
    // stability maps roughly to Fish Audio's "prosody" control
    const res = await fetch(`${BASE_URL}/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 1000),
        reference_id: voiceId,
        format: "mp3",
        mp3_bitrate: 128,
        // Fish Audio uses latency as a quality/speed tradeoff: 1 = normal, 4 = fastest
        latency: "normal",
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`[FishAudio] generateSpeech failed ${res.status}: ${err}`);
    }

    return res.arrayBuffer();
  }

  async deleteVoice(voiceId: string): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/model/${voiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) {
        console.warn(`[FishAudio] deleteVoice ${voiceId} returned ${res.status}`);
      } else {
        console.log(`[FishAudio] Voice deleted: ${voiceId}`);
      }
    } catch (err) {
      console.error(`[FishAudio] deleteVoice error:`, err);
    }
  }
}
