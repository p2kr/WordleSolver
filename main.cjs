const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1250,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    title: 'Wordle Solver',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the built index.html from dist
  win.loadFile(path.join(__dirname, 'dist/index.html'));

  // Remove the default Electron menu bar
  win.setMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
