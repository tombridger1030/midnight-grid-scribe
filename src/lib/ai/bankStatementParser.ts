/**
 * Bank Statement Parser Service
 *
 * Parses PDF/image bank statements and extracts transactions using AI.
 * Supports both PDF (via pdf.js) and images (via OpenAI OCR).
 * Uses Anthropic Claude for transaction extraction and categorization.
 * Proxies through Supabase Edge Function to avoid CORS issues.
 */

import * as pdfjsLib from "pdfjs-dist";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { parseCSVFile, isCSVContent } from "./csvParser";
import { applyTransferDetection } from "./transferDetector";

// Set worker path - use unpkg which has all npm versions available
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Edge Function URL
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

export type FileType = "pdf" | "png" | "jpg" | "jpeg" | "csv";

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category?: string;
  confidence: number;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  totalAmount: number;
  confidence: number;
  rawText?: string;
}

export interface ImportError {
  message: string;
  code: string;
}

// Transaction categories for AI classification
const TRANSACTION_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Bills & Utilities",
  "Entertainment",
  "Health & Wellness",
  "Travel",
  "Education",
  "Personal Care",
  "Home Improvement",
  "Subscriptions",
  "Income",
  "Transfer",
  "Investment",
  "Other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

/**
 * Try to parse a string as a JSON array
 */
function tryParseArray(jsonString: string): unknown[] | null {
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Extract JSON array from AI response that may be wrapped in markdown or text.
 * Attempts multiple extraction strategies in order of likelihood.
 */
function extractJSONFromResponse(content: string): unknown[] {
  const cleanContent = content.replace(/^\uFEFF/, "").trim();

  // Strategy 1: Direct parse
  const direct = tryParseArray(cleanContent);
  if (direct) return direct;

  // Strategy 2: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
  const markdownMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    const fromMarkdown = tryParseArray(markdownMatch[1].trim());
    if (fromMarkdown) return fromMarkdown;
  }

  // Strategy 3: Find raw JSON array pattern in text
  const arrayMatch = cleanContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    const fromArrayPattern = tryParseArray(arrayMatch[0]);
    if (fromArrayPattern) return fromArrayPattern;
  }

  // Strategy 4: Salvage truncated JSON by reconstructing from complete objects
  if (cleanContent.startsWith("[")) {
    const objectMatches = cleanContent.match(/\{\s*"date"[^}]+\}/g);
    if (objectMatches && objectMatches.length > 0) {
      const reconstructed = "[" + objectMatches.join(",") + "]";
      const salvaged = tryParseArray(reconstructed);
      if (salvaged) {
        console.log(
          `Salvaged ${salvaged.length} transactions from truncated response`,
        );
        return salvaged;
      }
    }
  }

  // All strategies failed - log details for debugging
  console.error("Failed to extract JSON from AI response.");
  console.error("Content preview:", cleanContent.slice(0, 500));
  console.error("Content length:", cleanContent.length);
  console.error("Content ending:", cleanContent.slice(-100));

  throw new Error(
    `Could not find valid JSON array in AI response. Response started with: "${cleanContent.slice(0, 100)}..."`,
  );
}

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

/**
 * Convert image file to base64 for OpenAI OCR
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64
      const base64 = result.split(",")[1];
      resolve(`data:${file.type};base64,${base64}`);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from image using OpenAI GPT-4o OCR
 */
async function extractTextFromImage(imageData: string): Promise<string> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabase.supabaseKey}`,
      apikey: supabase.supabaseKey,
    },
    body: JSON.stringify({
      provider: "openai",
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial document parser. Extract ALL text from the bank statement image.
Preserve the layout and structure as much as possible. Include dates, descriptions, and amounts.
Return ONLY the extracted text, no explanations.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this bank statement:",
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || "";
}

/**
 * Parse transactions from extracted text using Claude
 */
async function parseTransactionsFromText(text: string): Promise<ParseResult> {
  const categoriesList = TRANSACTION_CATEGORIES.join(", ");

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabase.supabaseKey}`,
      apikey: supabase.supabaseKey,
    },
    body: JSON.stringify({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: `You are a financial transaction parser. Extract transactions from the bank statement text.

For each transaction, identify:
1. Date (convert to YYYY-MM-DD format)
2. Description (merchant name or transaction description)
3. Amount (NEGATIVE for expenses/debits/money out, POSITIVE for income/credits/money in)
4. Category (choose from: ${categoriesList})

IMPORTANT RULES:
- If the year is not shown, assume the current year
- Format dates as YYYY-MM-DD
- Return ONLY valid JSON
- If you cannot determine a value, use null
- Exclude headers, footers, and page numbers
- Group related charges (like tips with meals) when clear
- Match amounts to their corresponding descriptions

Return ONLY a JSON array in this exact format:
[
  {
    "date": "2025-01-15",
    "description": "Starbucks",
    "amount": -12.50,
    "category": "Food & Dining",
    "confidence": 0.95
  },
  {
    "date": "2025-01-15",
    "description": "PAYROLL DEPOSIT",
    "amount": 3500.00,
    "category": "Income",
    "confidence": 0.98
  }
]`,
      messages: [
        {
          role: "user",
          content: `Extract all transactions from this bank statement:\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Parse JSON response using robust extraction
  const transactions = extractJSONFromResponse(content) as ParsedTransaction[];

  // Validate and filter transactions
  const validTransactions = transactions.filter(
    (t): t is ParsedTransaction =>
      t &&
      typeof t.date === "string" &&
      typeof t.description === "string" &&
      typeof t.amount === "number" &&
      t.description.trim().length > 0,
  );

  // Apply transfer/investment pattern detection to override categories
  const enhancedTransactions = applyTransferDetection(validTransactions);

  const totalAmount = enhancedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  );
  const avgConfidence =
    enhancedTransactions.length > 0
      ? enhancedTransactions.reduce(
          (sum, t) => sum + (t.confidence || 0.5),
          0,
        ) / enhancedTransactions.length
      : 0.5;

  return {
    transactions: enhancedTransactions,
    totalAmount,
    confidence: avgConfidence,
    rawText: text.substring(0, 1000), // Store first 1000 chars for reference
  };
}

/**
 * Main parsing function - routes to appropriate parser
 */
export async function parseBankStatement(
  file: File,
): Promise<ParseResult & { errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let extractedText = "";

  try {
    // Determine file type
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Check for CSV files first
    if (
      fileType.includes("csv") ||
      fileType.includes("text/csv") ||
      fileType.includes("text/plain") ||
      fileName.endsWith(".csv")
    ) {
      // Try CSV parsing
      const csvResult = await parseCSVFile(file);
      if (csvResult.transactions.length > 0) {
        // Apply transfer/investment pattern detection
        const enhancedTransactions = applyTransferDetection(
          csvResult.transactions.map((t) => ({
            ...t,
            confidence: csvResult.confidence,
          })),
        );
        const totalAmount = enhancedTransactions.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0,
        );
        return {
          transactions: enhancedTransactions,
          totalAmount,
          confidence: csvResult.confidence,
          rawText: `CSV parsed from ${csvResult.format} format`,
          errors,
        };
      }
    }

    if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      extractedText = await extractTextFromPDF(file);
    } else if (
      fileType.includes("png") ||
      fileType.includes("jpg") ||
      fileType.includes("jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg")
    ) {
      const imageData = await imageToBase64(file);
      extractedText = await extractTextFromImage(imageData);
    } else if (
      fileType.includes("csv") ||
      fileType.includes("text") ||
      fileName.endsWith(".csv")
    ) {
      // CSV parsing failed above, try AI extraction
      extractedText = await file.text();
    } else {
      throw new Error(
        "Unsupported file type. Please upload a PDF, CSV, or image file.",
      );
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error(
        "Could not extract text from the file. Please try a clearer image or PDF.",
      );
    }

    // Parse transactions from extracted text
    const result = await parseTransactionsFromText(extractedText);

    return {
      ...result,
      rawText: extractedText,
      errors,
    };
  } catch (error) {
    console.error("Bank statement parsing failed:", error);
    errors.push({
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      code: "PARSE_ERROR",
    });
    throw error;
  }
}

/**
 * Convert parsed transactions to expense format
 * Preserves sign: negative = outflow, positive = inflow
 */
export function transactionsToExpenses(
  transactions: ParsedTransaction[],
): Array<{
  id: string;
  amount: number;
  account: string;
  item: string;
  category?: string;
  date: string;
  isInflow: boolean;
}> {
  return transactions.map((t) => ({
    id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: t.amount, // Preserve sign: negative = outflow, positive = inflow
    account: "Imported",
    item: t.description,
    category: t.category,
    date: t.date,
    isInflow: t.amount > 0,
  }));
}

/**
 * Store statement record in database (if using Supabase)
 */
export async function storeStatementRecord(
  fileName: string,
  fileType: FileType,
  result: ParseResult,
): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return null;

    // Insert statement record
    const { data: statement, error: statementError } = await supabase
      .from("bank_statements")
      .insert({
        user_id: userData.user.id,
        file_name: fileName,
        file_type: fileType,
        processing_status: "completed",
        total_transactions: result.transactions.length,
        total_amount: result.totalAmount,
      })
      .select("id")
      .single();

    if (statementError) throw statementError;

    // Insert transactions
    if (result.transactions.length > 0) {
      const transactionsToInsert = result.transactions.map((t) => ({
        statement_id: statement.id,
        user_id: userData.user.id,
        transaction_date: t.date,
        description: t.description,
        amount: Math.abs(t.amount),
        category: t.category || "Other",
        confidence_score: t.confidence,
      }));

      const { error: transactionsError } = await supabase
        .from("bank_statement_transactions")
        .insert(transactionsToInsert);

      if (transactionsError) throw transactionsError;
    }

    return statement.id;
  } catch (error) {
    console.error("Failed to store statement record:", error);
    return null;
  }
}

/**
 * Get recent statement imports
 */
export async function getRecentStatements(limit = 10) {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return [];

    const { data, error } = await supabase
      .from("bank_statements")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to load statements:", error);
    return [];
  }
}

/**
 * Load all transactions from Supabase for the current user
 * Used as fallback when localStorage is empty
 */
export async function loadTransactionsFromSupabase(): Promise<
  ParsedTransaction[]
> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return [];

    const { data, error } = await supabase
      .from("bank_statement_transactions")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("transaction_date", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Convert database records to ParsedTransaction format
    return data.map((record) => ({
      date: record.transaction_date,
      description: record.description,
      // Amount in DB is absolute, need to determine sign from category
      amount:
        record.category === "Income" || record.category === "Transfer"
          ? Math.abs(record.amount)
          : -Math.abs(record.amount),
      category: record.category,
      confidence: record.confidence_score || 0.9,
    }));
  } catch (error) {
    console.error("Failed to load transactions from Supabase:", error);
    return [];
  }
}
