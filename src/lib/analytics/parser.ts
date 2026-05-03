import "server-only";

import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/universal";
import { STRUCTURED_FILE_EXTENSIONS } from "@/lib/constants";
import type { CellValue, ColumnKind, ColumnSchema, DatasetRow, ParsedDataset } from "@/lib/analytics/types";

export function getFileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export function isStructuredFile(fileName: string, mimeType?: string) {
  const extension = getFileExtension(fileName);
  return STRUCTURED_FILE_EXTENSIONS.includes(extension) || mimeType === "application/json" || mimeType === "text/csv";
}

export async function parseDataset(buffer: Buffer, fileName: string): Promise<ParsedDataset> {
  const extension = getFileExtension(fileName);

  if (extension === ".json") {
    return parseJsonDataset(buffer);
  }

  if (extension === ".csv") {
    return parseCsvDataset(buffer);
  }

  if (extension === ".xlsx") {
    return parseExcelDataset(buffer);
  }

  throw new Error(`Unsupported structured dataset format: ${extension || fileName}`);
}

function parseJsonDataset(buffer: Buffer): ParsedDataset {
  const parsed = JSON.parse(buffer.toString("utf8")) as unknown;
  const rows = normalizeJsonRows(parsed);
  return buildParsedDataset(rows);
}

function normalizeJsonRows(value: unknown): DatasetRow[] {
  if (Array.isArray(value)) {
    return value.map((row) => normalizeObjectRow(row));
  }

  if (isPlainObject(value)) {
    const firstArray = Object.values(value).find((nested) => Array.isArray(nested));
    if (Array.isArray(firstArray)) {
      return firstArray.map((row) => normalizeObjectRow(row));
    }
    return [normalizeObjectRow(value)];
  }

  return [{ value: normalizeCell(value) }];
}

function parseCsvDataset(buffer: Buffer): ParsedDataset {
  const records = parseCsv(buffer.toString("utf8"), {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, unknown>[];

  return buildParsedDataset(records.map((row) => normalizeObjectRow(row)));
}

async function parseExcelDataset(buffer: Buffer): Promise<ParsedDataset> {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const sheetRows = await readSheet(arrayBuffer);

  if (!sheetRows.length) {
    return buildParsedDataset([]);
  }

  const headers = sheetRows[0]
    .map((value: unknown, index: number) => valueToHeader(value, index))
    .filter(Boolean);

  const rows = sheetRows.slice(1).map((row) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header: string, index: number) => {
      record[header] = row[index] ?? null;
    });
    return normalizeObjectRow(record);
  });

  return buildParsedDataset(rows);
}

function buildParsedDataset(rows: DatasetRow[]): ParsedDataset {
  const allColumns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const normalizedRows = rows.map((row) => {
    const normalized: DatasetRow = {};
    for (const column of allColumns) {
      normalized[column] = normalizeCell(row[column] ?? null);
    }
    return normalized;
  });

  return {
    rows: normalizedRows,
    columns: inferColumns(normalizedRows, allColumns),
    rowCount: normalizedRows.length,
    sampleRows: normalizedRows.slice(0, 5)
  };
}

function inferColumns(rows: DatasetRow[], columns: string[]): ColumnSchema[] {
  return columns.map((name) => {
    const values = rows.map((row) => row[name]);
    const nonEmpty = values.filter((value) => value !== null && value !== "");
    const kinds = new Set(nonEmpty.map(classifyValue));
    const examples = Array.from(
      new Set(
        nonEmpty
          .slice(0, 25)
          .map((value) => valueToString(value))
          .filter(Boolean)
      )
    ).slice(0, 3);

    let type: ColumnKind = "empty";
    if (kinds.size === 1) {
      type = Array.from(kinds)[0] ?? "empty";
    } else if (kinds.size > 1) {
      type = "mixed";
    }

    return {
      name,
      type,
      null_count: values.length - nonEmpty.length,
      nullable: values.length !== nonEmpty.length,
      examples
    };
  });
}

function normalizeObjectRow(value: unknown): DatasetRow {
  if (!isPlainObject(value)) {
    return { value: normalizeCell(value) };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [String(key), normalizeCell(nested)])
  ) as DatasetRow;
}

function normalizeCell(value: unknown): CellValue {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim() === "" ? null : value.trim();
  }

  return JSON.stringify(value);
}

function classifyValue(value: CellValue): ColumnKind {
  if (value === null || value === "") {
    return "empty";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (value instanceof Date) {
    return "date";
  }

  if (typeof value === "string") {
    if (isNumericString(value)) {
      return "number";
    }
    if (isDateString(value)) {
      return "date";
    }
    return "text";
  }

  return "mixed";
}

function isNumericString(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ""));
}

function isDateString(value: string) {
  if (!/[/-]/.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function valueToHeader(value: unknown, index: number) {
  const label = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return label || `Column ${index + 1}`;
}

export function valueToString(value: CellValue) {
  if (value === null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

export function toNumber(value: CellValue) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && isNumericString(value)) {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toDate(value: CellValue) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && isDateString(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}
