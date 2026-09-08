import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { ensurePiperBinary } from "../../scripts/setup-piper.js";
import { CancellationError, renderAudiobook } from "../audio/audioPipeline.js";
import { AUDIOS_DIR, CONTEUDO_DIR, PROJECT_ROOT } from "../config.js";
import { extractBook } from "../extractors/extractorFactory.js";
import { runTextPipeline } from "../processing/textPipeline.js";
import { createEdgeTtsEngine } from "../tts/edgeTtsEngine.js";
import { createPiperTtsEngine } from "../tts/piperTtsEngine.js";
import { createTtsManager } from "../tts/ttsManager.js";
import { listAvailableVoices } from "../tts/voiceCatalog.js";
import {
  createSessionWorkDir,
  listContentFolders,
  resolveBookPath,
  resolveOutputPath,
  sanitizeSegment,
} from "../utils/paths.js";
import { createJob, emitEvent, getJob, subscribe, unsubscribe } from "./jobManager.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 300 * 1024 * 1024 } });
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt"]);
const VOICE_PREVIEW_TEXT =
  "Era uma noite fria e silenciosa. A porta antiga rangeu devagar, revelando um corredor que ninguem ousava atravessar ha anos. Foi assim que a nossa historia comecou.";

function toAudioUrl(outputPath) {
  const relative = path.relative(AUDIOS_DIR, outputPath).split(path.sep).join("/");
  return `/audios/${relative}`;
}

function toSavedPath(outputPath) {
  return path.relative(PROJECT_ROOT, outputPath).split(path.sep).join("/");
}

async function runJob(job, { folderName, fileName, voiceId, voiceEngine }) {
  const filePath = resolveBookPath(folderName, fileName);
  const isCancelled = () => job.cancelled;

  emitEvent(job, "extracting", {});
  const extraction = await extractBook(filePath);
  if (isCancelled()) throw new CancellationError();

  emitEvent(job, "cleaning", {});
  const { segments } = runTextPipeline(extraction);
  if (isCancelled()) throw new CancellationError();

  const ttsManager = createTtsManager({ id: voiceId, engine: voiceEngine });
  await ttsManager.initialize();
  if (isCancelled()) throw new CancellationError();
  job.engine = ttsManager.getActiveEngine();
  emitEvent(job, "engine", { engine: job.engine });

  job.status = "synthesizing";
  job.total = segments.length;

  const workDir = await createSessionWorkDir();
  const outputPath = await resolveOutputPath(folderName, fileName);

  await renderAudiobook({
    segments,
    ttsManager,
    outputPath,
    workDir,
    isCancelled,
    onProgress: (current, total) => {
      job.current = current;
      job.total = total;
      const activeEngine = ttsManager.getActiveEngine();
      if (activeEngine !== job.engine) {
        job.engine = activeEngine;
        const engineLabel = activeEngine === "piper" ? "Piper TTS (offline)" : "Microsoft Edge TTS";
        emitEvent(job, "warning", { message: `Motor de voz trocado para ${engineLabel}.` });
      }
      emitEvent(job, "synthesizing", { current, total, engine: activeEngine });
    },
  });

  job.status = "done";
  job.outputPath = outputPath;
  job.result = { audioUrl: toAudioUrl(outputPath), savedPath: toSavedPath(outputPath) };
  emitEvent(job, "done", job.result);
}

export function createRouter() {
  const router = Router();

  router.get("/api/folders", async (_req, res) => {
    res.json({ folders: await listContentFolders() });
  });

  router.get("/api/voices", async (_req, res) => {
    res.json(await listAvailableVoices());
  });

  router.get("/api/voice-preview", async (req, res) => {
    const { voiceId, engine } = req.query;
    if (!voiceId || !engine) {
      return res.status(400).json({ error: "Informe a voz para gerar a previa." });
    }

    const workDir = await createSessionWorkDir();
    try {
      let filePath;
      let contentType;
      if (engine === "piper") {
        const binaryPath = await ensurePiperBinary();
        const piper = createPiperTtsEngine(binaryPath);
        filePath = path.join(workDir, "previa.wav");
        await piper.synthesizeToFile(VOICE_PREVIEW_TEXT, voiceId, filePath);
        contentType = "audio/wav";
      } else {
        const edge = createEdgeTtsEngine();
        filePath = path.join(workDir, "previa.mp3");
        await edge.synthesizeToFile(VOICE_PREVIEW_TEXT, voiceId, filePath);
        contentType = "audio/mpeg";
      }
      const buffer = await readFile(filePath);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer, () => {
        rm(workDir, { recursive: true, force: true }).catch(() => {});
      });
    } catch (error) {
      await rm(workDir, { recursive: true, force: true });
      res.status(500).json({ error: "Nao foi possivel gerar a previa da voz." });
    }
  });

  router.post("/api/generate", upload.single("file"), async (req, res) => {
    try {
      const folderName = sanitizeSegment(req.body.folderName);
      const { voiceId, voiceEngine } = req.body;
      if (!voiceId || !voiceEngine) {
        return res.status(400).json({ error: "Selecione uma voz antes de gerar o audiobook." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Envie um arquivo PDF ou TXT." });
      }

      const fileName = sanitizeSegment(req.file.originalname);
      const extension = path.extname(fileName).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        return res.status(400).json({ error: `Formato de arquivo nao suportado: ${extension}` });
      }
      const destinationDir = path.join(CONTEUDO_DIR, folderName);
      await mkdir(destinationDir, { recursive: true });
      await writeFile(path.join(destinationDir, fileName), req.file.buffer);

      const job = createJob();
      res.json({ jobId: job.id });

      runJob(job, { folderName, fileName, voiceId, voiceEngine }).catch((error) => {
        if (error instanceof CancellationError) {
          job.status = "cancelled";
          emitEvent(job, "cancelled", {});
          return;
        }
        job.status = "error";
        job.error = error.message;
        emitEvent(job, "failed", { message: error.message });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/cancel/:jobId", (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).end();
    job.cancelled = true;
    res.status(204).end();
  });

  router.get("/api/progress/:jobId", (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).end();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    if (job.status === "done") {
      res.write(`event: done\ndata: ${JSON.stringify(job.result)}\n\n`);
      return res.end();
    }
    if (job.status === "error") {
      res.write(`event: failed\ndata: ${JSON.stringify({ message: job.error })}\n\n`);
      return res.end();
    }
    if (job.status === "cancelled") {
      res.write(`event: cancelled\ndata: {}\n\n`);
      return res.end();
    }

    res.write(
      `event: ${job.status}\ndata: ${JSON.stringify({ current: job.current, total: job.total, engine: job.engine })}\n\n`
    );

    subscribe(job, res);
    req.on("close", () => unsubscribe(job, res));
  });

  return router;
}
