import { GRAMMAR_GAP, grammarCourseSchema, type GrammarPoint } from "@/lib/schemas/grammar";
import { GRAMMAR_CURRICULUM } from "./curriculum";

/**
 * Problems of a grammar course against the mechanical authoring rules (AUTHORING.md); empty when
 * the course is valid. Shared by the unit test and `npm run grammar:check`.
 */
export function checkGrammarCourse(code: string, raw: unknown): string[] {
  const parsed = grammarCourseSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  }
  const course = parsed.data;
  const problems: string[] = [];
  if (course.language !== code) problems.push(`language is ${course.language}, expected ${code}`);

  const expected = GRAMMAR_CURRICULUM[code] ?? [];
  const actualIds = course.points.map((p) => p.id);
  const expectedIds = expected.map((p) => p.id);
  if (actualIds.join(",") !== expectedIds.join(",")) {
    problems.push(`points must be, in this order: ${expectedIds.join(", ")} (got ${actualIds.join(", ") || "none"})`);
  }

  for (const point of course.points) {
    const planned = expected.find((p) => p.id === point.id);
    if (planned && planned.level !== point.level) problems.push(`${point.id}: level ${point.level}, expected ${planned.level}`);
    if (!point.id.startsWith(`${code}-${point.level.toLowerCase()}-`)) problems.push(`${point.id}: id does not match ${code} ${point.level}`);
    problems.push(...exerciseProblems(point));
  }
  return problems;
}

function exerciseProblems(point: GrammarPoint): string[] {
  const problems: string[] = [];
  const types = new Set(point.exercises.map((e) => e.type));
  if (types.size < 2) problems.push(`${point.id}: mix at least two exercise types`);
  point.exercises.forEach((exercise, index) => {
    const where = `${point.id} exercise ${index + 1}`;
    if (exercise.type === "transform") {
      if (exercise.source.includes(GRAMMAR_GAP)) problems.push(`${where}: a transform source has no gap`);
      return;
    }
    if (exercise.prompt.split(GRAMMAR_GAP).length !== 2) problems.push(`${where}: the prompt must contain ${GRAMMAR_GAP} exactly once`);
    if (exercise.type === "choose") {
      const normalized = exercise.options.map((o) => o.trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) problems.push(`${where}: duplicate options`);
    } else {
      const accepted = exercise.answers.map((a) => a.trim().toLowerCase());
      if (new Set(accepted).size !== accepted.length) problems.push(`${where}: duplicate answers`);
    }
  });
  return problems;
}
