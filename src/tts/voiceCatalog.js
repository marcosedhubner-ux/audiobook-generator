import { PIPER_VOICE_CATALOG } from "../../scripts/setup-piper.js";
import { createEdgeTtsEngine } from "./edgeTtsEngine.js";

export async function listAvailableVoices() {
  const edgeEngine = createEdgeTtsEngine();
  const edgeVoices = await edgeEngine.listVoices().catch(() => []);

  const piperVoices = PIPER_VOICE_CATALOG.map((voice) => ({
    id: voice.id,
    engine: "piper",
    label: `${voice.label} — offline, sem internet`,
  }));

  return { edgeVoices, piperVoices, edgeAvailable: edgeVoices.length > 0 };
}
