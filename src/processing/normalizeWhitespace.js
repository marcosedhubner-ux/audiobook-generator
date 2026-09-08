const PARAGRAPH_START = /^[—–"“«\-]/;
const SENTENCE_END = /[.!?…"»”]$/;

export function linesToParagraphs(lines) {
  const paragraphs = [];
  let current = [];

  const flush = () => {
    if (current.length === 0) return;
    const text = current.join(" ").replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
    current = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const lastLine = current.at(-1);
    const startsNewParagraph =
      current.length > 0 && (PARAGRAPH_START.test(line) || (lastLine && SENTENCE_END.test(lastLine)));
    if (startsNewParagraph) flush();
    current.push(line);
  }
  flush();

  return paragraphs;
}
