const { spawn } = require('child_process');
const path = require('path');

console.log('Starting tsdown in haiku-testing directory...');

const child = spawn('yarn', ['tsdown', '--debug'], {
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