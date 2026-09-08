import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { AUDIOS_DIR, CONTEUDO_DIR, TMP_DIR } from "../config.js";

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt"]);

export function sanitizeSegment(name) {
  const cleaned = String(name ?? "")
    .replace(/[\\/]/g, "")
    .replace(/\.\./g, "")
    .trim();
  if (!cleaned) throw new Error("Nome invalido.");
  return cleaned;
}

export async function ensureBaseDirs() {
  await mkdir(CONTEUDO_DIR, { recursive: true });
  await mkdir(AUDIOS_DIR, { recursive: true });
  await mkdir(TMP_DIR, { recursive: true });
}

export async function listContentFolders() {
  const entries = await readdir(CONTEUDO_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function listBookFiles(folderName) {
  const folderPath = path.join(CONTEUDO_DIR, folderName);
  const entries = await readdir(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function resolveBookPath(folderName, fileName) {
  return path.join(CONTEUDO_DIR, folderName, fileName);
}

export async function resolveOutputPath(folderName, fileName) {
  const outputDir = path.join(AUDIOS_DIR, folderName);
  await mkdir(outputDir, { recursive: true });
  const baseName = path.parse(fileName).name;
  return path.join(outputDir, `${baseName}.mp3`);
}

export async function createSessionWorkDir() {
  const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const workDir = path.join(TMP_DIR, sessionId);
  await mkdir(workDir, { recursive: true });
  return workDir;
}
