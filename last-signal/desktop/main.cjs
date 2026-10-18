'use strict';

const { app, BrowserWindow, dialog, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const gamePath = path.join(__dirname, '..', 'index.html');
const gameURL = pathToFileURL(gamePath).href;
const gamePermissions = new Set(['pointerLock', 'fullscreen']);
let mainWindow = null;

function isGameURL(url) {
  return typeof url === 'string' && url.split('#')[0] === gameURL;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: '마지막 신호',
    backgroundColor: '#10191e',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      partition: 'persist:last-signal',
      backgroundThrottling: true
    }
  });

  const window = mainWindow;
  const contents = window.webContents;
  const session = contents.session;
  const mayUsePermission = (source, permission, details = {}) =>
    source === contents &&
    isGameURL(source.getURL()) &&
    gamePermissions.has(permission) &&
    details.isMainFrame !== false &&
    (!details.requestingUrl || isGameURL(details.requestingUrl));

  session.setPermissionCheckHandler((source, permission, _origin, details) =>
    mayUsePermission(source, permission, details));
  session.setPermissionRequestHandler((source, permission, callback, details) =>
    callback(mayUsePermission(source, permission, details)));
  session.on('will-download', event => event.preventDefault());

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    if (!isGameURL(url)) event.preventDefault();
  });
  contents.on('will-attach-webview', event => event.preventDefault());
  contents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11' && !input.isAutoRepeat) {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
  });

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  try {
    await window.loadFile(gamePath);
  } catch (error) {
    dialog.showErrorBox('마지막 신호를 열 수 없습니다',
      `게임 파일을 확인해 주세요.\n${error.message}`);
    app.quit();
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('studio.lastsignal.escape');
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
