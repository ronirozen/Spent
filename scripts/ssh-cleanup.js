const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '192.168.1.21',
      username: 'root',
      password: '050410',
      tryKeyboard: true,
      readyTimeout: 20000
    });

    const script = `
const db = require('better-sqlite3')('data/spent.db');
const workspaces = db.prepare("SELECT id FROM workspaces").all();
let totalDeleted = 0;

for (const w of workspaces) {
  const cleanupDuplicatesStmt = db.prepare(\`
    DELETE FROM transactions
    WHERE workspace_id = ? AND status = 'pending'
      AND EXISTS (
        SELECT 1 FROM transactions t2
        WHERE t2.workspace_id = transactions.workspace_id
          AND t2.account_number = transactions.account_number
          AND t2.original_amount = transactions.original_amount
          AND t2.original_currency = transactions.original_currency
          AND t2.status = 'completed'
          AND abs(julianday(t2.date) - julianday(transactions.date)) <= 5
          AND t2.id != transactions.id
      )
  \`);
  const res = cleanupDuplicatesStmt.run(w.id);
  totalDeleted += res.changes;
}

console.log("Deleted " + totalDeleted + " fuzzy duplicate pending transactions!");
`;
    
    // Write the script to the remote server and run it via docker exec node
    await ssh.execCommand(`cat << 'EOF' > /DATA/AppData/spent/data/cleanup-fuzzy.js\n${script}\nEOF`);
    const res = await ssh.execCommand(`docker exec spent node data/cleanup-fuzzy.js`);
    
    console.log("CLEANUP OUTPUT:\n", res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);

    process.exit(0);
  } catch (err) {
    console.error("SSH Error:", err);
    process.exit(1);
  }
}

run();
