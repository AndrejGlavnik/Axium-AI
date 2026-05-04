export type CellValue = string | number | boolean | Date | null;

export type DatasetRow = Record<string, CellValue>;

export type ColumnKind = "number" | "date" | "boolean" | "text" | "empty" | "mixed";

export type ColumnSchema = {
  name: string;
  type: ColumnKind;
  null_count: number;
  nullable: boolean;
  examples: string[];
};

export type ParsedDataset = {
  rows: DatasetRow[];
  columns: ColumnSchema[];
  rowCount: number;
  sampleRows: DatasetRow[];
};

export type SummaryResult = {
  rowCount: number;
  columns: ColumnSchema[];
  numeric: Array<{
    column: string;
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  }>;
  dates: Array<{
    column: string;
    min: string;
    max: string;
  }>;
  categories: Array<{
    column: string;
    topValues: Array<{ value: string; count: number }>;
  }>;
};

export type GroupByOperation = "count" | "sum" | "avg";

export type GroupByResult = {
  groupBy: string;
  metric: string | null;
  operation: GroupByOperation;
  rows: Array<Record<string, string | number>>;
};

export type TotalsResult = {
  rows: Array<{
    metric: string;
    count: number;
    total: number;
    average: number;
  }>;
};

export type PeriodComparisonResult = {
  dateColumn: string;
  metric: string;
  currentPeriod: {
    start: string;
    end: string;
    total: number;
    count: number;
  };
  previousPeriod: {
    start: string;
    end: string;
    total: number;
    count: number;
  };
  difference: number;
  percentChange: number | null;
};
