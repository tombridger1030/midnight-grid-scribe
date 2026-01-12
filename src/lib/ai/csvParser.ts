/**
 * CSV Bank Statement Parser
 *
 * Auto-detects CSV format from major Canadian banks and parses transactions.
 * Falls back to AI-assisted column detection for unknown formats.
 */

import type { ParsedTransaction } from "./bankStatementParser";

export interface CSVParseResult {
  transactions: ParsedTransaction[];
  format: string;
  confidence: number;
}

export interface CSVColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  debitColumn?: number;
  creditColumn?: number;
  categoryColumn?: number;
}

interface BankFormat {
  name: string;
  headers: string[];
  mapping: CSVColumnMapping;
  dateFormat: string;
  skipRows?: number;
}

// Known bank CSV formats
const KNOWN_FORMATS: BankFormat[] = [
  {
    name: "BMO",
    headers: [
      "Transaction Date",
      "Description",
      "CAD$",
      "First Bank Card",
      "Item #",
    ],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 2,
      amountColumn: 3,
    },
    dateFormat: "YYYYMMDD",
  },
  {
    name: "BMO Credit Card",
    headers: ["Transaction Date", "Posting Date", "Description", "Amount"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 2,
      amountColumn: 3,
    },
    dateFormat: "YYYYMMDD",
  },
  {
    name: "TD Bank",
    headers: ["Date", "Description", "Withdrawals", "Deposits", "Balance"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      debitColumn: 2,
      creditColumn: 3,
      amountColumn: -1,
    },
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "RBC",
    headers: [
      "Account Type",
      "Account Number",
      "Transaction Date",
      "Cheque Number",
      "Description 1",
      "Description 2",
      "CAD$",
      "USD$",
    ],
    mapping: {
      dateColumn: 2,
      descriptionColumn: 4,
      amountColumn: 6,
    },
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Scotiabank",
    headers: ["Date", "Amount", "Description"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 2,
      amountColumn: 1,
    },
    dateFormat: "DD/MM/YYYY",
  },
  {
    name: "Wealthsimple",
    headers: ["Date", "Type", "Symbol", "Amount", "Currency"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 3,
    },
    dateFormat: "YYYY-MM-DD",
  },
  {
    name: "Wealthsimple Cash",
    headers: ["Date", "Description", "Type", "Amount"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 3,
    },
    dateFormat: "YYYY-MM-DD",
  },
  {
    name: "CIBC",
    headers: ["Date", "Description", "Debit", "Credit"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      debitColumn: 2,
      creditColumn: 3,
      amountColumn: -1,
    },
    dateFormat: "YYYY-MM-DD",
  },
  {
    name: "Tangerine",
    headers: ["Date", "Transaction", "Name", "Memo", "Amount"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 2,
      amountColumn: 4,
    },
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Generic",
    headers: ["date", "description", "amount"],
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
    },
    dateFormat: "YYYY-MM-DD",
  },
];

/**
 * Parse CSV content into rows
 */
function parseCSVRows(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        if (char === "\r") i++;
      } else if (char !== "\r") {
        currentField += char;
      }
    }
  }

  // Handle last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalize header names for comparison
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Detect bank format from CSV headers
 */
function detectFormat(headers: string[]): BankFormat | null {
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const format of KNOWN_FORMATS) {
    const formatHeaders = format.headers.map(normalizeHeader);

    // Check if all format headers are present
    const matchCount = formatHeaders.filter((fh) =>
      normalizedHeaders.some((h) => h.includes(fh) || fh.includes(h)),
    ).length;

    // Require at least 60% header match
    if (matchCount >= formatHeaders.length * 0.6) {
      // Adjust mapping based on actual header positions
      const adjustedMapping = adjustColumnMapping(
        headers,
        format.headers,
        format.mapping,
      );
      return { ...format, mapping: adjustedMapping };
    }
  }

  return null;
}

/**
 * Adjust column mapping based on actual header positions
 */
function adjustColumnMapping(
  actualHeaders: string[],
  expectedHeaders: string[],
  defaultMapping: CSVColumnMapping,
): CSVColumnMapping {
  const normalizedActual = actualHeaders.map(normalizeHeader);
  const normalizedExpected = expectedHeaders.map(normalizeHeader);

  const findColumn = (expectedIndex: number): number => {
    const expected = normalizedExpected[expectedIndex];
    if (!expected) return expectedIndex;

    const actualIndex = normalizedActual.findIndex(
      (h) => h.includes(expected) || expected.includes(h),
    );
    return actualIndex >= 0 ? actualIndex : expectedIndex;
  };

  return {
    dateColumn: findColumn(defaultMapping.dateColumn),
    descriptionColumn: findColumn(defaultMapping.descriptionColumn),
    amountColumn:
      defaultMapping.amountColumn >= 0
        ? findColumn(defaultMapping.amountColumn)
        : -1,
    debitColumn:
      defaultMapping.debitColumn !== undefined
        ? findColumn(defaultMapping.debitColumn)
        : undefined,
    creditColumn:
      defaultMapping.creditColumn !== undefined
        ? findColumn(defaultMapping.creditColumn)
        : undefined,
    categoryColumn:
      defaultMapping.categoryColumn !== undefined
        ? findColumn(defaultMapping.categoryColumn)
        : undefined,
  };
}

/**
 * Parse date string to YYYY-MM-DD format
 */
function parseDate(dateStr: string, format: string): string {
  const cleaned = dateStr.trim();

  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  // Try common formats
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    // YYYYMMDD
    [/^(\d{4})(\d{2})(\d{2})$/, (m) => `${m[1]}-${m[2]}-${m[3]}`],
    // MM/DD/YYYY
    [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      (m) => `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
    ],
    // DD/MM/YYYY
    [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      (m) => `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`,
    ],
    // YYYY/MM/DD
    [
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    ],
    // Jan 15, 2025
    [
      /^([A-Za-z]{3})\s+(\d{1,2}),?\s*(\d{4})$/,
      (m) => {
        const months: Record<string, string> = {
          jan: "01",
          feb: "02",
          mar: "03",
          apr: "04",
          may: "05",
          jun: "06",
          jul: "07",
          aug: "08",
          sep: "09",
          oct: "10",
          nov: "11",
          dec: "12",
        };
        return `${m[3]}-${months[m[1].toLowerCase()] || "01"}-${m[2].padStart(2, "0")}`;
      },
    ],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return formatter(match);
    }
  }

  // Fallback: try to extract any date-like pattern
  const genericMatch = cleaned.match(/(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
  if (genericMatch) {
    return `${genericMatch[1]}-${genericMatch[2].padStart(2, "0")}-${genericMatch[3].padStart(2, "0")}`;
  }

  // Last resort: return today's date
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse amount string to number
 */
function parseAmount(
  value: string,
  debitValue?: string,
  creditValue?: string,
): number {
  // If we have separate debit/credit columns
  // Convention: Negative = outflow (debit), Positive = inflow (credit)
  if (debitValue !== undefined && creditValue !== undefined) {
    const debit = parseFloat(debitValue.replace(/[^0-9.-]/g, "")) || 0;
    const credit = parseFloat(creditValue.replace(/[^0-9.-]/g, "")) || 0;
    return debit > 0 ? -debit : credit;
  }

  // Single amount column
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const amount = parseFloat(cleaned) || 0;

  // Handle parentheses for negative numbers: (123.45) = -123.45
  if (value.includes("(") && value.includes(")")) {
    return -Math.abs(amount);
  }

  return amount;
}

/**
 * Auto-detect columns when no known format matches
 */
function autoDetectColumns(rows: string[][]): CSVColumnMapping | null {
  if (rows.length < 2) return null;

  const headers = rows[0];
  const normalizedHeaders = headers.map((h) => h.toLowerCase());

  let dateColumn = -1;
  let descriptionColumn = -1;
  let amountColumn = -1;
  let debitColumn: number | undefined;
  let creditColumn: number | undefined;

  // Find date column
  const dateKeywords = [
    "date",
    "transaction date",
    "trans date",
    "posted",
    "post date",
  ];
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (dateKeywords.some((k) => normalizedHeaders[i].includes(k))) {
      dateColumn = i;
      break;
    }
  }

  // Find description column
  const descKeywords = ["description", "merchant", "name", "payee", "memo"];
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (descKeywords.some((k) => normalizedHeaders[i].includes(k))) {
      descriptionColumn = i;
      break;
    }
  }

  // Find amount column(s)
  const amountKeywords = ["amount", "total", "value", "sum"];
  const debitKeywords = ["debit", "withdrawal", "out"];
  const creditKeywords = ["credit", "deposit", "in"];

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    if (debitKeywords.some((k) => header.includes(k))) {
      debitColumn = i;
    } else if (creditKeywords.some((k) => header.includes(k))) {
      creditColumn = i;
    } else if (amountKeywords.some((k) => header.includes(k))) {
      amountColumn = i;
    }
  }

  // If no amount column found but have debit/credit, use those
  if (
    amountColumn === -1 &&
    debitColumn !== undefined &&
    creditColumn !== undefined
  ) {
    amountColumn = -1; // Will use debit/credit columns
  }

  // Fallback: look for columns with numeric values
  if (amountColumn === -1 && debitColumn === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (i === dateColumn || i === descriptionColumn) continue;

      // Check if column has numeric values
      const hasNumbers = rows.slice(1, 5).some((row) => {
        const val = row[i];
        return val && /^[$€£]?[\d,.-]+$/.test(val.trim());
      });

      if (hasNumbers) {
        amountColumn = i;
        break;
      }
    }
  }

  // Verify we have minimum required columns
  if (dateColumn === -1 || descriptionColumn === -1) {
    // Try position-based fallback
    if (rows[0].length >= 3) {
      dateColumn = 0;
      descriptionColumn = 1;
      amountColumn = 2;
    } else {
      return null;
    }
  }

  return {
    dateColumn,
    descriptionColumn,
    amountColumn,
    debitColumn,
    creditColumn,
  };
}

/**
 * Parse CSV bank statement
 */
export function parseCSV(content: string): CSVParseResult {
  const rows = parseCSVRows(content);

  if (rows.length < 2) {
    return {
      transactions: [],
      format: "Unknown",
      confidence: 0,
    };
  }

  // Detect format
  let format = detectFormat(rows[0]);
  let confidence = 0.9;

  if (!format) {
    const autoMapping = autoDetectColumns(rows);
    if (autoMapping) {
      format = {
        name: "Auto-detected",
        headers: rows[0],
        mapping: autoMapping,
        dateFormat: "YYYY-MM-DD",
      };
      confidence = 0.7;
    } else {
      return {
        transactions: [],
        format: "Unknown",
        confidence: 0,
      };
    }
  }

  const { mapping, dateFormat } = format;
  const transactions: ParsedTransaction[] = [];

  // Skip header row and any additional skip rows
  const dataStartRow = (format.skipRows || 0) + 1;

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (!row || row.every((cell) => !cell.trim())) continue;

    try {
      const dateStr = row[mapping.dateColumn] || "";
      const description = row[mapping.descriptionColumn] || "";

      let amount: number;
      if (
        mapping.amountColumn >= 0 &&
        mapping.debitColumn === undefined &&
        mapping.creditColumn === undefined
      ) {
        amount = parseAmount(row[mapping.amountColumn] || "0");
      } else {
        amount = parseAmount(
          "",
          row[mapping.debitColumn ?? 0] || "",
          row[mapping.creditColumn ?? 0] || "",
        );
      }

      // Skip if essential fields are missing
      if (!description.trim() || (isNaN(amount) && amount !== 0)) continue;

      // Skip if amount is 0 (likely a header or balance row)
      if (amount === 0) continue;

      transactions.push({
        date: parseDate(dateStr, dateFormat),
        description: description.trim(),
        amount, // Preserve sign: negative = outflow, positive = inflow
        category: undefined, // Will be set by merchant resolver
        confidence: confidence,
      });
    } catch {
      // Skip malformed rows
      continue;
    }
  }

  return {
    transactions,
    format: format.name,
    confidence,
  };
}

/**
 * Check if content is likely a CSV file
 */
export function isCSVContent(content: string): boolean {
  // Check for CSV-like structure
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;

  // Check if lines have consistent comma counts
  const commaCounts = lines
    .slice(0, 5)
    .map((l) => (l.match(/,/g) || []).length);
  const avgCommas = commaCounts.reduce((a, b) => a + b, 0) / commaCounts.length;

  return (
    avgCommas >= 2 && commaCounts.every((c) => Math.abs(c - avgCommas) <= 2)
  );
}

/**
 * Parse CSV file
 */
export async function parseCSVFile(file: File): Promise<CSVParseResult> {
  const content = await file.text();
  return parseCSV(content);
}
