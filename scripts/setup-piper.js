import { access, chmod, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import extractZip from "extract-zip";
import * as tar from "tar";
import { CACHE_DIR } from "../src/config.js";
import { info, success } from "../src/utils/logger.js";

const PIPER_RELEASE_TAG = "2023.11.14-2";
const PIPER_DIR = path.join(CACHE_DIR, "piper");
const PIPER_BIN_DIR = path.join(PIPER_DIR, "bin");
const PIPER_MODELS_DIR = path.join(PIPER_DIR, "models");

export const PIPER_VOICE_CATALOG = [
  { id: "pt_BR-faber-medium", label: "Faber (voz masculina, pt-BR)" },
  { id: "pt_BR-cadu-medium", label: "Cadu (voz masculina, pt-BR)" },
  { id: "pt_BR-jeff-medium", label: "Jeff (voz masculina, pt-BR)" },
  { id: "pt_BR-edresson-low", label: "Edresson (voz masculina, pt-BR)" },
];

export const DEFAULT_PIPER_VOICE_ID = "pt_BR-faber-medium";

let piperBinaryPromise = null;
const piperVoiceModelPromises = new Map();

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, buffer);
}

function resolvePiperAssetName() {
  const { platform, arch } = process;
  if (platform === "win32") return "piper_windows_amd64.zip";
  if (platform === "linux" && arch === "x64") return "piper_linux_x86_64.tar.gz";
  if (platform === "linux" && arch === "arm64") return "piper_linux_aarch64.tar.gz";
  if (platform === "linux" && arch === "arm") return "piper_linux_armv7l.tar.gz";
  if (platform === "darwin" && arch === "arm64") return "piper_macos_aarch64.tar.gz";
  if (platform === "darwin" && arch === "x64") return "piper_macos_x64.tar.gz";
  throw new Error(`Plataforma nao suportada pelo Piper TTS: ${platform}/${arch}`);
}

function piperExecutableName() {
  return process.platform === "win32" ? "piper.exe" : "piper";
}

async function findExecutableRecursively(dir, filename) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findExecutableRecursively(fullPath, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return fullPath;
    }
  }
  return null;
}

async function downloadPiperBinary() {
  const existing = await findExecutableRecursively(PIPER_BIN_DIR, piperExecutableName()).catch(() => null);
  if (existing) return existing;

  info("Baixando o motor de voz local Piper TTS (isso acontece apenas uma vez)...");
  const assetName = resolvePiperAssetName();
  const archivePath = path.join(PIPER_DIR, assetName);
  const downloadUrl = `https://github.com/rhasspy/piper/releases/download/${PIPER_RELEASE_TAG}/${assetName}`;
  await downloadFile(downloadUrl, archivePath);
  await mkdir(PIPER_BIN_DIR, { recursive: true });

  if (assetName.endsWith(".zip")) {
    await extractZip(archivePath, { dir: PIPER_BIN_DIR });
  } else {
    await tar.x({ file: archivePath, cwd: PIPER_BIN_DIR });
  }
  await rm(archivePath, { force: true });

  const executablePath = await findExecutableRecursively(PIPER_BIN_DIR, piperExecutableName());
  if (!executablePath) throw new Error("Executavel do Piper TTS nao encontrado apos a extracao.");
  if (process.platform !== "win32") await chmod(executablePath, 0o755);

  success("Piper TTS pronto para uso offline.");
  return executablePath;
}

export function ensurePiperBinary() {
  if (!piperBinaryPromise) {
    piperBinaryPromise = downloadPiperBinary().catch((downloadError) => {
      piperBinaryPromise = null;
      throw downloadError;
    });
  }
  return piperBinaryPromise;
}

async function downloadPiperVoiceModel(voiceId) {
  const onnxPath = path.join(PIPER_MODELS_DIR, `${voiceId}.onnx`);
  const jsonPath = `${onnxPath}.json`;
  if ((await pathExists(onnxPath)) && (await pathExists(jsonPath))) return onnxPath;

  const match = voiceId.match(/^([a-z]{2}_[A-Z]{2})-([a-z0-9]+)-(\w+)$/);
  if (!match) throw new Error(`ID de voz Piper invalido: ${voiceId}`);
  const [, locale, voiceName, quality] = match;
  const language = locale.split("_")[0];
  const baseUrl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${language}/${locale}/${voiceName}/${quality}`;

  info(`Baixando voz offline "${voiceId}" (isso acontece apenas uma vez)...`);
  await downloadFile(`${baseUrl}/${voiceId}.onnx`, onnxPath);
  await downloadFile(`${baseUrl}/${voiceId}.onnx.json`, jsonPath);
  success(`Voz "${voiceId}" pronta para uso offline.`);

  return onnxPath;
}

export function ensurePiperVoiceModel(voiceId) {
  if (!piperVoiceModelPromises.has(voiceId)) {
    piperVoiceModelPromises.set(
      voiceId,
      downloadPiperVoiceModel(voiceId).catch((downloadError) => {
        piperVoiceModelPromises.delete(voiceId);
        throw downloadError;
      })
    );
  }
  return piperVoiceModelPromises.get(voiceId);
}

async function runCli() {
  await ensurePiperBinary();
  await ensurePiperVoiceModel(DEFAULT_PIPER_VOICE_ID);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((cliError) => {
    console.error(cliError);
    process.exitCode = 1;
  });
}
