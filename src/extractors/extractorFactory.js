import path from "node:path";
import { extractFromPdf } from "./pdfExtractor.js";
import { extractFromTxt } from "./txtExtractor.js";

export async function extractBook(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") return extractFromPdf(filePath);
  if (extension === ".txt") return extractFromTxt(filePath);
  throw new Error(`Formato de arquivo nao suportado: ${extension}`);
}
