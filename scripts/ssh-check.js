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

    const res = await ssh.execCommand('docker ps');
    console.log('DOCKER PS:\n', res.stdout);

    const res2 = await ssh.execCommand('ls -la /app || ls -la /var/www || find / -name "spent" -maxdepth 3 2>/dev/null');
    console.log('LOCATIONS:\n', res2.stdout);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
