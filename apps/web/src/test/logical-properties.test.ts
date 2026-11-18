import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "./source-files";

/**
 * The layout must mirror for right-to-left languages: only logical utilities (`ms-`, `me-`, `ps-`,
 * `pe-`, `start-`, `end-`, `text-start`, `text-end`…), never the physical ones (`ml-`, `mr-`, `pl-`,
 * `pr-`, `left-`, `right-`, `text-left`, `text-right`…), and in CSS only logical properties.
 */
const PHYSICAL_UTILITY = [
  /^-?(m|p)(l|r)-/,
  /^-?(left|right)-/,
  /^text-(left|right)$/,
  /^(float|clear)-(left|right)$/,
  /^(rounded|border)-(l|r|tl|tr|bl|br)(-|$)/,
  /^scroll-(m|p)(l|r)-/,
];
const PHYSICAL_CSS = [
  /\b(margin|padding|border)-(left|right)\b/,
  /(?<![-\w])(left|right)\s*:/,
  /\btext-align\s*:\s*(left|right)\b/,
  /\b(float|clear)\s*:\s*(left|right)\b/,
  /\bborder-(top|bottom)-(left|right)-radius\b/,
];

/** The class-like tokens of a string, without their variants (`md:hover:ml-2` gives `ml-2`). */
function utilities(text: string): string[] {
  return text
    .split(/[\s"'`]+/)
    .map((token) => token.split(":").pop() ?? "")
    .map((token) => token.replace(/^!/, "").replace(/!$/, ""))
    .filter(Boolean);
}

export function findPhysicalUtilities(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: string[] = [];
  const check = (node: ts.Node, text: string) => {
    for (const token of utilities(text)) {
      if (PHYSICAL_UTILITY.some((pattern) => pattern.test(token))) {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
        problems.push(`${fileName}:${line + 1}: ${token}`);
      }
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node, node.text);
    if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) check(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}

export function findPhysicalCss(fileName: string, css: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  return stripped.split("\n").flatMap((line, index) =>
    PHYSICAL_CSS.some((pattern) => pattern.test(line)) ? [`${fileName}:${index + 1}: ${line.trim()}`] : [],
  );
}

describe("logical properties only", () => {
  it("finds physical utilities and CSS properties (the check itself works)", () => {
    const sample = `export const a = "ml-2 md:hover:pr-4 text-left -left-1 rounded-l-xl ms-2 pe-4 text-start start-0";
      export const b = \`mr-\${n} flex\`;`;
    expect(findPhysicalUtilities("sample.tsx", sample).map((entry) => entry.split(": ")[1])).toEqual([
      "ml-2",
      "pr-4",
      "text-left",
      "-left-1",
      "rounded-l-xl",
      "mr-",
    ]);
    expect(findPhysicalCss("sample.css", "a { margin-left: 1px; }\n/* padding-right: 0 */\nb { inset-inline-start: 0; text-align: right; left: 0 }")).toHaveLength(2);
  });

  it("uses none in the components and pages", () => {
    const problems = sourceFiles([".tsx", ".ts"]).flatMap(({ path, text }) => findPhysicalUtilities(path, text));
    expect(problems).toEqual([]);
  });

  it("uses none in the style sheets", () => {
    const css = sourceFiles([".css"]);
    expect(css.length).toBeGreaterThan(0);
    expect(css.flatMap(({ path, text }) => findPhysicalCss(path, text))).toEqual([]);
  });
});
