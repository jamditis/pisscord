const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let tray;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Auto-install when app closes

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#202225',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;
  
  if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
  } else {
      mainWindow.loadURL(startUrl);
  }

  // Handle minimize to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Prevent window from being destroyed when hidden
  mainWindow.on('closed', () => {
    // Don't set mainWindow to null - we want to keep it alive in the tray
    // mainWindow = null;
  });
}

function createTray() {
  let trayIcon;
  const iconPath = path.join(__dirname, 'icon.ico');

  // Try to load icon.ico first
  trayIcon = nativeImage.createFromPath(iconPath);

  // If icon doesn't exist, create a fallback from data URL (16x16 purple square)
  if (trayIcon.isEmpty()) {
    console.warn('Tray icon not found at:', iconPath);
    console.log('Creating fallback tray icon...');

    // Base64 encoded 16x16 PNG with purple color
    const pngData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAP0lEQVQ4T2NkoBAwUqifYdQAhtEwGBUG4oXB////GRkZGf9TNQD+//+PWgZQ1QCYAaMBMBoGw8AARvI1kE9gAACqvQURlKWzKwAAAABJRU5ErkJggg==';
    trayIcon = nativeImage.createFromDataURL(pngData);
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Pisscord', click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Pisscord');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Check for updates on startup (after 3 seconds to let app fully load)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  mainWindow.webContents.send('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes,
    releaseDate: info.releaseDate
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info.version);
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  mainWindow.webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
  mainWindow.webContents.send('update-download-progress', {
    percent: Math.round(progressObj.percent),
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  mainWindow.webContents.send('update-downloaded', {
    version: info.version
  });
});

// IPC handlers for update actions
ipcMain.on('download-update', () => {
  console.log('User requested update download');
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  console.log('User requested update installation');
  autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
});

// IPC handler to show and focus the window
ipcMain.on('show-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
  }
});

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed
  // The app should stay running in the tray
  // Only quit when user explicitly chooses "Quit" from tray menu
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  // Clean up tray icon before quitting
  if (tray) {
    tray.destroy();
  }
});
