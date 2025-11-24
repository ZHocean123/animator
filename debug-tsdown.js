const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting tsdown with debug...');

const tsdownPath = path.join(__dirname, 'node_modules', 'tsdown', 'dist', 'run.mjs');
console.log('Tsdown path:', tsdownPath);
console.log('Working directory:', __dirname);

// Check if file exists
if (!fs.existsSync(tsdownPath)) {
  console.error('Tsdown executable not found at:', tsdownPath);
  process.exit(1);
}

// Try to run with --debug flag
const child = spawn('node', [tsdownPath, '--debug'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development', DEBUG: 'tsdown:*' }
});

let stdoutBuffer = '';
let stderrBuffer = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutBuffer += text;
  console.log(`stdout: ${text}`);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  stderrBuffer += text;
  console.error(`stderr: ${text}`);
});

child.on('error', (error) => {
  console.error('Failed to start subprocess:', error);
  console.error('Error code:', error.code);
  console.error('Error signal:', error.signal);
});

child.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
  
  if (code !== 0) {
    console.error('=== ERROR SUMMARY ===');
    console.error('Exit code:', code);
    if (stdoutBuffer) console.error('Stdout buffer:', stdoutBuffer);
    if (stderrBuffer) console.error('Stderr buffer:', stderrBuffer);
  }
});

// Add timeout to prevent hanging
setTimeout(() => {
  console.error('Process timed out after 30 seconds');
  child.kill('SIGTERM');
}, 30000);