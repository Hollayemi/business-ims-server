// Get DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusBadge = document.getElementById('statusBadge');
const ipList = document.getElementById('ipList');
const logsContainer = document.getElementById('logs');

let isStarting = false;
let isStopping = false;

// Update UI based on server status
function updateStatus(status) {
    if (status === 'running') {
        statusBadge.textContent = 'Server Running';
        statusBadge.className = 'status-badge status-running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusBadge.textContent = 'Server Stopped';
        statusBadge.className = 'status-badge status-stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        ipList.innerHTML = '<li class="ip-item"><span>Server is not running</span></li>';
    }
    isStarting = false;
    isStopping = false;
}

// Add log entry
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type === 'error' ? 'log-error' : ''}`;

    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
    <span class="log-timestamp">[${timestamp}]</span>
    <span>${message}</span>
  `;

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;

    // Keep only last 100 logs
    while (logsContainer.children.length > 100) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
}

// Update IP list
function updateIPs(ips, port) {
    ipList.innerHTML = '';

    // Add localhost
    const localItem = document.createElement('li');
    localItem.className = 'ip-item';
    localItem.innerHTML = `
    <span class="ip-address">http://localhost:${port}</span>
    <button class="btn-open" onclick="openURL('http://localhost:${port}')">Open</button>
  `;
    ipList.appendChild(localItem);

    // Add network IPs
    ips.forEach(ip => {
        const item = document.createElement('li');
        item.className = 'ip-item';
        item.innerHTML = `
      <span class="ip-address">http://${ip}:${port}</span>
      <button class="btn-open" onclick="openURL('http://${ip}:${port}')">Open</button>
    `;
        ipList.appendChild(item);
    });
}

// Open URL in browser
window.openURL = function (url) {
    window.electronAPI.openBrowser(url);
    addLog(`Opening ${url} in browser`);
};

// Start server
startBtn.addEventListener('click', async () => {
    if (isStarting) return;
    isStarting = true;

    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="loading"></span> Starting...';

    try {
        const result = await window.electronAPI.startServer();

        if (result.success) {
            updateIPs(result.ips, result.port);
            addLog('Server started successfully! ✓');
        } else {
            addLog(`Failed to start server: ${result.error}`, 'error');
            updateStatus('stopped');
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        updateStatus('stopped');
    } finally {
        startBtn.innerHTML = '▶️ Start Server';
    }
});

// Stop server
stopBtn.addEventListener('click', async () => {
    if (isStopping) return;
    isStopping = true;

    stopBtn.disabled = true;
    stopBtn.innerHTML = '<span class="loading"></span> Stopping...';

    try {
        const result = await window.electronAPI.stopServer();

        if (result.success) {
            addLog('Server stopped successfully! ✓');
            updateStatus('stopped');
        } else {
            addLog(`Failed to stop server: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
    } finally {
        stopBtn.innerHTML = '⏹️ Stop Server';
    }
});

// Listen for log events
window.electronAPI.onLog((data) => {
    addLog(data.message, data.type);
});

// Listen for status events
window.electronAPI.onStatus((status) => {
    updateStatus(status);
});

// Check initial status
window.electronAPI.getStatus().then(status => {
    if (status.serverRunning) {
        updateStatus('running');
        updateIPs(status.ips, status.port);
    } else {
        updateStatus('stopped');
    }
});