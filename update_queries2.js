const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/server/db/queries/transactions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Helper to inject subscription filter SQL
const injectSubFilter = `
  const subSql = filter === "subscriptions" ? " AND subscription_id IS NOT NULL" : filter === "regular" ? " AND subscription_id IS NULL" : "";
`;

// Helper for query replacement
function replaceQuery(funcName, sqlRegex, sqlReplacement) {
  const argsMatch = new RegExp(`export function ${funcName}\\([\\s\\S]*?\\)\\s*(?::\\s*[^\\{]+)?\\s*\\{`, 'g');
  content = content.replace(argsMatch, match => {
    if (match.includes('filter?: "all" | "subscriptions" | "regular"')) return match;
    return match.replace(/(\)\s*(?::\s*[^\{]+)?\s*\{)/, ",\n  filter?: \"all\" | \"subscriptions\" | \"regular\"\n$1\n" + injectSubFilter);
  });
  content = content.replace(sqlRegex, sqlReplacement);
}

replaceQuery('getMonthlySummary', /(AND is_excluded = 0)(\n\s+GROUP BY month)/, '$1${subSql}$2');
replaceQuery('getTopMerchants', /(AND is_excluded = 0)(\n\s+GROUP BY description)/, '$1${subSql}$2');
replaceQuery('getCategoryBreakdown', /(AND t.is_excluded = 0)(\n\s+GROUP BY t.category_id)/, '$1${subSql}$2');
replaceQuery('getCategorySpendInRange', /(AND is_excluded = 0)(\n\s+GROUP BY category_id)/, '$1${subSql}$2');
replaceQuery('getTopMerchantPerCategory', /(AND is_excluded = 0)(\n\s+GROUP BY category_id, description)/, '$1${subSql}$2');
replaceQuery('getCategorySpendByDay', /(AND t.is_excluded = 0)(\n\s+GROUP BY days.d)/, '$1${subSql}$2');
replaceQuery('getTopMerchantsForCategory', /(AND is_excluded = 0)(\n\s+GROUP BY description)/, '$1${subSql}$2');
replaceQuery('getPeriodTotal', /(AND is_excluded = 0)(`\n\s+\)\n\s+\.get)/, '$1${subSql}$2');
replaceQuery('getPeriodCount', /(AND is_excluded = 0)(`\n\s+\)\n\s+\.get)/, '$1${subSql}$2');

const needsReviewRegex = /(export function getNeedsReviewCountByCategory[\s\S]*?)(AND is_excluded = 0)(\n\s+GROUP BY category_id)/;
content = content.replace(needsReviewRegex, (match, p1, p2, p3) => {
  let newP1 = p1;
  if (!p1.includes('filter?:')) {
    newP1 = p1.replace(/(\)\s*(?::\s*[^\{]+)?\s*\{)/, ",\n  filter?: \"all\" | \"subscriptions\" | \"regular\"\n$1\n" + injectSubFilter);
  }
  return newP1 + p2 + "${subSql}" + p3;
});


// Now for QueryParams!
content = content.replace(
  /credentialIds\?: number\[\];\n\}/,
  'credentialIds?: number[];\n  subscriptionFilter?: "all" | "subscriptions" | "regular";\n}'
);

const queryTransactionsAppend = `
  const credentialIds =
    params.credentialIds && params.credentialIds.length > 0
      ? params.credentialIds
      : params.credentialId != null
        ? [params.credentialId]
        : undefined;
  appendCredentialIdsFilter(conditions, values, credentialIds, "t.");

  if (params.subscriptionFilter === "subscriptions") {
    conditions.push("t.subscription_id IS NOT NULL");
  } else if (params.subscriptionFilter === "regular") {
    conditions.push("t.subscription_id IS NULL");
  }

  const where = \`WHERE \${conditions.join(" AND ")}\`;`;

content = content.replace(
  /const credentialIds =[\s\S]*?const where = `WHERE \$\{conditions\.join\(" AND "\)\}`;/,
  queryTransactionsAppend
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Queries updated successfully.');
