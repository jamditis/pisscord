const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, desktopCapturer, clipboard, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Setup persistent logging
const logFilePath = path.join(app.getPath('userData'), 'pisscord.log');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
}

logToFile(`App starting... Version: ${app.getVersion()}`);
logToFile(`OS: ${os.platform()} ${os.release()} ${os.arch()}`);

let mainWindow;
let tray;

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the first instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Auto-install when app closes

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#202225',
    icon: path.join(__dirname, 'pisscord-purple.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
  });

  // Enable screen capture permissions for getDisplayMedia
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Grant permission
    } else {
      callback(false);
    }
  });

  // Detect dev mode
  const isDev = !app.isPackaged;

  if (isDev) {
      // In development, try to find the Vite dev server on common ports
      const tryPorts = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
      let loaded = false;

      for (const port of tryPorts) {
          try {
              await mainWindow.loadURL(`http://localhost:${port}`);
              console.log(`Loaded from port ${port}`);
              loaded = true;
              break;
          } catch (e) {
              console.log(`Port ${port} not available, trying next...`);
          }
      }

      if (!loaded) {
          console.error('Could not connect to Vite dev server');
          mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
      }

      mainWindow.webContents.openDevTools();
  } else {
      // In production, load from built files
      mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Intercept navigation to external links and open in default browser
  // Allow Firebase/Google auth URLs to navigate normally (needed for auth flow)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();

    // Allow navigation within the app (localhost or file://)
    if (currentUrl.startsWith('http://localhost') || currentUrl.startsWith('file://')) {
      // Allow Firebase auth and Google sign-in URLs
      if (url.includes('firebaseapp.com/__/auth') || url.includes('accounts.google.com')) {
        return; // Let these navigate normally
      }
      // If navigating away from app, open in external browser
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });

  // Handle new window requests (e.g., target="_blank" links)
  // Allow Firebase auth popups to open inside Electron so signInWithPopup works
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('firebaseapp.com/__/auth') || url.includes('accounts.google.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 600,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        }
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

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
  const iconPath = path.join(__dirname, 'pisscord-purple.ico');

  // Try to load pisscord.ico first
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

// IPC handler for screen capture sources
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 300, height: 200 },
    fetchWindowIcons: true
  });
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }));
});

// IPC handler for Google Sign-In (manual OAuth flow for Electron)
// signInWithPopup fails in Electron because the popup can't postMessage
// back to a file:// origin. Instead, we open a BrowserWindow to Google's
// OAuth consent screen and extract the ID token after the redirect.
ipcMain.handle('google-sign-in', async () => {
  const GOOGLE_CLIENT_ID = '582017997210-u9lhvn9rglcch5pae0nis7668hgfhe14.apps.googleusercontent.com';
  const REDIRECT_URI = 'https://pisscord-edbca.firebaseapp.com/__/auth/handler';

  // Build Google OAuth URL requesting an id_token via implicit grant
  const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: nonce,
    prompt: 'select_account',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: true,
      autoHideMenuBar: true,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    let resolved = false;

    // Google's implicit flow redirects to: redirect_uri#id_token=...&access_token=...
    // Electron's navigation events strip the URL fragment, so we can't read it
    // from will-navigate or will-redirect. Instead, we let the page load and
    // read window.location.hash via executeJavaScript.
    //
    // The Firebase auth handler page (/__/auth/handler) parses the fragment
    // and tries to postMessage back to the opener. We don't care about that —
    // we just need the hash before Firebase's JS clears it.

    authWindow.webContents.on('did-finish-load', async () => {
      if (resolved) return;
      const url = authWindow.webContents.getURL();

      // Only extract from the Firebase auth handler redirect page
      if (!url.startsWith(REDIRECT_URI)) return;

      try {
        // Read the hash fragment — this works because did-finish-load fires
        // after the HTML is loaded but typically before inline scripts execute.
        // We also retry a few times in case of timing issues.
        for (let attempt = 0; attempt < 3; attempt++) {
          const fragment = await authWindow.webContents.executeJavaScript(
            'window.location.hash'
          );

          if (fragment && fragment.length > 1) {
            const hashParams = new URLSearchParams(fragment.substring(1));
            const idToken = hashParams.get('id_token');
            if (idToken) {
              resolved = true;
              authWindow.close();
              resolve({ idToken });
              return;
            }
            const error = hashParams.get('error');
            if (error) {
              resolved = true;
              authWindow.close();
              reject(new Error(`Google sign-in error: ${error}`));
              return;
            }
          }

          // Wait 200ms before retrying
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        // If we got here, the hash didn't contain tokens. The page might have
        // processed them already. Try reading from the page's DOM as a last resort.
        logToFile('Google Sign-In: could not extract token from hash after 3 attempts');
      } catch (e) {
        // Window may have been destroyed between attempts
        if (!resolved) {
          logToFile(`Google Sign-In: executeJavaScript error: ${e.message}`);
        }
      }
    });

    authWindow.on('closed', () => {
      if (!resolved) {
        reject(new Error('Sign-in window was closed'));
      }
    });

    authWindow.loadURL(authUrl);
  });
});

// IPC handler for clipboard
ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});

// IPC handler for file logging
ipcMain.on('log-to-file', (event, message) => {
  logToFile(message);
});

// IPC handler for opening external links in default browser
ipcMain.on('open-external', (event, url) => {
  // Validate URL to prevent security issues
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      shell.openExternal(url);
    }
  } catch (err) {
    console.error('Invalid URL:', url);
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
