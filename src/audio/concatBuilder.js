import { writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { OUTPUT_MP3_QUALITY } from "../config.js";
import { silenceFileForPause } from "./silenceGenerator.js";

ffmpeg.setFfmpegPath(ffmpegPath);

function toConcatSafePath(absolutePath) {
  return absolutePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

async function buildConcatListFile(normalizedFiles, silenceClips, workDir) {
  const lines = [];
  for (const { wavPath, pauseBeforeMs } of normalizedFiles) {
    const silenceFile = silenceFileForPause(pauseBeforeMs, silenceClips);
    if (silenceFile) lines.push(`file '${toConcatSafePath(silenceFile)}'`);
    lines.push(`file '${toConcatSafePath(wavPath)}'`);
  }
  const listPath = path.join(workDir, "concat-list.txt");
  await writeFile(listPath, lines.join("\n"), "utf-8");
  return listPath;
}

function mergeWavFiles(listPath, mergedWavPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy"])
      .on("error", reject)
      .on("end", resolve)
      .save(mergedWavPath);
  });
}

function encodeToMp3(mergedWavPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(mergedWavPath)
      .audioCodec("libmp3lame")
      .audioQuality(OUTPUT_MP3_QUALITY)
      .on("error", reject)
      .on("end", resolve)
      .save(outputPath);
  });
}

export async function concatenateSegments({ normalizedFiles, silenceClips, outputPath, workDir }) {
  const listPath = await buildConcatListFile(normalizedFiles, silenceClips, workDir);
  const mergedWavPath = path.join(workDir, "audio-completo.wav");
  await mergeWavFiles(listPath, mergedWavPath);
  await encodeToMp3(mergedWavPath, outputPath);
}
