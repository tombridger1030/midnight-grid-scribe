/**
 * Transfer & Investment Detector
 *
 * Pattern-based detection for bank transfers and investment transactions.
 * Runs post-AI to override categories with high confidence when patterns match.
 */

export type DetectionResult = {
  type: "transfer" | "investment" | null;
  subType?: string;
  confidence: number;
  matchedPattern?: string;
};

// Canadian bank transfer patterns
const TRANSFER_PATTERNS: Array<{ pattern: RegExp; subType: string }> = [
  // Interac e-Transfers
  { pattern: /E-?TRANSFER/i, subType: "e-transfer" },
  { pattern: /INTERAC\s*(SEND|RECV|E-?TRF|ETRF)/i, subType: "e-transfer" },
  { pattern: /ETRANSFER/i, subType: "e-transfer" },
  { pattern: /E\s*TFR/i, subType: "e-transfer" },

  // Wire transfers
  { pattern: /WIRE\s*TRANSFER/i, subType: "wire" },
  { pattern: /INTL?\s*WIRE/i, subType: "wire" },
  { pattern: /SWIFT\s*TRANSFER/i, subType: "wire" },

  // EFT / ACH
  { pattern: /\bEFT\b/i, subType: "eft" },
  { pattern: /\bACH\b/i, subType: "ach" },
  { pattern: /ELECTRONIC\s*FUNDS?\s*TRANSFER/i, subType: "eft" },

  // Generic transfers
  { pattern: /\bTFR\s*(TO|FROM|#?\d{4,})/i, subType: "internal" },
  {
    pattern: /TRANSFER\s*(TO|FROM)\s*(SAVINGS?|CHEQUING|CHECKING)/i,
    subType: "internal",
  },
  { pattern: /INTERNET\s*(BANKING\s*)?TRANSFER/i, subType: "internal" },
  { pattern: /ONLINE\s*BANKING\s*TRANSFER/i, subType: "internal" },
  { pattern: /FUNDS?\s*TRANSFER/i, subType: "internal" },
  { pattern: /ACCOUNT\s*TRANSFER/i, subType: "internal" },

  // Bill payments (to external parties)
  { pattern: /ONLINE\s*(BILL\s*)?PAY(MENT)?/i, subType: "bill-pay" },
  { pattern: /\bPAP\b.*PAY/i, subType: "pre-authorized" },
  { pattern: /PRE-?AUTH(ORIZED)?\s*PAY/i, subType: "pre-authorized" },

  // Direct deposits (incoming)
  { pattern: /DIRECT\s*DEPOSIT/i, subType: "direct-deposit" },
  { pattern: /PAYROLL/i, subType: "payroll" },
];

// Canadian investment account patterns
const INVESTMENT_PATTERNS: Array<{ pattern: RegExp; subType: string }> = [
  // Registered accounts (Canadian)
  { pattern: /\bTFSA\b/i, subType: "tfsa" },
  { pattern: /\bRRSP\b/i, subType: "rrsp" },
  { pattern: /\bRESP\b/i, subType: "resp" },
  { pattern: /\bFHSA\b/i, subType: "fhsa" },
  { pattern: /\bLIRA\b/i, subType: "lira" },
  { pattern: /\bRRIF\b/i, subType: "rrif" },
  {
    pattern: /REGISTERED\s*(RETIREMENT|EDUCATION|SAVINGS)/i,
    subType: "registered",
  },
  { pattern: /TAX.?FREE\s*SAVINGS/i, subType: "tfsa" },

  // Canadian brokerages
  { pattern: /QUESTRADE/i, subType: "brokerage" },
  { pattern: /WEALTHSIMPLE\s*(INVEST|TRADE|CRYPTO)?/i, subType: "brokerage" },
  { pattern: /\bITRADE\b/i, subType: "brokerage" },
  { pattern: /QTRADE/i, subType: "brokerage" },
  { pattern: /NATIONAL\s*BANK\s*DIRECT/i, subType: "brokerage" },
  { pattern: /NBDB/i, subType: "brokerage" },
  { pattern: /DESJARDINS\s*(ONLINE\s*)?BROKERAGE/i, subType: "brokerage" },
  { pattern: /DISNAT/i, subType: "brokerage" },

  // Big 5 bank investment arms
  { pattern: /TD\s*DIRECT\s*INVEST/i, subType: "brokerage" },
  { pattern: /TD\s*WATERHOUSE/i, subType: "brokerage" },
  { pattern: /RBC\s*DIRECT\s*INVEST/i, subType: "brokerage" },
  { pattern: /RBC\s*DI\b/i, subType: "brokerage" },
  { pattern: /BMO\s*INVESTORLINE/i, subType: "brokerage" },
  { pattern: /BMO\s*IL\b/i, subType: "brokerage" },
  { pattern: /SCOTIA\s*(I|MCLEOD|ITRADE)/i, subType: "brokerage" },
  { pattern: /CIBC\s*INVESTOR'?S?\s*EDGE/i, subType: "brokerage" },

  // US brokerages (common in Canada)
  { pattern: /INTERACTIVE\s*BROKERS/i, subType: "brokerage" },
  { pattern: /\bIBKR\b/i, subType: "brokerage" },
  { pattern: /FIDELITY/i, subType: "brokerage" },
  { pattern: /VANGUARD/i, subType: "brokerage" },
  { pattern: /SCHWAB/i, subType: "brokerage" },

  // Investment actions
  { pattern: /\bCONTRIBUTION\b/i, subType: "contribution" },
  {
    pattern: /DEPOSIT\s*TO\s*(TFSA|RRSP|RESP|FHSA|INVESTMENT)/i,
    subType: "contribution",
  },
  { pattern: /DIV(IDEND)?\s*REINVEST/i, subType: "dividend" },
  { pattern: /\bDRIP\b/i, subType: "dividend" },
  { pattern: /DIVIDEND\s*(PAYMENT|INCOME)/i, subType: "dividend" },
  { pattern: /CAPITAL\s*GAINS?/i, subType: "capital-gain" },
  { pattern: /MUTUAL\s*FUND/i, subType: "mutual-fund" },
  { pattern: /\bETF\b\s*(PURCHASE|BUY)/i, subType: "etf" },
  { pattern: /\bGIC\b/i, subType: "gic" },
  { pattern: /BOND\s*(PURCHASE|INTEREST)/i, subType: "bond" },

  // Crypto platforms
  { pattern: /COINBASE/i, subType: "crypto" },
  { pattern: /BINANCE/i, subType: "crypto" },
  { pattern: /KRAKEN/i, subType: "crypto" },
  { pattern: /NEWTON\s*(CRYPTO)?/i, subType: "crypto" },
  { pattern: /SHAKEPAY/i, subType: "crypto" },
  { pattern: /BITBUY/i, subType: "crypto" },
  { pattern: /NDAX/i, subType: "crypto" },

  // Robo-advisors
  { pattern: /WEALTHBAR/i, subType: "robo-advisor" },
  { pattern: /JUSTWEALTH/i, subType: "robo-advisor" },
  { pattern: /NEST\s*WEALTH/i, subType: "robo-advisor" },
  { pattern: /CI\s*DIRECT/i, subType: "robo-advisor" },
];

/**
 * Detect if a transaction description matches transfer or investment patterns
 */
export function detectTransferType(description: string): DetectionResult {
  const normalized = description.toUpperCase().trim();

  // Check investment patterns first (more specific)
  for (const { pattern, subType } of INVESTMENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        type: "investment",
        subType,
        confidence: 0.95,
        matchedPattern: pattern.source,
      };
    }
  }

  // Check transfer patterns
  for (const { pattern, subType } of TRANSFER_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        type: "transfer",
        subType,
        confidence: 0.9,
        matchedPattern: pattern.source,
      };
    }
  }

  return {
    type: null,
    confidence: 0,
  };
}

/**
 * Apply transfer/investment detection to an array of transactions
 * Returns transactions with potentially updated categories
 */
export function applyTransferDetection<
  T extends { description: string; category?: string; confidence: number },
>(transactions: T[]): T[] {
  return transactions.map((txn) => {
    const detection = detectTransferType(txn.description);

    if (detection.type) {
      return {
        ...txn,
        category: detection.type === "investment" ? "Investment" : "Transfer",
        confidence: Math.max(txn.confidence, detection.confidence),
        _detectionMeta: {
          detectedType: detection.type,
          subType: detection.subType,
          matchedPattern: detection.matchedPattern,
        },
      };
    }

    return txn;
  });
}

/**
 * Get human-readable label for subType
 */
export function getSubTypeLabel(subType: string): string {
  const labels: Record<string, string> = {
    // Transfer subtypes
    "e-transfer": "Interac e-Transfer",
    wire: "Wire Transfer",
    eft: "Electronic Funds Transfer",
    ach: "ACH Transfer",
    internal: "Internal Transfer",
    "bill-pay": "Bill Payment",
    "pre-authorized": "Pre-Authorized Payment",
    "direct-deposit": "Direct Deposit",
    payroll: "Payroll",

    // Investment subtypes
    tfsa: "TFSA",
    rrsp: "RRSP",
    resp: "RESP",
    fhsa: "FHSA",
    lira: "LIRA",
    rrif: "RRIF",
    registered: "Registered Account",
    brokerage: "Brokerage",
    contribution: "Contribution",
    dividend: "Dividend",
    "capital-gain": "Capital Gain",
    "mutual-fund": "Mutual Fund",
    etf: "ETF",
    gic: "GIC",
    bond: "Bond",
    crypto: "Cryptocurrency",
    "robo-advisor": "Robo-Advisor",
  };

  return labels[subType] || subType;
}

/**
 * Check if a transaction is likely a personal transfer (vs. business payment)
 * Useful for excluding from expense totals
 */
export function isPersonalTransfer(description: string): boolean {
  const detection = detectTransferType(description);
  if (detection.type !== "transfer") return false;

  // These are likely personal/internal, not business expenses
  const personalSubTypes = ["e-transfer", "internal", "wire"];
  return personalSubTypes.includes(detection.subType || "");
}

/**
 * Check if a transaction is an investment contribution
 * Useful for tracking savings rate
 */
export function isInvestmentContribution(description: string): boolean {
  const detection = detectTransferType(description);
  if (detection.type !== "investment") return false;

  const contributionSubTypes = [
    "tfsa",
    "rrsp",
    "resp",
    "fhsa",
    "contribution",
    "brokerage",
  ];
  return contributionSubTypes.includes(detection.subType || "");
}
