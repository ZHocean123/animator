const {spawn} = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, 'node_modules/.pnpm/electron@22.3.27/node_modules/electron/dist/electron');

const child = spawn(electronPath, ['.', '--inspect=9220', '--disable-gpu'], {
  stdio: 'inherit'
});

child.on('exit', process.exit);