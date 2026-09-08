const DIALOGUE_START = /^[—–]/;

export function markDialogueParagraphs(paragraphs) {
  return paragraphs.map((text) => ({ text, isDialogue: DIALOGUE_START.test(text) }));
}
