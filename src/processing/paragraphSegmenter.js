import {
  MAX_PARAGRAPH_CHARS,
  PAUSE_DIALOGUE_MS,
  PAUSE_PARAGRAPH_MS,
  PAUSE_SUBCHUNK_MS,
} from "../config.js";

const ABBREVIATIONS = new Set([
  "sr", "sra", "srta", "dr", "dra", "prof", "profa", "etc", "ex",
  "ed", "vol", "pag", "pág", "art", "n", "nº", "cf", "apud", "cap",
]);

function splitIntoSentences(text) {
  const rawParts = text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý"«“—–])/u);
  const sentences = [];
  let buffer = "";

  for (const part of rawParts) {
    buffer = buffer ? `${buffer} ${part}` : part;
    const abbreviationMatch = buffer.match(/(\p{L}+)\.\s*$/u);
    const endsWithAbbreviation =
      abbreviationMatch && ABBREVIATIONS.has(abbreviationMatch[1].toLowerCase());
    if (!endsWithAbbreviation) {
      sentences.push(buffer.trim());
      buffer = "";
    }
  }
  if (buffer.trim()) sentences.push(buffer.trim());

  return sentences.length > 0 ? sentences : [text];
}

export function buildSegments(dialogueMarkedParagraphs) {
  const segments = [];

  dialogueMarkedParagraphs.forEach(({ text, isDialogue }, paragraphIndex) => {
    const pauseForNewParagraph =
      paragraphIndex === 0 ? 0 : isDialogue ? PAUSE_DIALOGUE_MS : PAUSE_PARAGRAPH_MS;

    if (text.length <= MAX_PARAGRAPH_CHARS) {
      segments.push({
        id: segments.length,
        text,
        isDialogue,
        isSubChunk: false,
        pauseBeforeMs: pauseForNewParagraph,
      });
      return;
    }

    splitIntoSentences(text).forEach((sentence, sentenceIndex) => {
      segments.push({
        id: segments.length,
        text: sentence,
        isDialogue,
        isSubChunk: sentenceIndex > 0,
        pauseBeforeMs: sentenceIndex === 0 ? pauseForNewParagraph : PAUSE_SUBCHUNK_MS,
      });
    });
  });

  return segments;
}
