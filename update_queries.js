const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/server/db/queries/transactions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Helper to inject subscription filter SQL
const injectSubFilter = `
  const subSql = filter === "subscriptions" ? " AND subscription_id IS NOT NULL" : filter === "regular" ? " AND subscription_id IS NULL" : "";
`;

// Helper for query replacement
function replaceQuery(funcName, sqlRegex, sqlReplacement, extraArgRegex) {
  // add filter to arguments
  const argsMatch = new RegExp(`export function ${funcName}\\([\\s\\S]*?\\)\\s*(?::\\s*[^\\{]+)?\\s*\\{`, 'g');
  content = content.replace(argsMatch, match => {
    if (match.includes('filter?: "all" | "subscriptions" | "regular"')) return match;
    return match.replace(/(\)\s*(?::\s*[^\{]+)?\s*\{)/, ",\n  filter?: \"all\" | \"subscriptions\" | \"regular\"\n$1\n" + injectSubFilter);
  });

  // add subSql to query string
  content = content.replace(sqlRegex, sqlReplacement);
}

// 1. getMonthlySummary
replaceQuery(
  'getMonthlySummary', 
  /(AND is_excluded = 0)(\n\s+GROUP BY month)/, 
  '$1${subSql}$2'
);

// 2. getTopMerchants
replaceQuery(
  'getTopMerchants',
  /(AND is_excluded = 0)(\n\s+GROUP BY description)/,
  '$1${subSql}$2'
);

// 3. getCategoryBreakdown
replaceQuery(
  'getCategoryBreakdown',
  /(AND t.is_excluded = 0)(\n\s+GROUP BY t.category_id)/,
  '$1${subSql}$2'
);

// 4. getCategorySpendInRange
replaceQuery(
  'getCategorySpendInRange',
  /(AND is_excluded = 0)(\n\s+GROUP BY category_id)/,
  '$1${subSql}$2'
);

// 5. getTopMerchantPerCategory
replaceQuery(
  'getTopMerchantPerCategory',
  /(AND is_excluded = 0)(\n\s+GROUP BY category_id, description)/,
  '$1${subSql}$2'
);

// 6. getCategorySpendByDay
replaceQuery(
  'getCategorySpendByDay',
  /(AND t.is_excluded = 0)(\n\s+GROUP BY days.d)/,
  '$1${subSql}$2'
);

// 7. getTopMerchantsForCategory
replaceQuery(
  'getTopMerchantsForCategory',
  /(AND is_excluded = 0)(\n\s+GROUP BY description)/,
  '$1${subSql}$2'
);

// 8. getPeriodTotal
replaceQuery(
  'getPeriodTotal',
  /(AND is_excluded = 0)(`\n\s+\)\n\s+\.get)/,
  '$1${subSql}$2'
);

// 9. getPeriodCount
replaceQuery(
  'getPeriodCount',
  /(AND is_excluded = 0)(`\n\s+\)\n\s+\.get)/,
  '$1${subSql}$2'
);

// 10. getNeedsReviewCountByCategory
// Oh I didn't see getNeedsReviewCountByCategory yet, let's search it.
const needsReviewRegex = /(export function getNeedsReviewCountByCategory\([\s\S]*?)(AND is_excluded = 0)(\n\s+GROUP BY category_id)/;
content = content.replace(needsReviewRegex, (match, p1, p2, p3) => {
  let newP1 = p1;
  if (!p1.includes('filter?:')) {
    newP1 = p1.replace(/(\)\s*(?::\s*[^\{]+)?\s*\{)/, ",\n  filter?: \"all\" | \"subscriptions\" | \"regular\"\n$1\n" + injectSubFilter);
  }
  return newP1 + p2 + "${subSql}" + p3;
});


fs.writeFileSync(filePath, content, 'utf8');
console.log('Queries updated successfully.');
