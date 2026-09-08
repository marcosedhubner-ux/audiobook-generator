import { spawn } from "node:child_process";
import path from "node:path";
import { ensurePiperVoiceModel, PIPER_VOICE_CATALOG } from "../../scripts/setup-piper.js";

export function createPiperTtsEngine(binaryPath) {
  async function listVoices() {
    return PIPER_VOICE_CATALOG.map((voice) => ({
      id: voice.id,
      engine: "piper",
      label: `${voice.label} — offline`,
    }));
  }

  async function healthCheck() {
    return true;
  }

  async function synthesizeToFile(text, voiceId, outputPath) {
    const modelPath = await ensurePiperVoiceModel(voiceId);
    await new Promise((resolve, reject) => {
      const child = spawn(binaryPath, ["--model", modelPath, "--output_file", outputPath], {
        cwd: path.dirname(binaryPath),
      });
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Piper TTS encerrou com codigo ${code}: ${stderr}`));
      });
      child.stdin.write(text);
      child.stdin.end();
    });
  }

  return { listVoices, healthCheck, synthesizeToFile };
}
