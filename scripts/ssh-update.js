const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '192.168.1.21',
      username: 'root',
      password: '050410'
    });
    console.log("Connected via SSH");

    console.log("Triggering dedup fix API...");
    const curlRes = await ssh.execCommand('curl -s http://localhost:41234/api/admin/fix-dedup');
    console.log('CURL RESULT:\n', curlRes.stdout);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
