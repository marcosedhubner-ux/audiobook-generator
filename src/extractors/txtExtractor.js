import { readFile } from "node:fs/promises";

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export async function extractFromTxt(filePath) {
  const raw = stripBom(await readFile(filePath, "utf-8"));
  const pages = raw
    .split("\f")
    .map((page) => page.split(/\r\n|\r|\n/));
  return { pages };
}
