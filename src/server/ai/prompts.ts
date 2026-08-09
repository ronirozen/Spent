import "server-only";

import type {
  CategoryForCategorization,
  PastCorrection,
  TransactionForCategorization,
} from "./types";

function renderCategoryLine(c: CategoryForCategorization, indent = ""): string {
  return c.description && c.description.trim().length > 0
    ? `${indent}- ${c.name} - ${c.description.trim()}`
    : `${indent}- ${c.name}`;
}

function renderCategories(categories: CategoryForCategorization[]): string {
  const ungrouped: CategoryForCategorization[] = [];
  const groups = new Map<string, CategoryForCategorization[]>();
  for (const c of categories) {
    const parent = c.parentName?.trim();
    if (parent && parent.length > 0) {
      const list = groups.get(parent) ?? [];
      list.push(c);
      groups.set(parent, list);
    } else {
      ungrouped.push(c);
    }
  }

  if (groups.size === 0) {
    return ungrouped.map((c) => renderCategoryLine(c)).join("\n");
  }

  const sections: string[] = [];
  for (const [parent, kids] of groups) {
    const lines = kids.map((c) => renderCategoryLine(c, "  ")).join("\n");
    sections.push(`${parent}:\n${lines}`);
  }
  if (ungrouped.length > 0) {
    const lines = ungrouped.map((c) => renderCategoryLine(c, "  ")).join("\n");
    sections.push(`Ungrouped:\n${lines}`);
  }
  return sections.join("\n");
}

const HIERARCHY_RULE =
  "Category lists may show group headers (e.g., 'Food:') with leaves indented beneath them. Group headers are NOT valid categoryName values - always pick a leaf (the indented name).";

function renderCorrections(corrections: PastCorrection[]): string {
  if (corrections.length === 0) return "";
  const lines = corrections
    .map(
      (c) =>
        `- "${c.description}" → wrong: ${c.wrongCategory}, correct: ${c.correctCategory}`
    )
    .join("\n");
  return `
Past corrections (the AI miscategorized these before — apply the lesson to similar merchants):
${lines}
`;
}

const CONFIDENCE_BLOCK = `Confidence scale (integer 1-7):
- 7: certain. Well-known merchant, clearly fits this category.
- 5-6: confident. Reasonable inference, minor ambiguity.
- 4: moderate. The category fits but other categories are plausible.
- 1-3: uncertain. Description is generic, merchant is unknown, or several categories could fit. Be honest — when in doubt give 1-3.`;

export function buildCategorizationPrompt(
  transactions: TransactionForCategorization[],
  categories: CategoryForCategorization[],
  allowProposals = false,
  pastCorrections: PastCorrection[] = []
): string {
  const categoriesBlock = renderCategories(categories);
  const correctionsBlock = renderCorrections(pastCorrections);

  const transactionLines = transactions
    .map(
      (t, i) =>
        `${i}: "${t.description}" | ${t.currency} ${Math.abs(t.amount).toFixed(2)}${t.memo ? ` | memo: "${t.memo}"` : ""}`
    )
    .join("\n");

  if (!allowProposals) {
    return `Categorize these financial transactions.

Categories (use ONLY these names):
${categoriesBlock}
${correctionsBlock}
Transactions:
${transactionLines}

Return ONLY a valid JSON array. Each element MUST have "index" (number), "categoryName" (string from the list above), "confidence" (integer 1-7), and "normalizedName" (string - a clean, Title Case version of the merchant name).
Optionally add "merchantDomain" (string - the website domain of the merchant, e.g. "netflix.com", "ramilevy.co.il", "wizzair.com").
Optionally add "isSubscription": true if this transaction looks like a recurring payment (e.g. Netflix, Spotify, gym membership, rent).
Example: [{"index": 0, "categoryName": "Groceries", "confidence": 7, "normalizedName": "Rami Levy", "merchantDomain": "ramilevy.co.il"}, {"index": 1, "categoryName": "Entertainment", "confidence": 5, "normalizedName": "Netflix", "merchantDomain": "netflix.com", "isSubscription": true}]

${CONFIDENCE_BLOCK}

Rules:
- Use ONLY category names from the provided list.
- ${HIERARCHY_RULE}
- Every transaction must be categorized; pick the closest matching category.
- Israeli merchant names (Hebrew or transliterated) are common; categorize based on the business type.
- Pay attention to the "NOT" clauses in the category descriptions - they disambiguate common confusions.
- Apply lessons from "Past corrections" - if a new merchant resembles a past correction, prefer the corrected category.
- "normalizedName" MUST be a clean, readable name for the merchant (strip branch numbers, gibberish, and abbreviations).
- "merchantDomain" MUST be the main website domain of the merchant if you know it. This is used to fetch the merchant's logo. If you don't know it, omit the field.`;
  }

  // Proposal mode: the AI is encouraged to suggest new categories whenever
  // a transaction doesn't have a clear fit in the existing list.
  return `Categorize these financial transactions. Use an existing category when one clearly fits. When no existing category is a good fit, propose a new one.

Existing categories:
${categoriesBlock}
${correctionsBlock}
Transactions:
${transactionLines}

Return ONLY a valid JSON array. Each element MUST have "index" (number), "categoryName" (string), "confidence" (integer 1-7), and "normalizedName" (string). If you propose a new category, add "isNew": true.
Optionally add "merchantDomain" (string) if you know the merchant's website domain.
Optionally add "isSubscription": true if this transaction looks like a recurring payment.

Existing category example: {"index": 0, "categoryName": "Groceries", "confidence": 7, "normalizedName": "Rami Levy", "merchantDomain": "ramilevy.co.il"}
New category example:      {"index": 3, "categoryName": "Pet Supplies", "isNew": true, "confidence": 5, "normalizedName": "Petco", "merchantDomain": "petco.com"}
Subscription example:      {"index": 1, "categoryName": "Entertainment", "confidence": 6, "isSubscription": true, "normalizedName": "Netflix", "merchantDomain": "netflix.com"}

${CONFIDENCE_BLOCK}

Rules for new categories:
- General English names that describe a TYPE of spending, not a specific merchant. Good: "Pet Supplies", "Childcare", "Tools & Hardware", "Books & Media". Bad: "Petco", "My favorite cafe".
- Title Case, 1-3 words, ASCII letters and spaces only.
- If several transactions need the same new category, reuse the same name with isNew: true on each.
- Don't over-propose. If an existing category is a reasonable fit, prefer it.

Rules for every transaction:
- Every transaction must be categorized - either an existing or a proposed new category.
- ${HIERARCHY_RULE}
- Israeli merchant names (Hebrew or transliterated) are common; categorize based on the business type.
- Pay attention to the "NOT" clauses in the category descriptions.
- Apply lessons from "Past corrections" - if a new merchant resembles a past correction, prefer the corrected category.
- "normalizedName" MUST be a clean, readable name for the merchant (strip branch numbers, gibberish, and abbreviations).
- "merchantDomain" MUST be the main website domain of the merchant if you know it. If you don't know it, omit the field.`;
}

export const SYSTEM_PROMPT =
  "You are a financial transaction categorizer. You receive transaction descriptions and return JSON categorizations. Be precise and consistent. Respond with ONLY the JSON array, no other text.";
