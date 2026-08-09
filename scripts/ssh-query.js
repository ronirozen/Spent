const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '192.168.1.21',
      username: 'root',
      password: '050410'
    });

    const query = `
      SELECT id, date, original_description, description, merchant_domain 
      FROM transactions 
      WHERE original_description IS NOT NULL 
        AND original_description != description 
      ORDER BY date DESC 
      LIMIT 10;
    `;
    const res = await ssh.execCommand(`docker exec spent sqlite3 data/spent.db "${query}"`);
    console.log("SMART MERCHANT DATA IN REMOTE DB:");
    console.log(res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
