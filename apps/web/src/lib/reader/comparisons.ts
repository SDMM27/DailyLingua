interface ReaderComparison {
  sourceLanguage: string;
  sourceWord: string;
  kind: "sameMeaning" | "falseFriend";
  sourceExample?: string;
  sourceMeaning?: { text: string; language: string };
}

interface EditorialComparison extends Omit<ReaderComparison, "sourceMeaning"> {
  targetLanguage: string;
  targetLemma: string;
  sourceMeanings?: Readonly<Record<string, string>>;
}

// Each ID is assigned to a specific sense by the text editor. See the pilot specification for the sources.
const comparisons: Readonly<Partial<Record<string, EditorialComparison>>> = {
  "es-it-importante-significant": {
    sourceLanguage: "es", sourceWord: "importante", targetLanguage: "it", targetLemma: "importante",
    kind: "sameMeaning", sourceExample: "Es importante hacer una lista.",
  },
  "es-it-burro-butter": {
    sourceLanguage: "es", sourceWord: "burro", targetLanguage: "it", targetLemma: "burro",
    kind: "falseFriend", sourceExample: "El burro come hierba.",
    sourceMeanings: { fr: "âne", en: "donkey", es: "asno" },
  },
};

export function readerComparison(id: string | undefined, language: string, lemma: string, explanationLanguage: string,
  knownLanguages: readonly string[]): ReaderComparison | undefined {
  if (!id || !Object.hasOwn(comparisons, id)) return;
  const note = comparisons[id];
  if (!note || note.targetLanguage !== language || note.targetLemma !== lemma ||
    (note.sourceLanguage !== explanationLanguage && !knownLanguages.includes(note.sourceLanguage))) return;
  const explanation = note.sourceMeanings?.[explanationLanguage];
  const text = explanation ?? note.sourceMeanings?.[note.sourceLanguage];
  return {
    sourceLanguage: note.sourceLanguage, sourceWord: note.sourceWord, kind: note.kind, sourceExample: note.sourceExample,
    ...(text ? { sourceMeaning: { text, language: explanation ? explanationLanguage : note.sourceLanguage } } : {}),
  };
}
