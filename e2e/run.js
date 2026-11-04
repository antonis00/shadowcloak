// Starts the real backend and frontend, runs the browser tests against them, then stops both.
// It uses its own throwaway database, and refuses to run if the app's ports are already in use.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOGS = fs.mkdtempSync(path.join(os.tmpdir(), 'shadowcloak-e2e-'));
const TESTS = ['login.js', 'documents.js', 'obfuscate.js'];

const python = process.env.PYTHON
  || path.join(ROOT, 'backend', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const env = {
  ...process.env,
  DJANGO_SECRET_KEY: 'only-for-the-browser-tests',
  DJANGO_DEBUG: 'true',
  DJANGO_SETTINGS_MODULE: 'e2e_settings',
  E2E_DATABASE: path.join(LOGS, 'db.sqlite3'),
  NG_CLI_ANALYTICS: 'false',
  PYTHONPATH: __dirname,
};

const get = url => new Promise(resolve => {
  const request = http.get(url, response => { response.resume(); resolve(response.statusCode); });
  request.on('error', () => resolve(0));
  request.setTimeout(3000, () => { request.destroy(); resolve(0); });
});

const waitFor = async (url, seconds) => {
  for (let i = 0; i < seconds; i++) {
    if (await get(url) === 200) return true;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
};

const start = (name, command, args, cwd) => spawn(command, args, {
  cwd,
  env,
  detached: process.platform !== 'win32',
  stdio: ['ignore', fs.openSync(path.join(LOGS, `${name}.log`), 'w'), fs.openSync(path.join(LOGS, `${name}.err`), 'w')],
});

const stop = child => {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)]);
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* It has already stopped. */ }
  }
};

(async () => {
  if (await get('http://127.0.0.1:8000/') || await get('http://localhost:4200/')) {
    console.error('Port 8000 or 4200 is already in use, so nothing was run.');
    process.exit(3);
  }

  const backendDir = path.join(ROOT, 'backend', 'shadowcloak');
  const migrated = spawnSync(python, ['manage.py', 'migrate', '-v0'], { cwd: backendDir, env, stdio: 'inherit' });
  if (migrated.status !== 0) process.exit(4);

  const servers = [
    start('backend', python, ['manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], backendDir),
    start('frontend', process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve', '--port', '4200'], path.join(ROOT, 'frontend')),
  ];

  let failed = false;
  const up = await waitFor('http://127.0.0.1:8000/api/auth/me/', 60) && await waitFor('http://localhost:4200/', 240);
  if (up) {
    for (const test of TESTS) {
      console.log(`\n--- ${test}`);
      const result = spawnSync(process.execPath, [path.join(__dirname, test)], { stdio: 'inherit', timeout: 300000 });
      failed = failed || result.status !== 0;
    }
  } else {
    console.error(`The servers did not start. Their logs are in ${LOGS}`);
    failed = true;
  }

  servers.forEach(stop);
  console.log(failed ? `\nFAILED. Server logs are in ${LOGS}` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
