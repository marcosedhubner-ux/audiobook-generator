import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { AUDIO_CHANNELS, AUDIO_SAMPLE_RATE } from "../config.js";

ffmpeg.setFfmpegPath(ffmpegPath);

export function normalizeSegmentAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(AUDIO_CHANNELS)
      .audioFrequency(AUDIO_SAMPLE_RATE)
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("error", reject)
      .on("end", resolve)
      .save(outputPath);
  });
}
