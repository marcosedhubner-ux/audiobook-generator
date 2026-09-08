import { writeFile } from "node:fs/promises";
import path from "node:path";
import { intro, log, outro } from "@clack/prompts";
import { Command } from "commander";
import ora from "ora";
import pc from "picocolors";
import { renderAudiobook } from "./audio/audioPipeline.js";
import { selectBookFlow } from "./cli/selectBookFlow.js";
import { createProgressBar } from "./cli/progressReporter.js";
import { selectVoiceFlow } from "./cli/selectVoiceFlow.js";
import { TMP_DIR } from "./config.js";
import { extractBook } from "./extractors/extractorFactory.js";
import { formatDebugText, runTextPipeline } from "./processing/textPipeline.js";
import { createTtsManager } from "./tts/ttsManager.js";
import { createSessionWorkDir, ensureBaseDirs, resolveOutputPath } from "./utils/paths.js";
import { DEFAULT_PIPER_VOICE_ID, PIPER_VOICE_CATALOG } from "../scripts/setup-piper.js";

const program = new Command();
program
  .option("--somente-limpeza", "roda apenas a limpeza de texto e gera um arquivo de depuracao, sem sintetizar audio")
  .option("--forcar-motor <motor>", "forca o uso de um motor de voz especifico: edge ou piper")
  .parse(process.argv);

const options = program.opts();

function resolveForcedPiperVoice() {
  const voice = PIPER_VOICE_CATALOG.find((entry) => entry.id === DEFAULT_PIPER_VOICE_ID);
  return { id: DEFAULT_PIPER_VOICE_ID, engine: "piper", label: voice.label };
}

async function main() {
  await ensureBaseDirs();
  intro(pc.bold("Audiobook Generator"));

  const { folderName, fileName, filePath } = await selectBookFlow();

  const extractionSpinner = ora("Extraindo texto do arquivo...").start();
  const extraction = await extractBook(filePath);
  extractionSpinner.succeed("Texto extraido.");

  const cleanupSpinner = ora("Limpando texto e detectando dialogos...").start();
  const { segments, paragrafosComDialogo } = runTextPipeline(extraction);
  cleanupSpinner.succeed(`Texto processado em ${segments.length} trechos.`);

  if (options.somenteLimpeza) {
    const debugPath = path.join(TMP_DIR, `${path.parse(fileName).name}-depuracao.txt`);
    await writeFile(debugPath, formatDebugText(paragrafosComDialogo), "utf-8");
    log.success(`Arquivo de depuracao gerado em: ${debugPath}`);
    outro("Concluido (modo somente limpeza).");
    return;
  }

  const selectedVoice = options.forcarMotor === "piper" ? resolveForcedPiperVoice() : await selectVoiceFlow();

  const ttsManager = createTtsManager(selectedVoice);
  const initSpinner = ora("Preparando motor de voz...").start();
  await ttsManager.initialize();
  const engineLabel = ttsManager.getActiveEngine() === "edge" ? "Microsoft Edge TTS" : "Piper TTS (offline)";
  initSpinner.succeed(`Motor de voz pronto: ${engineLabel}.`);

  const workDir = await createSessionWorkDir();
  const outputPath = await resolveOutputPath(folderName, fileName);

  const progressBar = createProgressBar(segments.length);
  await renderAudiobook({
    segments,
    ttsManager,
    outputPath,
    workDir,
    onProgress: () => progressBar.increment(),
  });
  progressBar.stop();

  outro(`Audiobook pronto em: ${outputPath}`);
}

main().catch((mainError) => {
  console.error(pc.red(mainError.message));
  process.exitCode = 1;
});
