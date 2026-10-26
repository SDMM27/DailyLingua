"""
Builds the word-frequency lists of the app (phase K2) from wordfreq.

For every language of the registry (src/lib/domain/languages.ts) it writes
src/lib/frequency/data/<code>.json: the 5000 most frequent forms, most frequent first. Run by hand,
never at build time or in CI; the output is committed.

How to re-run it (wordfreq is not an app dependency, use a throw-away virtual environment):

    python -m venv .venv-frequency
    .venv-frequency/Scripts/python -m pip install wordfreq      # bin/python on Linux and macOS
    .venv-frequency/Scripts/python -X utf8 scripts/frequency/build.py

wordfreq's Chinese, Japanese and Korean lists only need the data files shipped in the package: the
extra tokenizers (jieba, MeCab) are for looking up running text, and this script only reads the
lists. The wordfreq code of a language is the app's code (checked below against what the
installed version offers); Chinese is "zh" (simplified characters, words cut by jieba).

Normalisation: the forms are lowercased, deduplicated, and kept only when they contain a letter
(numbers and punctuation are dropped). The finer normalisation (stress marks, ё/е, Arabic short
vowels, Greek final sigma, locale lowercasing) is applied by the TypeScript side when it loads
the lists (src/lib/frequency/index.ts, via normalizeWord in src/lib/domain/frequency.ts), with the
same function as the one applied to the text it measures: that is what guarantees that lookups
match. The ranks are computed there, after that normalisation.

Licence of the output: CC BY-SA 4.0, see src/lib/frequency/data/LICENSE.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

from wordfreq import available_languages, top_n_list

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "src" / "lib" / "domain" / "languages.ts"
OUT = ROOT / "src" / "lib" / "frequency" / "data"
SIZE = 5000
# Asked of wordfreq, then filtered: numbers and symbols are not kept.
FETCH_STEPS = (6000, 8000, 12000, 20000)


def registry_codes() -> list[str]:
    """Language codes of the registry: the keys of LANGUAGE_REGISTRY (`  ru: { code: "ru", ...`)."""
    codes = re.findall(r'^  ([a-z]{2}): \{ code: "\1"', REGISTRY.read_text(encoding="utf-8"), re.M)
    if not codes:
        sys.exit(f"No language found in {REGISTRY}")
    return codes


def has_letter(form: str) -> bool:
    return any(unicodedata.category(ch).startswith("L") for ch in form)


def top_forms(code: str) -> list[str]:
    forms: list[str] = []
    for fetch in FETCH_STEPS:
        seen: set[str] = set()
        forms = []
        for raw in top_n_list(code, fetch):
            form = raw.strip().lower()
            if form and has_letter(form) and form not in seen:
                seen.add(form)
                forms.append(form)
        if len(forms) >= SIZE:
            break
    return forms[:SIZE]


def main() -> None:
    codes = registry_codes()
    offered = available_languages()
    missing = [c for c in codes if c not in offered]
    if missing:
        sys.exit(f"wordfreq has no list for: {', '.join(missing)}")
    OUT.mkdir(parents=True, exist_ok=True)
    for code in codes:
        forms = top_forms(code)
        if len(forms) < SIZE:
            print(f"{code}: only {len(forms)} forms (wordfreq list is shorter than {SIZE})")
        # Compact, one line, real characters (not \u escapes); LF so the files are stable across systems.
        (OUT / f"{code}.json").write_text(json.dumps(forms, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
        print(f"{code}: {len(forms)} forms, first: {' '.join(forms[:6])}")


if __name__ == "__main__":
    main()
