const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/server/db/queries/transactions.ts');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  'export function getNeedsReviewCountByCategory(\r\n  workspaceId: number,\r\n  from: string,\r\n  to: string\r\n): NeedsReviewCount[] {',
  'export function getNeedsReviewCountByCategory(\r\n  workspaceId: number,\r\n  from: string,\r\n  to: string,\r\n  filter?: "all" | "subscriptions" | "regular"\r\n): NeedsReviewCount[] {'
);
fs.writeFileSync(file, text, 'utf8');
console.log('Done 2');
