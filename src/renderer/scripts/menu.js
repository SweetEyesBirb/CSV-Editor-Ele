const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');


function createAppMenu(mainWindow) {
// 👇 Create a custom menu
const isMac = process.platform === 'darwin';

const template = [
    // Mac-style app menu
    ...(isMac ? [{
        label: app.name,
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    }] : []),

    {
        label: 'File',
        submenu: [
            {
                label: 'Open CSV',
                // this is the main bit hijack the click event 
                click() {
                    // construct the select file dialog 
                    dialog.showOpenDialog({
                        properties: ['openFile']
                    })
                        .then(function (fileObj) {
                            // the fileObj has two props 
                            if (!fileObj.canceled) {
                                console.log('Sending FILE_OPEN with:', fileObj.filePaths);
                                mainWindow.webContents.send('FILE_OPEN', fileObj.filePaths)
                            }
                        })
                        // should always handle the error yourself, later Electron release might crash if you don't 
                        .catch(function (err) {
                            console.error(err)
                        })
                }
            },
            {
                label: 'Save',
                click: () => {
                    console.log('Save clicked!');
                    // Add logic to save CSV
                }
            },
            { type: 'separator' },
            isMac ? { role: 'close' } : { role: 'quit' }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'toggledevtools' },
            { label: 'Themes',
                submenu: [
                    { label: 'Dark',
                        click() {
                            mainWindow.webContents.send('set-theme', 'dark');
                        }
                    },
                    { label: 'Light',
                        click() {
                            mainWindow.webContents.send('set-theme', 'light');
                        }
                    },
                    { label: 'Navy',
                        click() {
                            mainWindow.webContents.send('set-theme', 'navy');
                        }
                    },
                    { label: 'Forest',
                        click() {
                            mainWindow.webContents.send('set-theme', 'forest');
                        }
                    },
                    { label: 'Reinassance',
                        click() {
                            mainWindow.webContents.send('set-theme', 'reinassance');
                        }
                    },
                    { label: 'Vanilla',
                        click() {
                            mainWindow.webContents.send('set-theme', 'vanilla');
                        }
                    }
                ]
             },
            { type: 'separator' },
            { role: 'resetzoom' },
            { role: 'zoomin' },
            { role: 'zoomout' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    }
];

// module.exports.mainMenu = Menu.buildFromTemplate(template);
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
}

module.exports = {createAppMenu};
