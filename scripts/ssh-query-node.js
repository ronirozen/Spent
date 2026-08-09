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
const rows = db.prepare("SELECT * FROM transactions WHERE original_description LIKE '%APPLE%' OR description LIKE '%APPLE%' ORDER BY date DESC LIMIT 10").all();
console.log(JSON.stringify(rows, null, 2));
`;
    
    // Write the script to the remote server and run it via docker exec node
    await ssh.execCommand(`cat << 'EOF' > /DATA/AppData/spent/data/test-apple.js\n${script}\nEOF`);
    const res = await ssh.execCommand(`docker exec spent node data/test-apple.js`);
    
    console.log("DB OUTPUT:\n", res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);

    process.exit(0);
  } catch (err) {
    console.error("SSH Error:", err);
    process.exit(1);
  }
}

run();
