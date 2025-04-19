const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');


function createAppMenu(mainWindow) {
    // Create a custom menu
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
                                    console.log('Sending load-csv with:', fileObj.filePaths);
                                    mainWindow.webContents.send('load-csv', fileObj.filePaths)
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
                        mainWindow.webContents.send('save-file');
                    }
                },
                {
                    label: 'Save As',
                    click: async () => {
                        const result = await dialog.showSaveDialog({
                            title: 'Save CSV',
                            defaultPath: 'data.csv',
                            filters: [{ name: 'CSV Files', extensions: ['csv'] }],
                        });
                        if (!result.canceled && result.filePath) {
                            // Communicate with renderer process to save
                            mainWindow.webContents.send('save-as', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Allow Non-English Characters',
                    type: 'checkbox',
                    checked: false,
                    click: (menuItem) => {
                        const allowNonEnglish = menuItem.checked;
                        // Optional: show feedback
                        mainWindow.webContents.send('toggle-non-english', allowNonEnglish);
                    }
                },
                { type: 'separator' },
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
                {
                    label: 'Themes',
                    submenu: [
                        {
                            label: 'Dark',
                            click() {
                                mainWindow.webContents.send('set-theme', 'dark');
                            }
                        },
                        {
                            label: 'Light',
                            click() {
                                mainWindow.webContents.send('set-theme', 'light');
                            }
                        },
                        {
                            label: 'Navy',
                            click() {
                                mainWindow.webContents.send('set-theme', 'navy');
                            }
                        },
                        {
                            label: 'Forest',
                            click() {
                                mainWindow.webContents.send('set-theme', 'forest');
                            }
                        },
                        {
                            label: 'Reinassance',
                            click() {
                                mainWindow.webContents.send('set-theme', 'reinassance');
                            }
                        },
                        {
                            label: 'Vanilla',
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

module.exports = { createAppMenu };
