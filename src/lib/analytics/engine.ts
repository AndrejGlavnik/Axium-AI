import "server-only";

import type {
  ColumnSchema,
  DatasetRow,
  GroupByOperation,
  GroupByResult,
  SummaryResult
} from "@/lib/analytics/types";
import { formatNumber, renderMarkdownTable } from "@/lib/analytics/markdown";
import { toDate, toNumber, valueToString } from "@/lib/analytics/parser";

export function summarizeDataset(rows: DatasetRow[], columns: ColumnSchema[]): SummaryResult {
  const numeric = columns
    .filter((column) => column.type === "number")
    .map((column) => {
      const values = rows.map((row) => toNumber(row[column.name])).filter((value): value is number => value !== null);
      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        column: column.name,
        count: values.length,
        total,
        average: values.length ? total / values.length : 0,
        min: values.length ? Math.min(...values) : 0,
        max: values.length ? Math.max(...values) : 0
      };
    });

  const dates = columns
    .filter((column) => column.type === "date")
    .map((column) => {
      const values = rows.map((row) => toDate(row[column.name])).filter((value): value is Date => value !== null);
      return {
        column: column.name,
        min: values.length ? new Date(Math.min(...values.map((value) => value.getTime()))).toISOString().slice(0, 10) : "",
        max: values.length ? new Date(Math.max(...values.map((value) => value.getTime()))).toISOString().slice(0, 10) : ""
      };
    });

  const categories = columns
    .filter((column) => column.type === "text" || column.type === "boolean")
    .slice(0, 8)
    .map((column) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const key = valueToString(row[column.name]) || "(blank)";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return {
        column: column.name,
        topValues: Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count }))
      };
    });

  return {
    rowCount: rows.length,
    columns,
    numeric,
    dates,
    categories
  };
}

export function groupByDataset(
  rows: DatasetRow[],
  groupBy: string,
  metric: string | null,
  operation: GroupByOperation
): GroupByResult {
  const groups = new Map<string, { count: number; total: number }>();

  for (const row of rows) {
    const key = valueToString(row[groupBy]) || "(blank)";
    const current = groups.get(key) ?? { count: 0, total: 0 };
    current.count += 1;

    if (metric) {
      current.total += toNumber(row[metric]) ?? 0;
    }

    groups.set(key, current);
  }

  const rowsOut = Array.from(groups.entries())
    .map(([key, value]) => {
      const computed = operation === "count" ? value.count : operation === "avg" ? value.total / Math.max(value.count, 1) : value.total;
      return {
        [groupBy]: key,
        [operation === "count" ? "count" : `${operation}_${metric}`]: Number(computed.toFixed(2))
      };
    })
    .sort((a, b) => {
      const aValue = Number(Object.values(a)[1] ?? 0);
      const bValue = Number(Object.values(b)[1] ?? 0);
      return bValue - aValue;
    })
    .slice(0, 50);

  return {
    groupBy,
    metric,
    operation,
    rows: rowsOut
  };
}

export function renderSummaryMarkdown(fileName: string, result: SummaryResult) {
  const columnRows = result.columns.map((column) => ({
    column: column.name,
    type: column.type,
    nullable: column.nullable ? "yes" : "no",
    examples: column.examples.join(", ")
  }));

  const numericRows = result.numeric.map((column) => ({
    column: column.column,
    count: column.count,
    total: formatNumber(column.total),
    average: formatNumber(column.average),
    min: formatNumber(column.min),
    max: formatNumber(column.max)
  }));

  const dateRows = result.dates.map((column) => ({
    column: column.column,
    min: column.min,
    max: column.max
  }));

  const sections = [
    `### Dataset summary: ${fileName}`,
    `Rows: ${result.rowCount.toLocaleString("en-US")}`,
    "#### Columns",
    renderMarkdownTable(columnRows, 50)
  ];

  if (numericRows.length) {
    sections.push("#### Numeric columns", renderMarkdownTable(numericRows, 50));
  }

  if (dateRows.length) {
    sections.push("#### Date columns", renderMarkdownTable(dateRows, 50));
  }

  return sections.join("\n\n");
}

export function renderGroupByMarkdown(fileName: string, result: GroupByResult) {
  return [
    `### Group-by result: ${fileName}`,
    `Grouped by \`${result.groupBy}\`${result.metric ? ` using \`${result.metric}\`` : ""} with \`${result.operation}\`.`,
    renderMarkdownTable(result.rows, 50)
  ].join("\n\n");
}

export function findColumn(columns: ColumnSchema[], requested: string | null | undefined) {
  if (!requested) {
    return null;
  }
  const normalized = normalizeName(requested);
  return columns.find((column) => normalizeName(column.name) === normalized) ?? null;
}

export function findColumnMention(columns: ColumnSchema[], text: string, preferredTypes?: ColumnSchema["type"][]) {
  const normalizedText = normalizeName(text);
  const candidates = preferredTypes?.length ? columns.filter((column) => preferredTypes.includes(column.type)) : columns;
  return (
    candidates.find((column) => normalizedText.includes(normalizeName(column.name))) ??
    candidates.find((column) => normalizeName(column.name).split(" ").some((part) => part.length > 2 && normalizedText.includes(part))) ??
    null
  );
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
