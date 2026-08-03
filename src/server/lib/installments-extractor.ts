import type Database from "better-sqlite3";

export interface ExtractedInstallmentInfo {
  isInstallment: boolean;
  installmentNumber: number | null;
  installmentTotal: number | null;
  cleanDescription: string;
}

const INSTALLMENT_REGEXES: RegExp[] = [
  // תשלום 3 מתוך 12, תשלום 3 מ-12, תשלום 3 מ 12, תשלום 03 מתוך 12
  /תשלומ(?:ים|י|ם)?\s*[:#-]?\s*(\d{1,2})\s*(?:מתוך|מ-|מ\s|out\s+of|\/)\s*(\d{1,2})/i,
  
  // (תשלום 3/12) or תשלום 3/12
  /תשלומ(?:ים|י|ם)?\s*[:#-]?\s*(\d{1,2})\s*\/\s*(\d{1,2})/i,

  // 3 מתוך 12, 3 מ-12
  /(?:^|\s|\(|\b)(\d{1,2})\s*(?:מתוך|מ-)\s*(\d{1,2})(?:$|\s|\)|\b)/i,

  // installment 3 of 12, payment 3 of 12, pmt 3/12
  /(?:installment|payment|pmt)\s*#?\s*(\d{1,2})\s*(?:of|\/)\s*(\d{1,2})/i,

  // Bracketed (3/12) or [3/12]
  /[\(\[]\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*[\)\]]/,

  // 3 of 12 (word boundary)
  /\b(\d{1,2})\s+of\s+(\d{1,2})\b/i,
];

/**
 * Normalizes merchant name by removing installment indicators, extra punctuation, and excessive whitespace.
 */
export function cleanMerchantDescription(text: string): string {
  if (!text) return "";
  let clean = text;

  for (const regex of INSTALLMENT_REGEXES) {
    clean = clean.replace(regex, " ");
  }

  // Also clean words like "תשלום אחרון" or loose punctuation left behind
  clean = clean
    .replace(/תשלום\s+אחרון/gi, " ")
    .replace(/[\(\)\[\]\-_–—:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clean || text.trim();
}

/**
 * Extracts installment number and total from scraper input or description/memo text.
 */
export function extractInstallments(input: {
  description: string;
  memo?: string | null;
  installments?: { number: number; total: number } | null;
  type?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
}): ExtractedInstallmentInfo {
  const { description = "", memo = "", installments, installmentNumber, installmentTotal } = input;

  // 1. Direct structured values already present
  if (
    installmentNumber != null &&
    installmentTotal != null &&
    installmentNumber > 0 &&
    installmentTotal > 0 &&
    installmentNumber <= installmentTotal
  ) {
    return {
      isInstallment: true,
      installmentNumber,
      installmentTotal,
      cleanDescription: cleanMerchantDescription(description),
    };
  }

  if (
    installments &&
    typeof installments.number === "number" &&
    typeof installments.total === "number" &&
    installments.number > 0 &&
    installments.total > 0 &&
    installments.number <= installments.total
  ) {
    return {
      isInstallment: true,
      installmentNumber: installments.number,
      installmentTotal: installments.total,
      cleanDescription: cleanMerchantDescription(description),
    };
  }

  // 2. Search description and memo for regex patterns
  const textsToSearch = [description, memo || ""].filter(Boolean);

  for (const text of textsToSearch) {
    for (const regex of INSTALLMENT_REGEXES) {
      const match = text.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);

        // Sanity checks: realistic installment counts (1..120), number <= total
        if (num > 0 && total > 0 && num <= total && total <= 120) {
          return {
            isInstallment: true,
            installmentNumber: num,
            installmentTotal: total,
            cleanDescription: cleanMerchantDescription(description),
          };
        }
      }
    }
  }

  // Check if type was explicitly installments even if counts were missing
  const isTypeInstallment = input.type === "installments";

  return {
    isInstallment: isTypeInstallment,
    installmentNumber: installmentNumber ?? null,
    installmentTotal: installmentTotal ?? null,
    cleanDescription: description.trim(),
  };
}

/**
 * Scans existing transactions and backfills installment metadata if found in descriptions or memos.
 */
export function backfillExistingInstallments(db: Database.Database): number {
  try {
    const rows = db.prepare(`
      SELECT id, description, memo, type, installment_number, installment_total 
      FROM transactions 
      WHERE (type != 'installments' OR installment_number IS NULL) 
        AND (
          description LIKE '%תשלום%' 
          OR description LIKE '%תשלומים%' 
          OR description LIKE '%מתוך%' 
          OR description LIKE '%מ-%' 
          OR description LIKE '%installment%' 
          OR description LIKE '%payment%' 
          OR description LIKE '%/%'
          OR memo LIKE '%תשלום%'
          OR memo LIKE '%/%'
        )
    `).all() as Array<{
      id: number;
      description: string;
      memo: string | null;
      type: string;
      installment_number: number | null;
      installment_total: number | null;
    }>;

    if (!rows || rows.length === 0) return 0;

    const updateStmt = db.prepare(`
      UPDATE transactions 
      SET type = 'installments', installment_number = ?, installment_total = ? 
      WHERE id = ?
    `);

    let updatedCount = 0;
    db.transaction(() => {
      for (const row of rows) {
        const extracted = extractInstallments({
          description: row.description,
          memo: row.memo,
          type: row.type,
          installmentNumber: row.installment_number,
          installmentTotal: row.installment_total,
        });

        if (
          extracted.isInstallment &&
          extracted.installmentNumber &&
          extracted.installmentTotal
        ) {
          updateStmt.run(
            extracted.installmentNumber,
            extracted.installmentTotal,
            row.id
          );
          updatedCount++;
        }
      }
    })();

    return updatedCount;
  } catch (err) {
    console.error("Failed to backfill installments:", err);
    return 0;
  }
}
