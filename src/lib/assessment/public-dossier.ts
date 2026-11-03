import { ASSESSMENT_LIMITS, type AssessmentDossier } from "@/lib/schemas/assessment";
import type { CefrLevel, Language } from "@/lib/schemas/common";
import type { ListeningMode } from "./policy";

/** A question as the learner sees it: no reference answer, no expected points. */
export interface PublicQuestion {
  id: string;
  prompt: string;
}

/**
 * What the browser may know of a dossier. Built by `toPublicDossier` and passed to client components
 * instead of the dossier: it has no reference answer, no expected point, and the listening script
 * only for a draft without recording (local work).
 */
export interface PublicDossier {
  id: string;
  language: Language;
  level: CefrLevel;
  title: string;
  reading: { text: string; questions: PublicQuestion[] };
  listening: {
    questions: PublicQuestion[];
    /** The recording, when `mode` is "audio". */
    audioSrc: string | null;
    /** The script, only when `mode` is "draft-script". */
    draftScript: string | null;
  };
  writing: { prompt: string; sentences: number };
}

const publicQuestion = ({ id, prompt }: { id: string; prompt: string }): PublicQuestion => ({ id, prompt });

/**
 * Projection of a dossier for the browser. Every field is copied by name (never spread), so a field
 * added to the dossier schema stays on the server until it is added here on purpose. `mode` comes
 * from `listeningMode(dossier, policy)`; a dossier that is recorded gets its audio URL whatever the
 * mode asked, only when the mode is "audio".
 */
export function toPublicDossier(dossier: AssessmentDossier, mode: ListeningMode): PublicDossier {
  return {
    id: dossier.id,
    language: dossier.language,
    level: dossier.level,
    title: dossier.title,
    reading: { text: dossier.reading.text, questions: dossier.reading.questions.map(publicQuestion) },
    listening: {
      questions: dossier.listening.questions.map(publicQuestion),
      audioSrc: mode === "audio" && dossier.audio ? dossier.audio.file : null,
      draftScript: mode === "draft-script" ? dossier.listening.script : null,
    },
    writing: { prompt: dossier.writing.prompt, sentences: ASSESSMENT_LIMITS[dossier.level].sentences },
  };
}
