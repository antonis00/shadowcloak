// Checks what only the built image does: one address for everything, with the editor bundled in.
const { launch } = require('./browser');
const BASE = process.env.E2E_BASE_URL || 'http://localhost:8000';
let failed = 0;
const ok = (label, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label} ${extra}`); if (!cond) failed++; };

(async () => {
  const fetchPath = path => fetch(BASE + path, { redirect: 'manual' });

  const home = await fetchPath('/');
  ok('the app is served at the root', home.status === 200 && (await home.text()).includes('<app-root>'));
  const deep = await fetchPath('/documents');
  ok('a page address opens the app directly', deep.status === 200 && (await deep.text()).includes('<app-root>'));
  ok('pages carry the security headers', deep.headers.get('x-content-type-options') === 'nosniff' && deep.headers.get('x-frame-options') === 'DENY');

  const api = await fetchPath('/api/auth/me/');
  ok('the API is served from the same address', api.status === 200 && (await api.json()).username === null);
  const missing = await fetchPath('/api/no-such-route/');
  ok('an unknown API address is a 404, not the app', missing.status === 404 && !(await missing.text()).includes('<app-root>'));

  const logo = await fetchPath('/assets/shadow-cloak.png');
  ok('images are served', logo.status === 200 && logo.headers.get('content-type') === 'image/png');
  const adminStyle = await fetchPath('/static/admin/css/base.css');
  ok('the admin styling is served', adminStyle.status === 200);
  const admin = await fetchPath('/admin/login/');
  ok('the admin still opens', admin.status === 200 && !(await admin.text()).includes('<app-root>'));

  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.setDefaultTimeout(30000);
  const errors = [];
  const failedRequests = [];
  const external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });

  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  const csrf = () => page.evaluate(() => document.cookie.split('; ').find(c => c.startsWith('csrftoken=')).split('=')[1]);
  const post = async (path, body) => page.evaluate(async (path, body, token) => {
    const r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token }, body: JSON.stringify(body) });
    return r.status;
  }, path, body, await csrf());
  const password = 'correct-horse-battery';
  ok('registering works', (await post('auth/register/', { username: 'image_user', password1: password, password2: password })) === 201);
  ok('logging in works', (await post('auth/login/', { username: 'image_user', password })) === 200);

  await page.goto(BASE + '/obfuscate', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ck-editor__editable');
  ok('the editor loads', !!(await page.$('.ck-toolbar')));
  await page.reload({ waitUntil: 'networkidle0' });
  ok('reloading stays on the page', new URL(page.url()).pathname === '/obfuscate');

  ok('nothing is fetched from another site', external.length === 0, external.slice(0, 2).join(' '));
  ok('no request failed', failedRequests.length === 0, failedRequests.slice(0, 3).join(' '));
  ok('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(`\n${failed ? failed + ' FAILED' : 'ALL PASSED'}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
