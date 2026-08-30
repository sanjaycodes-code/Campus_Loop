const { execSync } = require('child_process');

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      const pids = new Set();

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      });

      pids.forEach((pid) => {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Freed port ${port} (killed PID ${pid})`);
        } catch (e) {}
      });
    }
  } catch (e) {
    // Port is already free
  }
}

killPort(5000);
killPort(5173);
console.log('Ports 5000 and 5173 are ready.');
