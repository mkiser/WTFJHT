#!/usr/bin/env python3
"""Unit tests for generate_corrections.py pure functions. Run:
   python3 -m unittest discover -s scripts -p 'test_*.py' -v
"""
import unittest

from generate_corrections import (
    norm_ws, strip_item_number, strip_markdown, extract_domains,
    extract_urls, link_change_text, pair_hunk,
    word_diff_segments, truncate_segments, truncate_words,
    gap_label, day_from_basename, frontmatter_end, process_change,
)


class TestNormalization(unittest.TestCase):
    def test_norm_ws_collapses(self):
        self.assertEqual(norm_ws("  a\t b  c "), "a b c")

    def test_strip_item_number(self):
        self.assertEqual(strip_item_number("3/ **Trump said**"), "**Trump said**")
        self.assertEqual(strip_item_number("no number here"), "no number here")


class TestStripMarkdown(unittest.TestCase):
    def test_bold_and_link(self):
        self.assertEqual(
            strip_markdown("**Bold lede**. ([Politico](https://politico.com/x))"),
            "Bold lede. (Politico)")

    def test_image_and_escape(self):
        self.assertEqual(strip_markdown(r"![alt text](u.jpg) and \*literal\*"),
                         "alt text and *literal*")

    def test_bold_italic(self):
        self.assertEqual(strip_markdown("***both***"), "both")

    def test_bold_containing_italic(self):
        # "**a *b* c**" (bold containing italics) must not leak literal asterisks
        self.assertEqual(strip_markdown("**🤦‍♂️ *Dept. of C'mon Man***"),
                         "🤦‍♂️ Dept. of C'mon Man")

    def test_trailing_hardbreak_backslash(self):
        self.assertEqual(strip_markdown("voted against the bill. \\"),
                         "voted against the bill.")

    def test_stray_unpaired_asterisk(self):
        # diff lines can cut an emphasis span in half
        self.assertEqual(strip_markdown("*The committee voted"),
                         "The committee voted")

    def test_table_pipes_become_separators(self):
        self.assertEqual(strip_markdown("| Tillis | R-NC | No |"),
                         "Tillis · R-NC · No")


class TestExtractDomains(unittest.TestCase):
    def test_domains_normalized(self):
        s = "([Politico](https://www.politico.com/story/1) / [NYT](https://nytimes.com/2))"
        self.assertEqual(extract_domains(s), {"politico.com", "nytimes.com"})


class TestWordDiff(unittest.TestCase):
    def test_287_to_987(self):
        segs = word_diff_segments("election is in 287 days.", "election is in 987 days.")
        self.assertEqual(segs, [
            {"t": "eq", "s": "election is in"},
            {"t": "del", "s": "287"},
            {"t": "ins", "s": "987"},
            {"t": "eq", "s": "days."},
        ])


class TestTruncation(unittest.TestCase):
    def test_long_leading_eq_truncated(self):
        words = " ".join(f"w{i}" for i in range(30))
        segs = truncate_segments([{"t": "eq", "s": words}, {"t": "del", "s": "x"}], ctx=10)
        self.assertTrue(segs[0]["s"].startswith("… "))
        self.assertEqual(len(segs[0]["s"].split()), 11)  # ellipsis + 10 words

    def test_truncate_words(self):
        self.assertEqual(truncate_words("a b c", 60), "a b c")
        long = " ".join(["w"] * 70)
        self.assertTrue(truncate_words(long, 60).endswith(" …"))


class TestGapLabel(unittest.TestCase):
    def test_labels(self):
        self.assertEqual(gap_label(0), "same day")
        self.assertEqual(gap_label(1), "1 day later")
        self.assertEqual(gap_label(13), "13 days later")
        self.assertEqual(gap_label(400), "1.1 years later")
        self.assertEqual(gap_label(731), "2 years later")


class TestDayFromBasename(unittest.TestCase):
    def test_both_casings(self):
        self.assertEqual(day_from_basename("2026-02-24-day-1862"), 1862)
        self.assertEqual(day_from_basename("2017-01-21-Day-2"), 2)

    def test_legacy_numeric_slug(self):
        # history contains "2019-11-14-1029.md" (all-digit slug = day number)
        self.assertEqual(day_from_basename("2019-11-14-1029"), 1029)

    def test_non_day_posts_get_none(self):
        self.assertIsNone(day_from_basename("2018-08-27-week-of-aug-19-25"))


class TestPairHunk(unittest.TestCase):
    def test_equal_counts_pair_linewise(self):
        self.assertEqual(pair_hunk(["a", "b"], ["A", "B"]), [("a", "A"), ("b", "B")])

    def test_rewritten_region_block_joins(self):
        # N:M index-pairing would split multi-line edits into garbage
        self.assertEqual(pair_hunk(["a", "b", "c"], ["A"]), [("a\nb\nc", "A")])

    def test_removed_only_become_deletions(self):
        self.assertEqual(pair_hunk(["a", "b"], []), [("a", ""), ("b", "")])

    def test_inserted_item_with_renumber_cascade(self):
        # New item 1 inserted, old item 1 became item 2. Must pair the surviving
        # line with itself (renumber-only, filtered downstream) and treat the
        # new item as a pure addition.
        pairs = pair_hunk(["1/ U.S. inflation rose."],
                          ["1/ Trump said a thing.", "2/ U.S. inflation rose."])
        self.assertEqual(pairs, [("1/ U.S. inflation rose.",
                                  "2/ U.S. inflation rose.")])

    def test_insertion_plus_real_edit(self):
        pairs = pair_hunk(["1/ Old item text here."],
                          ["1/ Brand new inserted item.", "2/ Old item text here, edited."])
        # the renumbered line is a replace (text actually changed) — it should
        # still pair against the old line, not the inserted one
        self.assertEqual(len(pairs), 1)
        self.assertIn("Old item text here", pairs[0][0])
        self.assertIn("edited", pairs[0][1])


class TestLinkChangeText(unittest.TestCase):
    def test_cross_domain_swap(self):
        t = link_change_text("([A](https://politico.com/1))",
                             "([A](https://nytimes.com/2))")
        self.assertEqual(t, "removed politico.com; added nytimes.com")

    def test_same_domain_swap_detected(self):
        # same-domain URL swaps must not be silently dropped
        t = link_change_text("([A](https://nytimes.com/old))",
                             "([A](https://nytimes.com/new))")
        self.assertEqual(t, "updated nytimes.com")

    def test_added_only(self):
        t = link_change_text("x ([A](https://nytimes.com/1))",
                             "x ([A](https://nytimes.com/1) / [B](https://gallup.com/2))")
        self.assertEqual(t, "added gallup.com")

    def test_equal_urls_none(self):
        s = "([A](https://nytimes.com/1))"
        self.assertIsNone(link_change_text(s, s))

    def test_extract_urls_trims_punctuation(self):
        self.assertEqual(extract_urls("see https://x.com/a."), {"https://x.com/a"})


class TestFrontmatterEnd(unittest.TestCase):
    def test_finds_second_delimiter(self):
        lines = ["---", "title: Day 1", "tags:", "- pardon", "---", "body starts"]
        self.assertEqual(frontmatter_end(lines), 5)

    def test_no_frontmatter(self):
        self.assertEqual(frontmatter_end(["body only"]), 0)


class TestProcessChange(unittest.TestCase):
    def setUp(self):
        from collections import defaultdict
        self.stats = defaultdict(int)

    def test_ws_only_skipped(self):
        self.assertIsNone(process_change("a b", "a  b ", self.stats))
        self.assertEqual(self.stats["ws_only"], 1)

    def test_renumber_only_skipped(self):
        self.assertIsNone(process_change("3/ **Item**", "4/ **Item**", self.stats))
        self.assertEqual(self.stats["renumber_only"], 1)

    def test_small_fix_is_inline(self):
        c = process_change("in 287 days.", "in 987 days.", self.stats)
        self.assertEqual((c["kind"], c["mode"]), ("modification", "inline"))

    def test_rewrite_is_stacked(self):
        c = process_change("Aardvarks enjoy quiet zoos at dusk.",
                           "Completely different words appear in this new sentence here.",
                           self.stats)
        self.assertEqual((c["kind"], c["mode"]), ("modification", "stacked"))

    def test_link_swap_reported(self):
        c = process_change("x ([A](https://politico.com/1))",
                           "x ([A](https://nytimes.com/2))", self.stats)
        self.assertEqual(c["kind"], "link_change")
        self.assertIn("politico.com", c["text"])
        self.assertIn("nytimes.com", c["text"])

    def test_formatting_only_skipped(self):
        self.assertIsNone(process_change("a **b** c", "a b c", self.stats))
        self.assertEqual(self.stats["formatting_only"], 1)

    def test_deletion(self):
        c = process_change("Removed item text.", "", self.stats)
        self.assertEqual(c["kind"], "deletion")
        self.assertEqual(c["before"], "Removed item text.")


if __name__ == "__main__":
    unittest.main()
