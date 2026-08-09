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
      SELECT id, date, description, account_number, original_amount, original_currency, status
      FROM transactions 
      WHERE description LIKE '%WIZZ%' OR description LIKE '%אורבניקה%';
    `;
    const res = await ssh.execCommand(`docker exec spent sqlite3 data/spent.db "${query}"`);
    console.log(res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
