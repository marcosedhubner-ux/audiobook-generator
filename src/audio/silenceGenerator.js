import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { AUDIO_CHANNELS, AUDIO_SAMPLE_RATE, PAUSE_DIALOGUE_MS, PAUSE_PARAGRAPH_MS, PAUSE_SUBCHUNK_MS } from "../config.js";

ffmpeg.setFfmpegPath(ffmpegPath);

function renderSilence(durationMs, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`anullsrc=channel_layout=mono:sample_rate=${AUDIO_SAMPLE_RATE}`)
      .inputFormat("lavfi")
      .duration(durationMs / 1000)
      .audioChannels(AUDIO_CHANNELS)
      .audioFrequency(AUDIO_SAMPLE_RATE)
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("error", reject)
      .on("end", resolve)
      .save(outputPath);
  });
}

export async function buildSilenceClips(workDir) {
  const clips = {
    paragraph: path.join(workDir, "silencio-paragrafo.wav"),
    dialogue: path.join(workDir, "silencio-dialogo.wav"),
    subchunk: path.join(workDir, "silencio-subchunk.wav"),
  };
  await Promise.all([
    renderSilence(PAUSE_PARAGRAPH_MS, clips.paragraph),
    renderSilence(PAUSE_DIALOGUE_MS, clips.dialogue),
    renderSilence(PAUSE_SUBCHUNK_MS, clips.subchunk),
  ]);
  return clips;
}

export function silenceFileForPause(pauseBeforeMs, clips) {
  if (pauseBeforeMs === 0) return null;
  if (pauseBeforeMs === PAUSE_DIALOGUE_MS) return clips.dialogue;
  if (pauseBeforeMs === PAUSE_SUBCHUNK_MS) return clips.subchunk;
  return clips.paragraph;
}
