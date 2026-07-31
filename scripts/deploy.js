const { Client } = require('ssh2');

const config = {
  host: '192.168.1.21',
  port: 22,
  username: 'root',
  password: process.env.SSH_PASSWORD || '050410' // Defaults to the known password, can be overridden via env var
};

const REMOTE_DIR = '/DATA/AppData/spent';
const GITHUB_REPO = 'https://github.com/ronirozen/Spent.git';

// The bash script that will be executed on the remote server
const deployScript = `
  set -e
  echo "Deploying to ${REMOTE_DIR}..."
  cd ${REMOTE_DIR}

  if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    git remote add origin ${GITHUB_REPO}
  fi

  echo "Fetching latest changes from GitHub..."
  git fetch origin main

  echo "Resetting remote directory to match GitHub main branch..."
  git reset --hard origin/main

  echo "Rebuilding and restarting docker container..."
  docker compose up -d --build

  echo "Deployment successful!"
`;

console.log('Connecting to CasaOS server...');

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Executing deployment script...');
  
  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('Failed to execute script:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      if (code !== 0) {
        console.error(\`\nDeployment failed with exit code \${code}\`);
        process.exit(code);
      } else {
        console.log('\nDeployment finished successfully!');
      }
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
});

conn.connect(config);
