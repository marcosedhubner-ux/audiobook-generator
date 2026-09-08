import { readFile } from "node:fs/promises";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = import.meta.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
const standardFontDataUrl = import.meta.resolve("pdfjs-dist/standard_fonts/");

function reconstructLines(textContentItems) {
  const lines = [];
  let currentLine = "";
  for (const item of textContentItems) {
    currentLine += item.str;
    if (item.hasEOL) {
      lines.push(currentLine);
      currentLine = "";
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  return lines;
}

export async function extractFromPdf(filePath) {
  const data = new Uint8Array(await readFile(filePath));
  const loadingTask = getDocument({ data, standardFontDataUrl });
  const document = await loadingTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pages.push(reconstructLines(textContent.items));
  }
  await loadingTask.destroy();
  return { pages };
}
