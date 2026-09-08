import { rm } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { TTS_CONCURRENCY_EDGE, TTS_CONCURRENCY_PIPER } from "../config.js";
import { concatenateSegments } from "./concatBuilder.js";
import { normalizeSegmentAudio } from "./segmentNormalizer.js";
import { buildSilenceClips } from "./silenceGenerator.js";

export class CancellationError extends Error {
  constructor() {
    super("Geracao cancelada.");
    this.name = "CancellationError";
  }
}

export async function renderAudiobook({
  segments,
  ttsManager,
  outputPath,
  workDir,
  onProgress = () => {},
  isCancelled = () => false,
}) {
  const concurrency = ttsManager.getActiveEngine() === "piper" ? TTS_CONCURRENCY_PIPER : TTS_CONCURRENCY_EDGE;
  const limit = pLimit(concurrency);

  const normalizedFiles = new Array(segments.length);
  let completed = 0;

  try {
    await Promise.all(
      segments.map((segment) =>
        limit(async () => {
          if (isCancelled()) return;
          const basePath = path.join(workDir, `segmento-${segment.id}`);
          const { filePath } = await ttsManager.synthesizeSegment(segment, basePath);
          if (isCancelled()) return;
          const wavPath = path.join(workDir, `segmento-${segment.id}-normalizado.wav`);
          await normalizeSegmentAudio(filePath, wavPath);
          normalizedFiles[segment.id] = { wavPath, pauseBeforeMs: segment.pauseBeforeMs };
          completed += 1;
          onProgress(completed, segments.length);
        })
      )
    );

    if (isCancelled()) throw new CancellationError();

    const silenceClips = await buildSilenceClips(workDir);
    await concatenateSegments({ normalizedFiles, silenceClips, outputPath, workDir });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
