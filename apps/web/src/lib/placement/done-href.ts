/**
 * Where the learner goes once the result is saved: the path of the language when it is the primary enrollment
 * (the only one `/parcours/[lang]` serves), otherwise the progress page of that language.
 */
export function placementDoneHref(language: string, enrollments: readonly { language: string }[]): string {
  return enrollments[0]?.language === language ? `/parcours/${language}` : `/progress?lang=${language}`;
}
