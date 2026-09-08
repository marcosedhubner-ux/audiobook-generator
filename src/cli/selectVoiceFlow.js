import { cancel, isCancel, select, spinner } from "@clack/prompts";
import { listAvailableVoices } from "../tts/voiceCatalog.js";

function abortIfCancelled(value) {
  if (isCancel(value)) {
    cancel("Operacao cancelada.");
    process.exit(0);
  }
  return value;
}

export async function selectVoiceFlow() {
  const spin = spinner();
  spin.start("Consultando vozes disponiveis...");
  const { edgeVoices, piperVoices, edgeAvailable } = await listAvailableVoices();
  spin.stop(
    edgeAvailable
      ? "Vozes carregadas."
      : "Microsoft Edge TTS indisponivel agora. Mostrando apenas vozes offline (Piper TTS)."
  );

  const options = [
    ...edgeVoices.map((voice) => ({ value: voice, label: voice.label, hint: "online" })),
    ...piperVoices.map((voice) => ({ value: voice, label: voice.label, hint: "offline" })),
  ];

  return abortIfCancelled(
    await select({
      message: "Qual voz voce quer usar para narrar o livro?",
      options,
    })
  );
}
