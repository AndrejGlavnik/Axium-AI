import "server-only";

export function renderMarkdownTable(rows: Array<Record<string, string | number | null>>, maxRows = 25) {
  if (!rows.length) {
    return "_No rows returned._";
  }

  const columns = Object.keys(rows[0]);
  const header = `| ${columns.join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.slice(0, maxRows).map((row) => {
    return `| ${columns.map((column) => escapeCell(row[column])).join(" | ")} |`;
  });

  return [header, divider, ...body].join("\n");
}

function escapeCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\|/g, "\\|");
}

export function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}
