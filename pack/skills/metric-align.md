---
inclusion: manual
name: metric-align
description: "#metric-align <metric>: finds every place a metric is calculated across repos, Databricks, Confluence and Excel, breaks each down, and shows where the calculations disagree and by how much."
---

# #metric-align

Run this when I type `#metric-align <metric>` (for example `#metric-align MAPE` or `#metric-align fill rate`). It is read-only throughout: it never edits another repo, view or workbook, and never posts anything.

## 0. Sources
Read `.kiro/metric-sources.md`. If it doesn't exist, ask me for the sources and offer to create it from this template:

```markdown
# Metric sources
## Repos (local paths or GitHub org/repo)
- C:\code\dc-forecast
- C:\code\dc-ops-pipeline
- github: my-org/*            # needs gh CLI
## Databricks (via MCP, read-only)
- catalogs: dev_analytics, prod_analytics
## Confluence (via Atlassian MCP)
- spaces: DATA, DCOPS
## Excel (shared folders)
- \\share\analytics\reports
## Glossary
- metrics/                    # canonical definitions, if any
```

Skip any source whose tool isn't available, and say so in the report.

## 1. Search terms
Build a term list and show it before searching:
- The metric name, abbreviation and spellings (`MAPE`, `mape`, `mean_abs_pct_err`, `abs_pct_error`, `ape`).
- Likely column aliases and CTE names.
- **Formula shapes**, since many copies aren't named after the metric. For MAPE, look for `ABS(actual - forecast) / actual` and its variants; for a rate, look for the numerator and denominator columns.

Ask me for synonyms the team uses. Add them to the term list.

## 2. Find every definition
- **Repos:** `.sql`, `.py`, `.ipynb`, dbt models, DAX or `.pbix` exports if present. For GitHub, use `gh search code` scoped to the org.
- **Databricks:** `information_schema.views.view_definition` and `information_schema.routines` across the listed catalogs. Search notebooks and saved queries by name and path if the MCP server supports it. Use metadata queries with a `LIMIT`.
- **Confluence:** pages that define the metric in words. These count as the "intended" definition.
- **Excel:** formulas in the workbooks (read with `openpyxl`, formulas not values), named ranges, and pivot calculated fields.
- **Glossary:** the canonical entry, if one exists.

Skip copies (the same file vendored into two repos, or a notebook export of a view) and note them as such.

## 3. Break each one down
Make a definition card per location:

| Part | Example |
|---|---|
| Location | `dc-forecast/sql/accuracy.sql:42`, owner, last modified |
| Formula | `AVG(ABS(a - f) / a)` |
| Aggregation | row-level average (unweighted) vs `SUM(ABS(a - f)) / SUM(a)` (weighted, WAPE) |
| Grain | per DC × SKU × week, then rolled up how |
| Filters | statuses, DCs, SKUs included |
| Exclusions | zero or NULL actuals, outliers, new items |
| Time | calendar (fiscal vs ISO week), window, lag/horizon, time zone |
| NULLs and zeros | dropped, treated as 0, or capped |
| Units and rounding | percent vs fraction, cap at 100%, decimals |
| Source tables | upstream tables and their freshness |

If a part can't be determined, write "unclear" rather than guessing.

## 4. Compare
Put every card side by side in one matrix with one column per location, and highlight the cells that differ. Classify each location against the reference (the glossary entry if one exists; otherwise the one I choose, or the most-used one):
- **Identical:** same logic.
- **Equivalent:** different code, same result (formatting, CTE order, `COALESCE` vs `IFNULL`).
- **Divergent:** gives different numbers. Name the exact difference, such as "excludes zero actuals" or "weighted, not unweighted".
- **Different metric, same name:** intentionally different (for example a different horizon). Suggest a rename rather than an alignment.

## 5. Measure the gap (offer, read-only)
For Divergent items, propose one query that computes the reference and each divergent version on the **same data and window** (the last full month by default), side by side at the top grain and for the 10 segments with the largest gaps. Use aggregates only, against dev or read-only access. Run it only if I say yes.

Report the gap as absolute and relative ("MAPE 18.2% vs 21.7%; 3.5 points, mostly from zero-actual rows at 3 DCs").

## 6. Report
- Health line: "MAPE found in 7 places: 3 identical, 1 equivalent, 2 divergent, 1 different metric".
- The comparison matrix.
- A numbered list of divergences by impact, each with location, difference, size of gap, and suggested fix.
- A **proposed canonical definition**: plain-English, then the SQL, with every part from step 3 stated.

## 7. Follow-ups (only on my yes, one at a time)
- Write or update `metrics/<metric>.md` in this repo with the canonical definition, its owners, and the list of known locations.
- Draft (don't post) a Jira ticket or Teams message for each divergent owner, using `output-formats.md`.
- Add a decision entry to `decisions-log.md` if we picked a canonical version.
