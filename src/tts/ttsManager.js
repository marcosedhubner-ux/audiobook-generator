import {
  EDGE_HEALTHCHECK_TIMEOUT_MS,
  EDGE_RETRY_ATTEMPTS,
  EDGE_RETRY_DELAY_MS,
  MAX_CONSECUTIVE_EDGE_FAILURES,
} from "../config.js";
import { warn } from "../utils/logger.js";
import { DEFAULT_PIPER_VOICE_ID, ensurePiperBinary } from "../../scripts/setup-piper.js";
import { createEdgeTtsEngine } from "./edgeTtsEngine.js";
import { createPiperTtsEngine } from "./piperTtsEngine.js";

async function withRetries(fn, attempts, delayMs) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (attemptError) {
      lastError = attemptError;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export function createTtsManager(selectedVoice) {
  const edgeEngine = createEdgeTtsEngine();
  let piperEngine = null;
  let activeEngine = selectedVoice.engine;
  let consecutiveFailures = 0;

  async function ensurePiper() {
    if (piperEngine) return piperEngine;
    const binaryPath = await ensurePiperBinary();
    piperEngine = createPiperTtsEngine(binaryPath);
    return piperEngine;
  }

  async function initialize() {
    if (activeEngine === "piper") {
      await ensurePiper();
      return;
    }
    try {
      await edgeEngine.healthCheck(EDGE_HEALTHCHECK_TIMEOUT_MS);
    } catch {
      warn("Microsoft Edge TTS indisponivel agora. Usando Piper TTS (offline) para todo o audiobook.");
      activeEngine = "piper";
      await ensurePiper();
    }
  }

  async function synthesizeSegment(segment, basePath) {
    if (activeEngine === "edge") {
      try {
        const outputPath = `${basePath}.mp3`;
        await withRetries(
          () => edgeEngine.synthesizeToFile(segment.text, selectedVoice.id, outputPath),
          EDGE_RETRY_ATTEMPTS,
          EDGE_RETRY_DELAY_MS
        );
        consecutiveFailures = 0;
        return { engine: "edge", filePath: outputPath };
      } catch (synthesisError) {
        consecutiveFailures += 1;
        warn(
          `Falha ao sintetizar via Microsoft Edge TTS (${consecutiveFailures}/${MAX_CONSECUTIVE_EDGE_FAILURES}): ${synthesisError.message}`
        );
        if (consecutiveFailures >= MAX_CONSECUTIVE_EDGE_FAILURES) {
          warn("Excesso de falhas no Microsoft Edge TTS. Trocando para Piper TTS (offline) para o restante do audiobook.");
          activeEngine = "piper";
        }
      }
    }

    const piper = await ensurePiper();
    const outputPath = `${basePath}.wav`;
    const piperVoiceId = selectedVoice.engine === "piper" ? selectedVoice.id : DEFAULT_PIPER_VOICE_ID;
    await piper.synthesizeToFile(segment.text, piperVoiceId, outputPath);
    return { engine: "piper", filePath: outputPath };
  }

  function getActiveEngine() {
    return activeEngine;
  }

  return { initialize, synthesizeSegment, getActiveEngine };
}
