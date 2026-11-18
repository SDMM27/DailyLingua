import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "./source-files";

/**
 * Every visible string comes from `@dailylingua/i18n`. This walks the JSX of each `.tsx` file and
 * reports literal text (between tags, or in an expression) and literal values of the attributes
 * a screen reader or the page shows. A literal without any letter (an arrow, a slash, a bullet) is
 * a symbol, not a sentence, and is allowed: that is the whole list of exceptions.
 */
const TEXT_ATTRIBUTES = new Set(["aria-label", "aria-description", "aria-placeholder", "aria-roledescription", "placeholder", "title", "alt"]);
const HAS_LETTER = /\p{L}/u;

export function findHardcodedText(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: string[] = [];
  const report = (node: ts.Node, text: string) => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    problems.push(`${fileName}:${line + 1}: ${JSON.stringify(text.trim())}`);
  };
  const literalText = (node: ts.Node | undefined): string | null => {
    if (!node) return null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isJsxExpression(node)) return literalText(node.expression);
    return null;
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) report(node, node.text);
    // {"text"} as a child of an element.
    if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const text = literalText(node);
      if (text !== null && HAS_LETTER.test(text)) report(node, text);
    }
    if (ts.isJsxAttribute(node) && TEXT_ATTRIBUTES.has(node.name.getText(file))) {
      const text = literalText(node.initializer);
      if (text !== null && HAS_LETTER.test(text)) report(node, `${node.name.getText(file)}=${text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}

describe("no hard-coded visible text", () => {
  it("finds literal JSX text and literal text attributes (the check itself works)", () => {
    const sample = `
      export const A = () => (
        <div title="Hello" data-x="ok">
          Bonjour
          <input aria-label="Nom" placeholder={"Nom"} alt={\`x\`} />
          {"Texte"}
          <span aria-hidden="true">→</span>
          <i>{t("key")}</i>
        </div>
      );`;
    expect(findHardcodedText("sample.tsx", sample)).toHaveLength(6);
  });

  it("finds none in the app", () => {
    const problems = sourceFiles([".tsx"]).flatMap(({ path, text }) => findHardcodedText(path, text));
    expect(problems).toEqual([]);
  });

  it("looks at a meaningful number of files", () => {
    expect(sourceFiles([".tsx"]).length).toBeGreaterThan(10);
  });
});
