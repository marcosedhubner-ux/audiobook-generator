const WORD_CHAR = /[A-Za-zÀ-ÖØ-öø-ÿ]/;

function endsWithHyphenatedWord(line) {
  const trimmed = line.trimEnd();
  return trimmed.endsWith("-") && WORD_CHAR.test(trimmed.at(-2) ?? "");
}

function mergeHyphenatedLines(lines) {
  const merged = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    if (endsWithHyphenatedWord(line) && nextLine && WORD_CHAR.test(nextLine.trimStart().charAt(0))) {
      const withoutHyphen = line.trimEnd().slice(0, -1);
      const nextTrimmed = nextLine.trimStart();
      const [firstWord, ...rest] = nextTrimmed.split(/\s+/);
      merged.push(`${withoutHyphen}${firstWord}`);
      const remainder = rest.join(" ");
      lines[i + 1] = remainder;
      continue;
    }
    merged.push(line);
  }
  return merged;
}

export function fixBrokenHyphenation(pages) {
  return pages.map((page) => mergeHyphenatedLines([...page]));
}
