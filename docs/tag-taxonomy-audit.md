# Tag Taxonomy Audit

**Created:** 2026-02-03
**Last Updated:** 2026-02-03
**Purpose:** Document the tag taxonomy analysis process for periodic updates

## Overview

This document tracks the analysis of WTFJHT post content to ensure the tag taxonomy and synonym mappings comprehensively cover the topics discussed across 8+ years of content.

## Process

### When to Re-run This Audit
- Annually, or after major political shifts (new administration, major events)
- When noticing consistent gaps in tag archive coverage
- After adding significant new content areas

### How to Re-run
1. Use Claude Code to analyze `_posts/` content
2. Compare term frequency against `_data/tag_taxonomy.yml`
3. Update `_data/tag_synonyms.yml` with new mappings
4. Review and commit changes

---

## Audit: 2026-02-03

### Current State
- **Posts analyzed:** 1,829
- **Current tags:** 62 tags in taxonomy, 75 unique tags used in posts
- **Date range:** January 2017 - present
- **Average tags per post:** 2.7

---

### Tag Usage Summary

#### Top 10 Most Used Tags
| Tag | Uses | % of Posts |
|-----|------|-----------|
| mueller-investigation | 295 | 16.1% |
| immigration | 291 | 15.9% |
| national-security | 263 | 14.4% |
| jan-6 | 257 | 14.1% |
| economy | 237 | 13.0% |
| covid | 212 | 11.6% |
| impeachment | 180 | 9.8% |
| indictment | 165 | 9.0% |
| oversight | 150 | 8.2% |
| climate | 148 | 8.1% |

#### Rarely Used Tags (< 10 uses)
- confirmation-hearing: 0 (UNUSED)
- state-of-the-union: 3
- opioids: 4
- veterans: 4
- primary: 6
- china: 7
- debate: 9
- housing: 10

#### Tags Used in Posts but NOT in Taxonomy
- doge (7) - Department of Government Efficiency
- elections (9) - generic election tag
- obstruction (3)
- military (2)
- agriculture (2)

---

### Coverage Gap Analysis

| Category | Posts with Content | Posts Tagged | Gap % |
|----------|-------------------|--------------|-------|
| **LGBTQ-related** | 400 | 76 | **81%** |
| **Healthcare-related** | 716 | 465 | 35% |
| **Climate-related** | 509 | 348 | 32% |
| **Immigration-related** | 393 | 291 | 26% |

**Critical Finding:** LGBTQ content is severely under-tagged. Only 19% of posts mentioning trans, gay marriage, same-sex, etc. have the `lgbtq-rights` tag.

---

### High-Frequency Terms Identified

**People (frequently mentioned):**
Trump (1470+), Mueller (214+), Pence (190+), Comey (160+), Sessions (156+), Barr (140+), Rosenstein (126+)

**Agencies:**
White House (139+), FBI (154+), Congress (91+), DOJ (100+), Supreme Court (400+), Senate (90+), House (61+), EPA, ICE, DHS

**Legal Terms:**
Indictment (669+), Impeachment (1370+), Subpoena (860+), Pardon (444+), Conspiracy, Obstruction, Corruption

**Policy Terms:**
Election/Vote/Voting (1100+), Russia/Russian (860+), Healthcare/ACA/Obamacare (250+), Immigration/Border/Asylum (220+), Climate/Environment (230+)

---

### Recommendations

#### Taxonomy Changes
1. **Remove:** `confirmation-hearing` (0 uses)
2. **Consider removing/archiving:** `state-of-the-union`, `opioids`, `veterans`, `primary`, `debate` (all < 10 uses)
3. **Add to taxonomy:** `doge` (7 uses, emerging topic)

#### Synonym Mappings Needed
Create `_data/tag_synonyms.yml` with comprehensive mappings for each tag. Priority tags:
1. `lgbtq-rights` - needs extensive synonym list (trans, transgender, gay, same-sex, etc.)
2. `healthcare` - needs ACA, Obamacare, Medicare, Medicaid, etc.
3. `immigration` - needs ICE, DACA, asylum, deportation, etc.
4. `climate` - needs EPA, emissions, Paris Agreement, etc.

#### Tagging Backlog
Consider a tagging review campaign for:
- 324 LGBTQ-content posts missing tags
- 251 healthcare-content posts missing tags
- 161 climate-content posts missing tags

---

## Files
- `_data/tag_taxonomy.yml` - Canonical tag list (user-facing)
- `_data/tag_synonyms.yml` - Synonym mappings (editorial tooling) - **Created 2026-02-03**

## Synonym File Stats (2026-02-03)
- **62 canonical tags** mapped
- **~1,200 synonym terms** total
- Categories covered: Policy (23 tags), Legal (7), Government (8), Elections (5), Recurring Events (4), Major Investigations (4), Regions (4), Other (7)
