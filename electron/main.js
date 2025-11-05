const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const os = require('os');

let mainWindow;
let serverProcess = null;
let mongoProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopServer();
    stopMongo();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }

    return ips;
}

// Start MongoDB (if using local MongoDB)
function startMongo() {
    return new Promise((resolve, reject) => {
        try {
            // Check if MongoDB is already running or using cloud
            const mongoUri = process.env.MONGODB_URI;
            if (mongoUri && mongoUri.includes('mongodb+srv')) {
                // Using MongoDB Atlas, no need to start local MongoDB
                sendLog('Using MongoDB Atlas cloud database');
                resolve();
                return;
            }

            // For local MongoDB, you might want to start it here
            // This is optional and depends on your setup
            sendLog('MongoDB: Using existing MongoDB installation');
            resolve();

        } catch (error) {
            sendLog(`MongoDB Error: ${error.message}`, 'error');
            reject(error);
        }
    });
}

function stopMongo() {
    if (mongoProcess) {
        mongoProcess.kill();
        mongoProcess = null;
        sendLog('MongoDB stopped');
    }
}

// Start Node.js server
function startServer() {
    return new Promise((resolve, reject) => {
        try {
            const serverPath = path.join(__dirname, '../index.js');

            serverProcess = fork(serverPath, [], {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
                env: { ...process.env }
            });

            serverProcess.stdout.on('data', (data) => {
                sendLog(data.toString());
            });

            serverProcess.stderr.on('data', (data) => {
                sendLog(data.toString(), 'error');
            });

            serverProcess.on('message', (message) => {
                if (message === 'server-ready') {
                    resolve();
                }
            });

            serverProcess.on('error', (error) => {
                sendLog(`Server Error: ${error.message}`, 'error');
                reject(error);
            });

            serverProcess.on('exit', (code) => {
                sendLog(`Server process exited with code ${code}`, code === 0 ? 'info' : 'error');
                serverProcess = null;
                sendStatus('stopped');
            });

            setTimeout(() => resolve(), 3000); // Fallback timeout

        } catch (error) {
            sendLog(`Failed to start server: ${error.message}`, 'error');
            reject(error);
        }
    });
}

function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
        sendLog('Server stopped');
    }
}

function sendLog(message, type = 'info') {
    if (mainWindow) {
        mainWindow.webContents.send('log', { message, type, timestamp: new Date() });
    }
}

function sendStatus(status) {
    if (mainWindow) {
        mainWindow.webContents.send('status', status);
    }
}

// IPC Handlers
ipcMain.handle('start-server', async () => {
    try {
        sendLog('Starting MongoDB...');
        await startMongo();

        sendLog('Starting server...');
        await startServer();

        const ips = getLocalIPs();
        const port = process.env.PORT || 5000;

        sendLog(`Server started successfully!`);
        sendLog(`Local: http://localhost:${port}`);
        ips.forEach(ip => {
            sendLog(`Network: http://${ip}:${port}`);
        });

        sendStatus('running');
        return { success: true, ips, port };

    } catch (error) {
        sendLog(`Failed to start: ${error.message}`, 'error');
        sendStatus('stopped');
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-server', async () => {
    try {
        sendLog('Stopping server...');
        stopServer();
        stopMongo();
        sendStatus('stopped');
        return { success: true };
    } catch (error) {
        sendLog(`Failed to stop: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-status', () => {
    return {
        serverRunning: serverProcess !== null,
        ips: getLocalIPs(),
        port: process.env.PORT || 5000
    };
});

ipcMain.handle('open-browser', (event, url) => {
    require('electron').shell.openExternal(url);
});