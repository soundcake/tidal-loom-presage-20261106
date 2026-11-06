const { app, BrowserWindow, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
app.whenReady().then(() => {
  const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');
  const preload = require.resolve('@smartspectra/node-sdk/preload');
  if (!fs.existsSync(path.join(__dirname, 'web/live.js'))) throw new Error('Run build:live first.');
  const win = new BrowserWindow({ width: 1240, height: 950, webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false } });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => callback(Boolean(contents === win.webContents && contents.getURL().startsWith('file://') && permission === 'media' && details.mediaTypes?.length === 1 && details.mediaTypes[0] === 'video')));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'https://presagetech.com/legal/privacy-policy') void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', event => event.preventDefault());
  bindSmartSpectraIpc(win);
  win.loadFile(path.join(__dirname, 'web/index.html'), { query: { desktop: '1' } });
});
app.on('window-all-closed', () => app.quit());
