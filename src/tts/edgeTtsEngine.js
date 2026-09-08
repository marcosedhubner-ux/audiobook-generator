import { mkdir, rename, rm } from "node:fs/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

let voiceListCache = null;

export function createEdgeTtsEngine() {
  async function listVoices() {
    if (voiceListCache) return voiceListCache;
    const client = new MsEdgeTTS();
    const voices = await client.getVoices();
    client.close();
    voiceListCache = voices
      .filter((voice) => voice.Locale.startsWith("pt-") && !voice.ShortName.includes("Multilingual"))
      .map((voice) => ({
        id: voice.ShortName,
        engine: "edge",
        label: `${voice.FriendlyName} (${voice.Locale})`,
      }));
    return voiceListCache;
  }

  async function healthCheck(timeoutMs) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Tempo esgotado ao contatar o Microsoft Edge TTS")), timeoutMs);
    });
    await Promise.race([listVoices(), timeout]);
  }

  async function synthesizeToFile(text, voiceId, outputPath) {
    const client = new MsEdgeTTS();
    const tempDir = `${outputPath}.tmp`;
    try {
      await client.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      await mkdir(tempDir, { recursive: true });
      const { audioFilePath } = await client.toFile(tempDir, text);
      await rename(audioFilePath, outputPath);
    } finally {
      client.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  return { listVoices, healthCheck, synthesizeToFile };
}
