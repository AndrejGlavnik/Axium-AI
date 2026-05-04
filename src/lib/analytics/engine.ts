import "server-only";

import type {
  ColumnSchema,
  DatasetRow,
  GroupByOperation,
  GroupByResult,
  PeriodComparisonResult,
  SummaryResult,
  TotalsResult
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

export function calculateTotals(rows: DatasetRow[], columns: ColumnSchema[], metrics?: string[] | null): TotalsResult {
  const requested = metrics?.length ? new Set(metrics.map(normalizeName)) : null;
  const numericColumns = columns.filter((column) => column.type === "number" && (!requested || requested.has(normalizeName(column.name))));

  return {
    rows: numericColumns.map((column) => {
      const values = rows.map((row) => toNumber(row[column.name])).filter((value): value is number => value !== null);
      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        metric: column.name,
        count: values.length,
        total,
        average: values.length ? total / values.length : 0
      };
    })
  };
}

export function comparePeriods(
  rows: DatasetRow[],
  columns: ColumnSchema[],
  options: {
    dateColumn?: string | null;
    metric?: string | null;
    currentStart?: string | null;
    currentEnd?: string | null;
    previousStart?: string | null;
    previousEnd?: string | null;
  }
): PeriodComparisonResult {
  const dateColumn =
    findColumn(columns, options.dateColumn)?.name ?? columns.find((column) => column.type === "date")?.name ?? null;
  const metricColumn =
    findColumn(columns, options.metric)?.name ?? columns.find((column) => column.type === "number")?.name ?? null;

  if (!dateColumn) {
    throw new Error("No date column found for period comparison.");
  }
  if (!metricColumn) {
    throw new Error("No numeric metric column found for period comparison.");
  }

  const datedRows = rows
    .map((row) => ({ row, date: toDate(row[dateColumn]) }))
    .filter((item): item is { row: DatasetRow; date: Date } => item.date !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  if (!datedRows.length) {
    throw new Error(`No valid date values found in ${dateColumn}.`);
  }

  const minDate = datedRows[0].date;
  const maxDate = datedRows[datedRows.length - 1].date;
  const currentEnd = options.currentEnd ? parseDate(options.currentEnd) : maxDate;
  const currentStart = options.currentStart ? parseDate(options.currentStart) : midpointDate(minDate, currentEnd);
  const periodDays = Math.max(1, differenceInDays(currentStart, currentEnd) + 1);
  const previousEnd = options.previousEnd ? parseDate(options.previousEnd) : addDays(currentStart, -1);
  const previousStart = options.previousStart ? parseDate(options.previousStart) : addDays(previousEnd, -(periodDays - 1));

  const current = sumPeriod(datedRows, metricColumn, currentStart, currentEnd);
  const previous = sumPeriod(datedRows, metricColumn, previousStart, previousEnd);
  const difference = current.total - previous.total;

  return {
    dateColumn,
    metric: metricColumn,
    currentPeriod: {
      start: toIsoDate(currentStart),
      end: toIsoDate(currentEnd),
      total: current.total,
      count: current.count
    },
    previousPeriod: {
      start: toIsoDate(previousStart),
      end: toIsoDate(previousEnd),
      total: previous.total,
      count: previous.count
    },
    difference,
    percentChange: previous.total === 0 ? null : difference / Math.abs(previous.total)
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

export function renderColumnsMarkdown(fileName: string, columns: ColumnSchema[]) {
  return [
    `### Available columns: ${fileName}`,
    renderMarkdownTable(
      columns.map((column) => ({
        column: column.name,
        type: column.type,
        nullable: column.nullable ? "yes" : "no",
        null_count: column.null_count,
        examples: column.examples.join(", ")
      })),
      80
    )
  ].join("\n\n");
}

export function renderTotalsMarkdown(fileName: string, result: TotalsResult) {
  return [
    `### Totals: ${fileName}`,
    renderMarkdownTable(
      result.rows.map((row) => ({
        metric: row.metric,
        count: row.count,
        total: formatNumber(row.total),
        average: formatNumber(row.average)
      })),
      80
    )
  ].join("\n\n");
}

export function renderPeriodComparisonMarkdown(fileName: string, result: PeriodComparisonResult) {
  return [
    `### Period comparison: ${fileName}`,
    `Date column: \`${result.dateColumn}\`. Metric: \`${result.metric}\`.`,
    renderMarkdownTable([
      {
        period: "Current",
        start: result.currentPeriod.start,
        end: result.currentPeriod.end,
        rows: result.currentPeriod.count,
        total: formatNumber(result.currentPeriod.total)
      },
      {
        period: "Previous",
        start: result.previousPeriod.start,
        end: result.previousPeriod.end,
        rows: result.previousPeriod.count,
        total: formatNumber(result.previousPeriod.total)
      }
    ]),
    `Difference: ${formatNumber(result.difference)}${
      result.percentChange === null ? "" : ` (${formatNumber(result.percentChange * 100)}%)`
    }`
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

function parseDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

function sumPeriod(rows: Array<{ row: DatasetRow; date: Date }>, metric: string, start: Date, end: Date) {
  return rows.reduce(
    (acc, item) => {
      if (item.date >= start && item.date <= end) {
        acc.count += 1;
        acc.total += toNumber(item.row[metric]) ?? 0;
      }
      return acc;
    },
    { count: 0, total: 0 }
  );
}

function midpointDate(start: Date, end: Date) {
  const difference = Math.max(0, end.getTime() - start.getTime());
  return new Date(end.getTime() - Math.floor(difference / 2));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function differenceInDays(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / msPerDay);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
