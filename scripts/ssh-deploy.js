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

    console.log("Connected. Deploying latest changes...");
    const res = await ssh.execCommand('cd /DATA/AppData/spent && git fetch origin main && git reset --hard origin/main && docker compose build spent && docker rm -f spent && docker compose up -d spent');
    
    console.log("OUTPUT:\n", res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);

    process.exit(0);
  } catch (err) {
    console.error("SSH Error:", err);
    process.exit(1);
  }
}

run();
