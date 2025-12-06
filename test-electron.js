// Test if we're actually running in Electron context
console.log('Process type:', process.type);
console.log('Versions:', process.versions);

if (process.type === 'browser') {
  // Main process
  const { app, BrowserWindow } = require('electron');
  console.log('Main process - app:', typeof app);

  app.whenReady().then(() => {
    console.log('App ready!');
    const win = new BrowserWindow({ width: 400, height: 300 });
    win.loadURL('data:text/html,<h1>Electron Works!</h1>');
  });
} else {
  console.log('Not in Electron main process');
  console.log('This script should be run with: electron test-electron.js');
}
