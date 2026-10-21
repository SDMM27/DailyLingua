import { describe, expect, it } from "vitest";
import { checkGrammarCourse } from "../check-course";
import { GRAMMAR_CURRICULUM } from "../curriculum";
import { GRAMMAR_COURSES, grammarLanguages, grammarPoint } from ".";

describe("grammar courses", () => {
  it("has a course for every language of the curriculum, and only those", () => {
    expect(grammarLanguages().sort()).toEqual(Object.keys(GRAMMAR_CURRICULUM).sort());
  });

  it.each(Object.keys(GRAMMAR_CURRICULUM))("the %s course follows the authoring rules", (code) => {
    expect(checkGrammarCourse(code, GRAMMAR_COURSES[code as keyof typeof GRAMMAR_COURSES])).toEqual([]);
  });

  it("uses each point id once across the courses", () => {
    const ids = Object.values(GRAMMAR_COURSES).flatMap((course) => course.points.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds a point by id", () => {
    const first = Object.values(GRAMMAR_COURSES)[0]?.points[0];
    if (first) expect(grammarPoint(first.id)).toBe(first);
    expect(grammarPoint("xx-a1-nothing")).toBeUndefined();
  });
});
