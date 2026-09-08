import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const CONTEUDO_DIR = path.join(PROJECT_ROOT, "Conteudo");
export const AUDIOS_DIR = path.join(PROJECT_ROOT, "Audios");
export const CACHE_DIR = path.join(PROJECT_ROOT, ".cache");
export const TMP_DIR = path.join(CACHE_DIR, "tmp");

export const MAX_PARAGRAPH_CHARS = 1800;

export const PAUSE_PARAGRAPH_MS = 350;
export const PAUSE_DIALOGUE_MS = 700;
export const PAUSE_SUBCHUNK_MS = 180;

export const TTS_CONCURRENCY_EDGE = 4;
export const TTS_CONCURRENCY_PIPER = 2;

export const EDGE_HEALTHCHECK_TIMEOUT_MS = 6000;
export const MAX_CONSECUTIVE_EDGE_FAILURES = 3;
export const EDGE_RETRY_ATTEMPTS = 2;
export const EDGE_RETRY_DELAY_MS = 800;

export const AUDIO_SAMPLE_RATE = 24000;
export const AUDIO_CHANNELS = 1;
export const OUTPUT_MP3_QUALITY = 4;

export const SERVER_PORT = 4747;
