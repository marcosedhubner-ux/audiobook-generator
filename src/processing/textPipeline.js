import { fixBrokenHyphenation } from "./dehyphenate.js";
import { markDialogueParagraphs } from "./dialogueDetector.js";
import { linesToParagraphs } from "./normalizeWhitespace.js";
import { buildSegments } from "./paragraphSegmenter.js";
import { removePageNumberLines, removeRepeatedHeadersFooters } from "./pageArtifacts.js";

export function runTextPipeline(extraction) {
  const semNumeracao = removePageNumberLines(extraction.pages);
  const semCabecalhoRodape = removeRepeatedHeadersFooters(semNumeracao);
  const semHifenizacao = fixBrokenHyphenation(semCabecalhoRodape);
  const linhas = semHifenizacao.flat();
  const paragrafos = linesToParagraphs(linhas);
  const paragrafosComDialogo = markDialogueParagraphs(paragrafos);
  const segments = buildSegments(paragrafosComDialogo);
  return { segments, paragrafosComDialogo };
}

export function formatDebugText(paragrafosComDialogo) {
  return paragrafosComDialogo
    .map(({ text, isDialogue }) => (isDialogue ? `[FALA] ${text}` : text))
    .join("\n\n");
}
