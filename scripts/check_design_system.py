#!/usr/bin/env python3
"""Design-system governance gate (v2).

Scans the COMPILED build output for values the design system bans — the laws
enforced mechanically, per /brand/ ch.31 ("The build gates enforce the laws").

Usage:
    python3 scripts/check_design_system.py [--site DIR] [--strict]

    --site    built-site directory (default: _site)
    --strict  exit 1 on any failure (for CI; default prints report only)

Every whitelist below is EXACT and documented — a new deviation fails the gate
even if an old, ratified one looks similar. When a whitelist entry is retired
(e.g. the quiz island was migrated 2026-06-05), remove it here so regressions
can't hide behind it.
"""
import argparse
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------- whitelists
# Law II — the only rounding is the 21% tile. These survivors are the
# documented instrument/export carve-outs (board minutes 2026-06-05).
RADIUS_WHITELIST = {
    "0", "21%", "0 0 0 0",
    "6px",                      # .carousel-card — Instagram export canvas
    "calc(4 * var(--s) * 1px)", # carousel export-card internals
    "1px",                      # carousel progress segments (export chrome)
    "8px",                      # carousel export internals
}

# Law V — flat. Exact surviving shadows: floating overlays (layer disambiguation)
# and two soft focus rings. Anything else fails.
SHADOW_WHITELIST = {
    "none", "none !important",
    "0 0 0 2px rgba(0,0,0,0.05)",   # jaq/pulse focus ring
    "0 2px 8px rgba(0,0,0,0.25)",   # calendar tooltip (floating overlay)
    "0 2px 10px rgba(0,0,0,0.2)",   # share tooltip (floating overlay)
}

# Containers — the three stops, plus documented component-internal rem modules.
WIDTH_STOPS = {"32rem", "38rem", "60rem"}  # prose 40->38rem (reading measure, Matt 2026-06-06)
WIDTH_INTERNAL_WHITELIST = {
    "22rem",  # quiz subscribe form (module inside the column)
    "28rem",  # quiz verdict (module inside the column)
}

# Colors the system retired — must never reappear anywhere in the build.
BANNED_COLOR_PATTERNS = [
    r"#ffe6e4", r"#ffc3be",                  # the rejected pinks (pre-B+D)
    r"#268bd2",                              # Solarized blue
    r"rgba\(200,\s*50,\s*50", r"rgba\(38,\s*139,\s*210",  # alpha-made highlights
]

# Night printing (shipped 2026-06-07): the night block must exist with the
# locked core values; no Sass var may leak un-interpolated into a custom
# property (Ruby Sass 3.7.4 emits `--x: $y` literally — verified by test).
NIGHT_LOCKED_VALUES = ["--c-bg: #16191d", "--c-ink: #cdc9c1", "--c-link: #e67a75"]

# Pages allowed to carry @font-face (D-B ruling 2026-06-05: /live/ stays as-is).
FONTFACE_EXEMPT_PAGES = {"live/index.html"}

FLOOR_REM = 0.7  # hard floor — nothing under this renders as standing text
TYPE_STOPS = {"2.5", "1.65", "1.25", "1.2", "1.1", "1", "0.9", "0.85", "0.8", "0.75",
              "0.7", ".9", ".85", ".8", ".75", ".7", "1.0625", "1.0125", "1.125"}  # incl. root clamp parts
# em survives only where inheritance is the point (bible Ch.11 microtype grammar)
EM_GRAMMAR_SELECTORS = ("abbr", "code", "blockquote", "correction")
# selectors allowed off-stop: instrument numerals (data displays), decorative glyphs,
# and the two RATIFIED brand-chrome sizes (masthead title + author hero at 2rem, owner 2026-06-06)
STOP_EXEMPT_SELECTORS = ("stat-value", "counter-number", "timer-display", "quiz-score-number",
                          "hr+ul li::before", "masthead-title", "author-hero__name", "carousel-card")

KEY_PAGES = ["index.html", "membership/index.html", "archive/index.html",
             "brand/index.html", "faq/index.html"]


def find_css(site: Path):
    return [p for p in [site / "styles.css", site / "public/css/quiz.css"] if p.exists()]


def check(site: Path):
    failures, notes = [], []
    css_texts = {p: p.read_text() for p in find_css(site)}

    # Selectors exempt from specific checks (documented carve-outs):
    # the carousel export canvas is an Instagram graphic, not site chrome.
    EXPORT_SELECTOR = re.compile(r"carousel-card|carousel-progress")

    # Law II scoped carve-out: the radio control wears a circle — ratified in
    # the brand book, Law II "One exception (2026-06-09)" (/brand/, scoped to
    # the radio indicator only; reconfirmed by Matt 2026-07-06 when this gate
    # was taught the exception it had never been given).
    RADIO_CIRCLE_SELECTOR = re.compile(r'survey-option:has\(input\[type="?radio"?\]\)')

    for path, css in css_texts.items():
        name = path.name
        # parse into (selector, body) rule blocks for selector-aware checks
        rules = re.findall(r"([^{}]+)\{([^{}]*)\}", css)
        for sel, body in rules:
            is_export = bool(EXPORT_SELECTOR.search(sel))
            # Law II — radii
            for m in re.finditer(r"border-radius:\s*([^;]+)", body):
                v = m.group(1).strip()
                if v == "50%" and RADIO_CIRCLE_SELECTOR.search(sel):
                    continue  # ratified radio-circle carve-out (see above)
                if v not in RADIUS_WHITELIST:
                    failures.append(f"{name}: {sel.strip()[:50]} border-radius '{v}' (Law II)")
            # Law V — shadows
            for m in re.finditer(r"box-shadow:\s*([^;]+)", body):
                v = re.sub(r"\s+", " ", m.group(1).strip())
                if v not in SHADOW_WHITELIST and "inset" not in v:
                    failures.append(f"{name}: {sel.strip()[:50]} box-shadow '{v}' (Law V)")
            # Weights — 400/600/700 (export canvas may carry display 900)
            for m in re.finditer(r"font-weight:\s*(\d+|lighter|bolder)", body):
                v = m.group(1)
                if v not in {"400", "600", "700"} and not (is_export and v == "900"):
                    failures.append(f"{name}: {sel.strip()[:50]} font-weight {v} — system is 400/600/700")
            # Type stops — every rem size sits on the role scale (P2 gate v2.1);
            # em is sanctioned relative grammar only at enumerated selectors; % banned.
            for m in re.finditer(r"font-size:\s*([^;]+)", body):
                v = m.group(1).strip()
                inner = re.findall(r"([\d.]+)rem", v)  # recurses into clamp()/max() args
                if v.endswith("em") and not v.endswith("rem"):
                    if v != "1em" and not any(g in sel for g in EM_GRAMMAR_SELECTORS):
                        failures.append(f"{name}: {sel.strip()[:50]} font-size {v} — em outside sanctioned grammar")
                elif "%" in v and v != "100%":
                    failures.append(f"{name}: {sel.strip()[:50]} font-size {v} — %% retired")
                elif inner and "clamp" not in v and "max(" not in v:
                    for g in inner:
                        if g not in TYPE_STOPS and not any(w in sel for w in STOP_EXEMPT_SELECTORS):
                            failures.append(f"{name}: {sel.strip()[:50]} font-size {g}rem off the role scale")
            # Containers
            for m in re.finditer(r"max-width:\s*([\d.]+rem)", body):
                v = m.group(1)
                if v not in WIDTH_STOPS and v not in WIDTH_INTERNAL_WHITELIST:
                    failures.append(f"{name}: {sel.strip()[:50]} max-width {v} not a stop or documented internal")
        # Banned colors (whole sheet)
        for pat in BANNED_COLOR_PATTERNS:
            if re.search(pat, css, re.I):
                failures.append(f"{name}: banned color {pat} present")
        # Law VI — a REAL @font-face rule (not the word in a comment)
        if re.search(r"@font-face\s*\{", css):
            failures.append(f"{name}: @font-face rule present (Law VI — zero webfonts)")

    # Built-page checks
    for rel in KEY_PAGES:
        page = site / rel
        if not page.exists():
            notes.append(f"skip (absent): {rel}")
            continue
        html = page.read_text()
        # duplicate ids
        ids = re.findall(r'\bid="([^"]+)"', html)
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            failures.append(f"{rel}: duplicate ids {sorted(dupes)[:5]}")
        # banned colors in inline styles
        for pat in BANNED_COLOR_PATTERNS[:2]:
            if re.search(pat, html, re.I):
                failures.append(f"{rel}: banned color {pat} in markup")

    # Law VI sweep across all built pages (cheap: grep @font-face)
    for page in site.rglob("*.html"):
        rel = str(page.relative_to(site))
        if rel in FONTFACE_EXEMPT_PAGES:
            continue
        try:
            if re.search(r"@font-face\s*\{", page.read_text(errors="ignore")):
                failures.append(f"{rel}: @font-face rule in page (Law VI; only /live/ is exempt per D-B)")
        except OSError:
            pass

    # Night printing gates (2026-06-07) — compiled + SOURCE scans (spec §6.7.4)
    repo = site.parent if (site.parent / "_sass").exists() else Path(".")
    source_files = sorted((repo / "_sass").glob("*.scss")) + sorted((repo / "public/css").glob("*.css"))
    page_style_files = [repo / p for p in ("do-something/index.md", "just-asking-questions/index.html",
                                           "pulse/enter/index.html", "pulse/thanks/index.html")]
    # Pin whitelist: values that legitimately live as literals in source (chrome + exempt surfaces).
    # Everything below is documented in the night spec §6.3 / §4 — additions need a ruling.
    SOURCE_BANNED = {
        r"#ddd\b": "border-light merge — #ddd retired 2026-06-07",
        r"#fafafa\b": "blockquote-bg merge — #fafafa retired",
        r"#dddddd\b": "border-light merge — retired",
    }
    for f in source_files + [p for p in page_style_files if p.exists()]:
        text = f.read_text()
        for pat, why in SOURCE_BANNED.items():
            for m in re.finditer(pat, text):
                # allow inside comments referencing history
                line = text[:m.start()].split("\n")[-1] + text[m.start():].split("\n")[0]
                if "//" in line.split(pat.strip("\\b"))[0] or "/*" in line:
                    continue
                failures.append(f"{f.name}: retired literal {pat} present ({why})")
        # self-referential custom properties (--x: var(--x))
        for m in re.finditer(r"(--[a-z0-9_-]+):\s*var\(\s*\1\s*[,)]", text):
            failures.append(f"{f.name}: self-referential custom property {m.group(1)}")
        # un-interpolated Sass vars inside custom props, at SOURCE level
        if f.suffix == ".scss":
            for m in re.finditer(r"--[a-z0-9_-]+:\s*\$[a-z0-9_-]+", text):
                failures.append(f"{f.name}: un-interpolated Sass var in custom property (source): {m.group(0)}")

    # Night printing gates (2026-06-07)
    main_css = css_texts.get(site / "styles.css", "")
    if '[data-theme="night"]' not in main_css:
        failures.append('styles.css: night token block missing ([data-theme="night"])')
    else:
        for tok in NIGHT_LOCKED_VALUES:
            if tok not in main_css:
                failures.append(f"styles.css: night locked value drifted or missing: {tok}")
    for path, css in css_texts.items():
        for m in re.finditer(r"--[a-z0-9_-]+:\s*\$[a-z0-9_-]+", css):
            failures.append(f"{path.name}: un-interpolated Sass var in custom property: {m.group(0)}")

    return failures, notes


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--site", default="_site")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    site = Path(args.site)
    if not site.exists():
        print(f"build dir {site} not found — run `bundle exec jekyll build` first", file=sys.stderr)
        sys.exit(2)

    failures, notes = check(site)
    for n in notes:
        print(f"  note: {n}")
    if failures:
        print(f"\nDESIGN GATE: {len(failures)} FAILURE(S)")
        for f in failures:
            print(f"  FAIL {f}")
        sys.exit(1 if args.strict else 0)
    print("DESIGN GATE: clean — the laws hold")


if __name__ == "__main__":
    main()
