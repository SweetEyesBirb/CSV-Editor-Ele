const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const {mainMenu} = require("./renderer/scripts/menu.js")
const { createAppMenu } = require('./renderer/scripts/menu'); // path to your menu.js

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'scripts', 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/icons/csv_app_light.ico') // relative to main.js
  });

  const filePath = path.join(__dirname, 'renderer', 'index.html');
  console.log('Loading file:', filePath);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Pass mainWindow to the menu
  // Sets the custom menu
  createAppMenu(mainWindow);
}


app.whenReady().then(() => {
    console.log("App ready");
    createWindow();
});


app.on('window-all-closed', () => {
    console.log('App closed.');
    if (process.platform !== 'darwin') app.quit();
});
