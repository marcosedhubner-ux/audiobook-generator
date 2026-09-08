import { createSnakeGame } from "./snakeGame.js";

const dropzone = document.getElementById("dropzone");
const dropzonePrompt = document.getElementById("dropzone-prompt");
const fileInput = document.getElementById("file-input");
const browseButton = document.getElementById("browse-button");
const fileCard = document.getElementById("file-card");
const fileCardName = document.getElementById("file-card-name");
const fileCardMeta = document.getElementById("file-card-meta");
const removeFileButton = document.getElementById("remove-file-button");
const folderNameInput = document.getElementById("folder-name");
const folderPickerButton = document.getElementById("folder-picker-button");
const folderPickerList = document.getElementById("folder-picker-list");
const voiceSelect = document.getElementById("voice-select");
const previewButton = document.getElementById("voice-preview-button");
const previewPlayer = document.getElementById("preview-player");
const form = document.getElementById("generate-form");
const generateButton = document.getElementById("generate-button");
const generatingView = document.getElementById("generating-view");
const snakeCanvas = document.getElementById("snake-canvas");
const snakeStartButton = document.getElementById("snake-start-button");
const snakeScore = document.getElementById("snake-score");
const statusArea = document.getElementById("status-area");
const statusText = document.getElementById("status-text");
const progressBar = document.getElementById("progress-bar");
const warningText = document.getElementById("warning-text");
const cancelButton = document.getElementById("cancel-button");
const errorText = document.getElementById("error-text");

const SUPPORTED_EXTENSIONS = [".pdf", ".txt"];
const DEFAULT_STATUS_TEXT = "Clique para gerar o seu Audiobook...";

let selectedFile = null;
let currentJobId = null;
let currentEventSource = null;
let pendingFinish = null;

const game = createSnakeGame(snakeCanvas);
game.onStateChange((state) => {
  snakeStartButton.hidden = state === "playing";
  if (state === "gameover" && pendingFinish) {
    const action = pendingFinish;
    pendingFinish = null;
    setTimeout(action, 1200);
  }
});
game.onScoreChange((score) => {
  snakeScore.textContent = `Macas comidas: ${score}`;
});
snakeStartButton.addEventListener("click", () => game.start());

function finishGeneration(action) {
  if (game.getState() === "playing") {
    pendingFinish = action;
    return;
  }
  action();
}

function showError(message) {
  errorText.textContent = message;
  errorText.hidden = false;
}

function clearError() {
  errorText.hidden = true;
  errorText.textContent = "";
}

function showWarning(message) {
  warningText.textContent = message;
  warningText.hidden = false;
}

function resetStatus() {
  statusText.textContent = DEFAULT_STATUS_TEXT;
  progressBar.hidden = true;
  progressBar.value = 0;
  warningText.hidden = true;
}

function showFormView() {
  form.hidden = false;
  generatingView.hidden = true;
  cancelButton.hidden = true;
}

function showGeneratingView() {
  form.hidden = true;
  generatingView.hidden = false;
  cancelButton.hidden = false;
}

function fileExtension(name) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? "" : name.slice(dotIndex).toLowerCase();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resetFileSelection() {
  selectedFile = null;
  fileInput.value = "";
  fileCard.hidden = true;
  dropzonePrompt.hidden = false;
  resetStatus();
}

function handleFileChosen(file) {
  if (!file) return;
  const extension = fileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    showError(`Formato nao suportado: ${extension || "desconhecido"}`);
    return;
  }
  clearError();
  selectedFile = file;
  fileCardName.textContent = file.name;
  fileCardMeta.textContent = `${extension.slice(1).toUpperCase()} - ${formatFileSize(file.size)}`;
  dropzonePrompt.hidden = true;
  fileCard.hidden = false;
  resetStatus();
  if (!folderNameInput.value.trim()) {
    folderNameInput.value = file.name.slice(0, file.name.length - extension.length);
  }
}

dropzone.addEventListener("click", () => {
  if (selectedFile) return;
  fileInput.click();
});
dropzone.addEventListener("keydown", (event) => {
  if (selectedFile) return;
  if (event.key === "Enter" || event.key === " ") fileInput.click();
});
browseButton.addEventListener("click", (event) => {
  event.stopPropagation();
  fileInput.click();
});
removeFileButton.addEventListener("click", (event) => {
  event.stopPropagation();
  resetFileSelection();
});
fileInput.addEventListener("change", () => handleFileChosen(fileInput.files[0]));

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
});
dropzone.addEventListener("drop", (event) => {
  handleFileChosen(event.dataTransfer.files[0]);
});

folderPickerButton.addEventListener("click", async (event) => {
  event.stopPropagation();
  if (!folderPickerList.hidden) {
    folderPickerList.hidden = true;
    return;
  }
  const response = await fetch("/api/folders");
  const { folders } = await response.json();
  folderPickerList.innerHTML = "";
  if (folders.length === 0) {
    const empty = document.createElement("li");
    empty.className = "folder-picker-empty";
    empty.textContent = "Nenhuma pasta encontrada";
    folderPickerList.appendChild(empty);
  } else {
    for (const folder of folders) {
      const item = document.createElement("li");
      item.textContent = folder;
      item.addEventListener("click", () => {
        folderNameInput.value = folder;
        folderPickerList.hidden = true;
      });
      folderPickerList.appendChild(item);
    }
  }
  folderPickerList.hidden = false;
});

document.addEventListener("click", (event) => {
  if (!folderPickerList.hidden && !folderPickerList.contains(event.target) && event.target !== folderPickerButton) {
    folderPickerList.hidden = true;
  }
});

function buildVoiceOptionValue(voice) {
  return JSON.stringify({ id: voice.id, engine: voice.engine });
}

async function loadVoices() {
  const response = await fetch("/api/voices");
  const { edgeVoices, piperVoices, edgeAvailable } = await response.json();
  voiceSelect.innerHTML = "";

  if (edgeVoices.length > 0) {
    const group = document.createElement("optgroup");
    group.label = "Microsoft Edge TTS (online)";
    for (const voice of edgeVoices) {
      const option = document.createElement("option");
      option.value = buildVoiceOptionValue(voice);
      option.textContent = voice.label;
      group.appendChild(option);
    }
    voiceSelect.appendChild(group);
  }

  const piperGroup = document.createElement("optgroup");
  piperGroup.label = "Piper TTS (offline)";
  for (const voice of piperVoices) {
    const option = document.createElement("option");
    option.value = buildVoiceOptionValue(voice);
    option.textContent = voice.label;
    piperGroup.appendChild(option);
  }
  voiceSelect.appendChild(piperGroup);

  if (!edgeAvailable) {
    showWarning("Microsoft Edge TTS indisponivel agora. Mostrando apenas vozes offline.");
  }

  previewButton.disabled = !voiceSelect.value;
}

let previewObjectUrl = null;
let previewAbortController = null;

function stopPreview() {
  if (previewAbortController) {
    previewAbortController.abort();
    previewAbortController = null;
  }
  previewPlayer.pause();
  previewPlayer.currentTime = 0;
  previewButton.disabled = !voiceSelect.value;
  previewButton.classList.remove("loading");
}

voiceSelect.addEventListener("change", () => {
  stopPreview();
});

previewButton.addEventListener("click", async () => {
  if (!voiceSelect.value || previewButton.classList.contains("loading")) return;

  const voice = JSON.parse(voiceSelect.value);
  clearError();
  previewButton.disabled = true;
  previewButton.classList.add("loading");
  previewAbortController = new AbortController();
  const { signal } = previewAbortController;

  try {
    const params = new URLSearchParams({ voiceId: voice.id, engine: voice.engine });
    const response = await fetch(`/api/voice-preview?${params}`, { signal });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Nao foi possivel gerar a previa da voz.");
    }
    const blob = await response.blob();
    if (signal.aborted) return;
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(blob);
    previewPlayer.src = previewObjectUrl;
    await previewPlayer.play();
  } catch (error) {
    if (error.name !== "AbortError") showError(error.message);
  } finally {
    if (!signal.aborted) {
      previewButton.disabled = false;
      previewButton.classList.remove("loading");
    }
    previewAbortController = null;
  }
});

function listenToProgress(jobId) {
  const source = new EventSource(`/api/progress/${jobId}`);
  currentEventSource = source;

  source.addEventListener("extracting", () => {
    statusText.textContent = "Extraindo texto do arquivo...";
  });

  source.addEventListener("cleaning", () => {
    statusText.textContent = "Limpando texto e detectando dialogos...";
  });

  source.addEventListener("engine", (event) => {
    const { engine } = JSON.parse(event.data);
    statusText.textContent = `Motor de voz: ${engine === "piper" ? "Piper TTS (offline)" : "Microsoft Edge TTS"}`;
  });

  source.addEventListener("synthesizing", (event) => {
    const { current, total } = JSON.parse(event.data);
    statusText.textContent = `Narrando ${current}/${total} trechos...`;
    progressBar.hidden = false;
    progressBar.max = total;
    progressBar.value = current;
  });

  source.addEventListener("warning", (event) => {
    const { message } = JSON.parse(event.data);
    showWarning(message);
  });

  source.addEventListener("done", (event) => {
    const { savedPath } = JSON.parse(event.data);
    source.close();
    currentEventSource = null;
    currentJobId = null;
    finishGeneration(() => {
      showFormView();
      resetStatus();
      statusText.textContent = `Audiobook pronto! Salvo em ${savedPath}`;
      generateButton.disabled = false;
    });
  });

  source.addEventListener("failed", (event) => {
    const { message } = JSON.parse(event.data);
    source.close();
    currentEventSource = null;
    currentJobId = null;
    finishGeneration(() => {
      showFormView();
      resetStatus();
      generateButton.disabled = false;
      showError(message || "Ocorreu um erro ao gerar o audiobook.");
    });
  });

  source.addEventListener("error", () => {
    if (source.readyState === EventSource.CLOSED) return;
    source.close();
    currentEventSource = null;
    currentJobId = null;
    finishGeneration(() => {
      showFormView();
      resetStatus();
      generateButton.disabled = false;
      showError("A conexao com o servidor foi perdida.");
    });
  });
}

cancelButton.addEventListener("click", () => {
  if (!confirm("Tem certeza que deseja cancelar a geracao do audiobook?")) return;

  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }
  if (currentJobId) {
    fetch(`/api/cancel/${currentJobId}`, { method: "POST" }).catch(() => {});
    currentJobId = null;
  }
  game.stop();
  pendingFinish = null;
  generateButton.disabled = false;
  clearError();
  showFormView();
  resetStatus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  if (!selectedFile) {
    showError("Arraste ou selecione um arquivo PDF ou TXT.");
    return;
  }
  if (!voiceSelect.value) {
    showError("Selecione uma voz.");
    return;
  }
  const folderName = folderNameInput.value.trim();
  if (!folderName) {
    showError("Informe o nome do livro.");
    return;
  }

  const voice = JSON.parse(voiceSelect.value);
  const formData = new FormData();
  formData.append("folderName", folderName);
  formData.append("file", selectedFile);
  formData.append("voiceId", voice.id);
  formData.append("voiceEngine", voice.engine);

  generateButton.disabled = true;
  statusText.textContent = "Enviando arquivo...";

  try {
    const response = await fetch("/api/generate", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Nao foi possivel iniciar a geracao.");
    currentJobId = data.jobId;
    showGeneratingView();
    statusText.textContent = "Preparando...";
    progressBar.hidden = true;
    progressBar.value = 0;
    warningText.hidden = true;
    listenToProgress(data.jobId);
  } catch (error) {
    showError(error.message);
    resetStatus();
    generateButton.disabled = false;
  }
});

loadVoices();
