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
const rows = db.prepare("SELECT description, COUNT(*) as c FROM transactions WHERE merchant_domain IS NULL AND description IS NOT NULL GROUP BY description ORDER BY c DESC LIMIT 150").all();
console.log(JSON.stringify(rows));
`;
    
    // Write the script to the remote server and run it via docker exec node
    await ssh.execCommand(`cat << 'EOF' > /DATA/AppData/spent/data/get-merchants.js\n${script}\nEOF`);
    const res = await ssh.execCommand(`docker exec spent node data/get-merchants.js`);
    
    console.log(res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);

    process.exit(0);
  } catch (err) {
    console.error("SSH Error:", err);
    process.exit(1);
  }
}

run();
