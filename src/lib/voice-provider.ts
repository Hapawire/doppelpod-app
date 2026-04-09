/**
 * Voice provider abstraction layer.
 *
 * Switching providers = set VOICE_PROVIDER env var and redeploy.
 * No code changes required.
 *
 * Supported values: "elevenlabs" (default) | "fish"
 */

export interface VoiceProvider {
  /**
   * Clone a user's voice from a raw audio buffer.
   * Returns the provider-specific voice ID to store and reuse.
   */
  cloneVoice(params: {
    audioBuffer: Buffer;
    name: string;       // e.g. "user-{userId}"
    mimeType: string;   // e.g. "audio/mpeg"
  }): Promise<string>;

  /**
   * Generate speech audio from text using a voice ID.
   * Returns an ArrayBuffer of audio/mpeg data.
   */
  generateSpeech(params: {
    text: string;
    voiceId: string;    // provider-specific ID from cloneVoice or a preset
    stability?: number; // 0–1, default 0.5
  }): Promise<ArrayBuffer>;

  /**
   * Delete a previously cloned voice. Best-effort — errors are logged, not thrown.
   */
  deleteVoice(voiceId: string): Promise<void>;

  /** Which column in profiles holds this provider's voice ID */
  readonly profileColumn: "elevenlabs_voice_id" | "fish_voice_id";

  /** Human-readable provider name for logging */
  readonly name: string;
}

// ─── Factory ───────────────────────────────────────────────────────────────

let _provider: VoiceProvider | null = null;

export function getVoiceProvider(): VoiceProvider {
  if (_provider) return _provider;

  const which = (process.env.VOICE_PROVIDER || "elevenlabs").toLowerCase();

  if (which === "fish") {
    const { FishAudioProvider } = require("./providers/fish-audio");
    _provider = new FishAudioProvider();
  } else {
    const { ElevenLabsProvider } = require("./providers/elevenlabs");
    _provider = new ElevenLabsProvider();
  }

  return _provider!;
}
