---
inclusion: manual
name: sql-review
description: "#sql-review: reviews a SQL query or file for correctness and cost problems (fan-out joins, partition pruning, non-deterministic windows) and suggests rewrites."
---

# #sql-review

Run this when I type `#sql-review`, on the open file, the selection, or the query I paste. Assume Databricks SQL / Spark SQL unless the file says otherwise.

## 1. Understand first
- State the intended **grain** of the final output ("one row per DC per week"). If you can't tell, ask.
- State the grain of every CTE and subquery in one line each.

## 2. Check, in this order

**Correctness (highest severity)**
- **Fan-out joins:** a join on keys that aren't unique on one side multiplies rows and inflates sums. Check every join against each side's grain.
- **`DISTINCT` hiding a fan-out:** flag `DISTINCT` or `GROUP BY` used to "fix" duplicates.
- **Non-deterministic windows:** `ROW_NUMBER()`/`FIRST_VALUE` with an `ORDER BY` that isn't unique; ties give random results between runs.
- **NULL traps:** `NOT IN` with a nullable subquery, `col = NULL`, `COUNT(col)` vs. `COUNT(*)`, NULLs dropped by inner joins or `WHERE` filters on outer-joined columns (turns a LEFT JOIN into an INNER JOIN).
- **Date and time:** `BETWEEN` on timestamps (misses the last day), time zones in `current_date()`/`current_timestamp()`, week definitions (ISO vs. Sunday start), off-by-one on rolling windows.
- **Implicit casts:** string vs. number joins, integer division, decimal precision loss.
- **Metric logic:** averages of averages, ratios summed instead of recomputed, MAPE with zero actuals.

**Cost and performance**
- No filter on the partition or clustering column of large tables.
- `SELECT *` from wide tables, especially before a join.
- Joins between two large tables where one side could be pre-aggregated or broadcast.
- Repeated scans of the same table that one pass could do.
- Python UDFs where a built-in function exists. `ORDER BY` without `LIMIT` in intermediate steps.
- `MERGE` whose source can have duplicate keys (fails or is non-deterministic).

**Readability**
- Unclear CTE names, magic numbers, missing comments on business rules. Keep this short; correctness comes first.

## 3. Report
A table: `#`, severity (High / Medium / Low), line, issue, fix. High means it can give wrong numbers.

Then the rewritten query (only the changed parts if it's long), with a one-line comment on each change.

## 4. Verify (offer, read-only)
Propose verification queries and run them only if I say yes, with a `LIMIT` or aggregates only:
- Grain check: `SELECT key_cols, COUNT(*) FROM ... GROUP BY ALL HAVING COUNT(*) > 1 LIMIT 20`
- Old vs. new: row count and key metric totals side by side.
Never run DDL or DML as part of a review.
