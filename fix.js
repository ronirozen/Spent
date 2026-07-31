const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/server/db/queries/transactions.ts');
let text = fs.readFileSync(file, 'utf8');
text = text.replace('  credentialIds?: number[];\r\n}', '  credentialIds?: number[];\r\n  subscriptionFilter?: "all" | "subscriptions" | "regular";\r\n}');
fs.writeFileSync(file, text, 'utf8');
console.log('Done');
