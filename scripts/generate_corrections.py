#!/usr/bin/env python3
"""Generate _data/corrections.json from the git history of _posts/.

Fully deterministic — no LLM anywhere. Pipeline:
  git log -p -U0 --diff-filter=M -- _posts/   (the repo's own diffs)
  -> five mechanical filter rules (see docs spec 2026-06-05)
  -> word-level diff segments (difflib LCS, same family as git --word-diff)
  -> _data/corrections.json rendered by Liquid templates.

Rules a change must survive:
  1. commit touches <=3 post files (drops bulk migrations)
  2. change is in the body (frontmatter excluded positionally)
  3. hunk has a removed line (pure additions are updates, not corrections)
  4. not whitespace-only
  5. not renumbering-only ("3/" -> "4/")

Usage:
  python3 _scripts/generate_corrections.py [--repo .] [--output _data/corrections.json] [--stats-only]
"""
import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from datetime import date, datetime
from difflib import SequenceMatcher

MAX_FILES_PER_COMMIT = 3       # rule 1
SIMILARITY_INLINE = 0.5        # >= -> inline word-diff; < -> stacked before/after
EQ_CONTEXT_WORDS = 10          # context kept around changes in inline mode
STACKED_MAX_WORDS = 60         # cap for stacked/deletion text

WS_RE = re.compile(r"\s+")
ITEM_NUM_RE = re.compile(r"^\d+/\s*")
IMG_RE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
CODE_RE = re.compile(r"`([^`]*)`")
# Non-greedy + dot so bold spans CONTAINING italics match ("**a *b* c**" was
# unmatched by [^*]+ and leaked literal asterisks into the corrections page).
BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
EM_RE = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")
# Diff lines can cut an emphasis span in half, leaving unpaired runs.
STRAY_EM_RE = re.compile(r"\*{1,3}")
# Trailing "\" = markdown hard-break; "\ " mid-line is the same artifact.
HARDBREAK_RE = re.compile(r"\\(?=\s|$)")
PIPE_RE = re.compile(r"\s*\|\s*")
ESC_RE = re.compile(r"\\([\\`*_{}\[\]()#+.!-])")
PROTECT_RE = re.compile("\x00(\\d+)\x00")
URL_RE = re.compile(r"https?://([^/\s)]+)[^\s)]*")
DAY_RE = re.compile(r"day-(\d+)", re.IGNORECASE)
# Legacy filenames in history: "2019-11-14-1029.md" (all-digit slug = day number)
LEGACY_NUM_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-(\d+)$")


def norm_ws(s):
    return WS_RE.sub(" ", s).strip()


def strip_item_number(s):
    return ITEM_NUM_RE.sub("", s)


def strip_markdown(s):
    # Hide backslash-escaped punctuation (\* -> literal *) from the rules below.
    s = ESC_RE.sub(lambda m: f"\x00{ord(m.group(1))}\x00", s)
    s = HARDBREAK_RE.sub("", s)        # markdown hard-breaks: trailing "\" artifacts
    s = IMG_RE.sub(r"\1", s)
    for _ in range(3):                 # nested/successive links
        s = LINK_RE.sub(r"\1", s)
    s = CODE_RE.sub(r"\1", s)
    for _ in range(2):                 # **bold (may contain *italics*)** -> inner -> plain
        s = BOLD_RE.sub(r"\1", s)
    s = EM_RE.sub(r"\1", s)
    s = STRAY_EM_RE.sub("", s)         # unpaired emphasis runs (diff cut mid-span)
    s = PIPE_RE.sub(" · ", s.strip(" |"))  # table-row pipes -> readable separators
    return PROTECT_RE.sub(lambda m: chr(int(m.group(1))), s)


def extract_domains(s):
    out = set()
    for m in URL_RE.finditer(s):
        host = m.group(1).lower()
        out.add(host[4:] if host.startswith("www.") else host)
    return out


def extract_urls(s):
    """Full URLs, trailing punctuation trimmed — same-domain swaps must count."""
    return {m.group(0).rstrip(".,;:") for m in URL_RE.finditer(s)}


def link_change_text(before, after):
    """Fixed-template description of a links-only change, or None if URLs equal."""
    ub, ua = extract_urls(before), extract_urls(after)
    if ub == ua:
        return None
    db, da = extract_domains(before), extract_domains(after)
    parts = []
    removed, added = sorted(db - da), sorted(da - db)
    if removed:
        parts.append("removed " + " / ".join(removed))
    if added:
        parts.append("added " + " / ".join(added))
    if not parts:                       # same domains, different URLs
        parts.append("updated " + " / ".join(sorted(da & db)))
    return "; ".join(parts)


def pair_hunk(removed_texts, added_texts):
    """Pair a hunk's removed/added body lines into (before, after) tuples.

    Equal counts pair line-by-line. Unequal counts are matched by line-level
    LCS on normalized keys (whitespace collapsed, item numbers stripped) so
    that an inserted item + renumber cascade pairs each surviving line with
    itself (filtered downstream as renumber-only) and the inserted lines are
    recognized as pure additions (rule 3, ignored). Genuinely rewritten
    regions (replace opcodes) are block-joined; removed-only lines become
    deletions ('' after).
    """
    if not removed_texts:
        return []
    if not added_texts:
        return [(r, "") for r in removed_texts]
    if len(removed_texts) == len(added_texts):
        return list(zip(removed_texts, added_texts))
    rk = [strip_item_number(norm_ws(t)) for t in removed_texts]
    ak = [strip_item_number(norm_ws(t)) for t in added_texts]
    pairs = []
    for op, i1, i2, j1, j2 in SequenceMatcher(None, rk, ak, autojunk=False).get_opcodes():
        if op == "equal":
            pairs.extend(zip(removed_texts[i1:i2], added_texts[j1:j2]))
        elif op == "replace":
            pairs.append(("\n".join(removed_texts[i1:i2]),
                          "\n".join(added_texts[j1:j2])))
        elif op == "delete":
            pairs.extend((r, "") for r in removed_texts[i1:i2])
        # 'insert' = pure addition inside the hunk -> ignored (rule 3)
    return pairs


def word_diff_segments(before, after):
    bw, aw = before.split(), after.split()
    segs = []
    for op, i1, i2, j1, j2 in SequenceMatcher(None, bw, aw, autojunk=False).get_opcodes():
        if op in ("delete", "replace"):
            segs.append({"t": "del", "s": " ".join(bw[i1:i2])})
        if op in ("insert", "replace"):
            segs.append({"t": "ins", "s": " ".join(aw[j1:j2])})
        if op == "equal":
            segs.append({"t": "eq", "s": " ".join(bw[i1:i2])})
    return segs


def truncate_segments(segs, ctx=EQ_CONTEXT_WORDS):
    out = []
    last = len(segs) - 1
    for k, seg in enumerate(segs):
        if seg["t"] != "eq":
            out.append(seg)
            continue
        words = seg["s"].split()
        if k == 0 and len(words) > ctx:
            out.append({"t": "eq", "s": "… " + " ".join(words[-ctx:])})
        elif k == last and len(words) > ctx:
            out.append({"t": "eq", "s": " ".join(words[:ctx]) + " …"})
        elif 0 < k < last and len(words) > 2 * ctx + 2:
            out.append({"t": "eq",
                        "s": " ".join(words[:ctx]) + " … " + " ".join(words[-ctx:])})
        else:
            out.append(seg)
    return out


def truncate_words(s, n=STACKED_MAX_WORDS):
    words = s.split()
    return s if len(words) <= n else " ".join(words[:n]) + " …"


def gap_label(days):
    if days <= 0:
        return "same day"
    if days == 1:
        return "1 day later"
    if days < 365:
        return f"{days} days later"
    years = round(days / 365.25, 1)
    if years == int(years):
        n = int(years)
        return f"{n} year{'s' if n > 1 else ''} later"
    return f"{years} years later"


def day_from_basename(basename):
    m = DAY_RE.search(basename) or LEGACY_NUM_RE.match(basename)
    return int(m.group(1)) if m else None


def frontmatter_end(lines):
    """1-based line number of the closing '---', or 0 if no frontmatter."""
    if not lines or lines[0].strip() != "---":
        return 0
    for i, line in enumerate(lines[1:], start=2):
        if line.strip() == "---":
            return i
    return 0


def process_change(before, after, stats):
    """Apply rules 4-5 + classify. Returns a change dict or None (filtered)."""
    nb, na = norm_ws(before), norm_ws(after)
    if nb == na:
        stats["ws_only"] += 1
        return None
    if strip_item_number(nb) == strip_item_number(na):
        stats["renumber_only"] += 1
        return None
    sb, sa = norm_ws(strip_markdown(before)), norm_ws(strip_markdown(after))
    if sb == sa:
        text = link_change_text(before, after)
        if text:
            stats["link_change"] += 1
            return {"kind": "link_change", "text": text}
        stats["formatting_only"] += 1
        return None
    if not sa:
        stats["deletion"] += 1
        return {"kind": "deletion", "before": truncate_words(sb)}
    if not sb:                          # before was pure markup -> effectively an addition
        stats["formatting_only"] += 1
        return None
    stats["modification"] += 1
    if SequenceMatcher(None, sb, sa, autojunk=False).ratio() >= SIMILARITY_INLINE:
        return {"kind": "modification", "mode": "inline",
                "segments": truncate_segments(word_diff_segments(sb, sa))}
    return {"kind": "modification", "mode": "stacked",
            "before": truncate_words(sb), "after": truncate_words(sa)}


# ---------------------------------------------------------------- git plumbing

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")
INDEX_RE = re.compile(r"^index ([0-9a-f]+)\.\.[0-9a-f]+")
POST_RE = re.compile(r"^_posts/(\d{4}-\d{2}-\d{2})-.+\.(md|markdown)$")


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args],
                          capture_output=True, text=True, errors="replace",
                          check=True).stdout


class BlobCache:
    """Frontmatter-end line numbers, keyed by old-blob hash (rule 2, positional)."""

    def __init__(self, repo):
        self.repo = repo
        self.cache = {}

    def fm_end(self, blob):
        if blob not in self.cache:
            try:
                text = git(self.repo, "cat-file", "blob", blob)
                self.cache[blob] = frontmatter_end(text.split("\n"))
            except subprocess.CalledProcessError:
                self.cache[blob] = 0    # be permissive: treat all lines as body
        return self.cache[blob]


def parse_history(repo):
    """One pass over git log -p. Returns (entries, stats)."""
    stats = defaultdict(int)
    blobs = BlobCache(repo)
    raw_entries = {}                    # (commit, file) -> accumulator
    files_per_commit = defaultdict(set)

    proc = subprocess.Popen(
        ["git", "-C", repo, "log", "--diff-filter=M", "-U0",
         "--format=@%H|%aI", "-p", "--", "_posts/"],
        stdout=subprocess.PIPE, text=True, errors="replace")

    commit = cdate = cur_file = old_blob = None
    fm = None                  # frontmatter end for current file-diff (lazy)
    old_lineno = 0             # old-file line number cursor within a hunk
    removed, added = [], []    # removed: (old_lineno, text); added: text

    def flush_hunk():
        nonlocal removed, added, fm
        if not removed or cur_file is None:
            removed, added = [], []
            return
        if fm is None:
            fm = blobs.fm_end(old_blob) if old_blob else 0
        body = [t for ln, t in removed if ln > fm]
        stats["frontmatter"] += len(removed) - len(body)
        # added lines beyond the pairs are pure additions -> ignored (rule 3)
        for rtext, atext in pair_hunk(body, added if body else []):
            change = process_change(rtext, atext, stats)
            if change:
                key = (commit, cur_file)
                if key not in raw_entries:
                    raw_entries[key] = {"commit": commit, "changed_at": cdate,
                                        "file": cur_file, "changes": []}
                raw_entries[key]["changes"].append(change)
        removed, added = [], []

    assert proc.stdout is not None
    for line in proc.stdout:
        line = line.rstrip("\n")
        if line.startswith("@") and not line.startswith("@@"):
            flush_hunk()
            h, _, d = line[1:].partition("|")
            commit, cdate = h, d
            cur_file = old_blob = None
            fm = None
        elif line.startswith("diff --git "):
            flush_hunk()
            cur_file = old_blob = None
            fm = None
        elif line.startswith("index "):
            m = INDEX_RE.match(line)
            if m:
                old_blob = m.group(1)
        elif line.startswith("+++ b/"):
            path = line[6:]
            if POST_RE.match(path):
                cur_file = path
                files_per_commit[commit].add(path)
            else:
                cur_file = None
        elif line.startswith("@@"):
            flush_hunk()
            m = HUNK_RE.match(line)
            if m and cur_file:
                old_lineno = int(m.group(1))
        elif cur_file and line.startswith("-") and not line.startswith("---"):
            removed.append((old_lineno, line[1:]))
            old_lineno += 1
        elif cur_file and line.startswith("+") and not line.startswith("+++"):
            added.append(line[1:])
        # "\ No newline at end of file" and blank separators: ignored
    flush_hunk()
    proc.wait()
    if proc.returncode:
        sys.exit(f"FATAL: git log exited {proc.returncode} — refusing to emit "
                 f"partial corrections data")

    # rule 1: drop bulk commits
    entries = []
    for (c, f), e in raw_entries.items():
        if len(files_per_commit[c]) > MAX_FILES_PER_COMMIT:
            stats["bulk_dropped"] += len(e["changes"])
            continue
        entries.append(e)
    return entries, stats


# ---------------------------------------------------------------- assembly


def build_output(entries):
    out_entries = []
    for e in entries:
        basename = e["file"].rsplit("/", 1)[1]
        basename = re.sub(r"\.(md|markdown)$", "", basename)
        post_date = basename[:10]
        changed_day = date.fromisoformat(e["changed_at"][:10])
        gap = (changed_day - date.fromisoformat(post_date)).days
        out_entries.append({
            "post": basename,
            "day": day_from_basename(basename),
            "slug": basename[11:],               # display fallback for non-day posts
            "post_date": post_date,
            "post_url": None,                    # plugin fills from site.posts
            "commit": e["commit"][:9],
            "changed_at": e["changed_at"],
            "year": int(e["changed_at"][:4]),
            "gap_days": gap,
            "gap_label": gap_label(gap),
            "changes": e["changes"],
        })
    out_entries.sort(key=lambda x: datetime.fromisoformat(x["changed_at"]),
                     reverse=True)

    year_commits = defaultdict(set)
    year_changes = defaultdict(int)
    for e in out_entries:
        year_commits[e["year"]].add(e["commit"])
        year_changes[e["year"]] += len(e["changes"])
    years_list = [{"year": y, "commits": len(year_commits[y]),
                   "changes": year_changes[y]}
                  for y in sorted(year_commits, reverse=True)]

    # NOTE: output must be deterministic — same history in, byte-identical file
    # out. The nightly Action commits this file only when it changes; any
    # nondeterminism (e.g. a generation timestamp) would trigger a pointless
    # site deploy every night.
    return {
        "entries": out_entries,
        "years": years_list,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", default=".")
    ap.add_argument("--output", default="_data/corrections.json")
    ap.add_argument("--stats-only", action="store_true")
    args = ap.parse_args()

    entries, stats = parse_history(args.repo)
    output = build_output(entries)

    n_changes = sum(len(e["changes"]) for e in output["entries"])
    print(f"corrections: {len(output['entries'])} entries, {n_changes} changes, "
          f"{len({e['post'] for e in output['entries']})} posts", file=sys.stderr)
    print(f"filtered: {dict(stats)}", file=sys.stderr)

    if not args.stats_only:
        with open(args.output, "w") as f:
            json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
        print(f"wrote {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
