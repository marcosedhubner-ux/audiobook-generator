const ROMAN_NUMERAL = /^m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i;
const PAGE_LABEL = /^(p[aá]gina|pag\.?|page)\s*\d+(\s*(de|of)\s*\d+)?$/i;
const DASHED_NUMBER = /^-{1,2}\s*\d{1,4}\s*-{1,2}$/;
const PLAIN_NUMBER = /^\d{1,4}$/;

function isPageArtifactLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (PLAIN_NUMBER.test(trimmed)) return true;
  if (trimmed.length <= 8 && ROMAN_NUMERAL.test(trimmed) && trimmed.length >= 1) return true;
  if (PAGE_LABEL.test(trimmed)) return true;
  if (DASHED_NUMBER.test(trimmed)) return true;
  return false;
}

export function removePageNumberLines(pages) {
  return pages.map((page) => page.filter((line) => !isPageArtifactLine(line)));
}

function normalizeCandidate(line) {
  return line
    .trim()
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ");
}

export function removeRepeatedHeadersFooters(pages, edgeLinesToCheck = 2) {
  const totalPages = pages.filter((page) => page.some((line) => line.trim())).length;
  if (totalPages < 3) return pages;

  const frequency = new Map();

  for (const page of pages) {
    const nonEmpty = page.filter((line) => line.trim());
    const candidates = new Set([
      ...nonEmpty.slice(0, edgeLinesToCheck),
      ...nonEmpty.slice(-edgeLinesToCheck),
    ]);
    for (const line of candidates) {
      const key = normalizeCandidate(line);
      if (!key) continue;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
  }

  const threshold = totalPages * 0.5;
  const artifactKeys = new Set(
    [...frequency.entries()].filter(([, count]) => count > threshold).map(([key]) => key)
  );
  if (artifactKeys.size === 0) return pages;

  return pages.map((page) => {
    const nonEmptyIndexes = page
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.trim());
    const removableIndexes = new Set([
      ...nonEmptyIndexes.slice(0, edgeLinesToCheck),
      ...nonEmptyIndexes.slice(-edgeLinesToCheck),
    ]
      .filter(({ line }) => artifactKeys.has(normalizeCandidate(line)))
      .map(({ index }) => index));
    return page.filter((_, index) => !removableIndexes.has(index));
  });
}
