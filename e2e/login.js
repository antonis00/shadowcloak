const { launch } = require('./browser');
const BASE = 'http://localhost:4200';
const USER = 'browser_user', PASS = 'correct-horse-battery';
let failed = 0;
const ok = (label, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label} ${extra}`); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const calls = [], errors = [];
  page.on('request', r => { if (r.url().includes('/api/')) calls.push({ m: r.method(), u: r.url().replace(BASE, ''), h: r.headers() }); });
  page.on('response', r => { if (r.url().includes('/api/')) { const c = [...calls].reverse().find(x => x.u === r.url().replace(BASE, '') && x.s === undefined); if (c) c.s = r.status(); } });
  page.on('pageerror', e => errors.push(e.message));
  const go = async p => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); };
  const path = () => new URL(page.url()).pathname;
  const fill = async (sel, v) => { await page.focus(sel); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.type(sel, v); };
  const last = (m, frag) => [...calls].reverse().find(c => c.m === m && c.u.includes(frag));
  const cookies = async () => Object.fromEntries((await page.cookies(BASE)).map(c => [c.name, c]));

  await go('/');
  ok('logged out: / redirects to login', path() === '/login', path());
  ok('startup call to /auth/me sets csrftoken', !!(await cookies()).csrftoken);

  await go('/register');
  ok('register form has no email field', !(await page.$('[formcontrolname=email]')));
  await fill('[formcontrolname=username]', USER);
  await fill('[formcontrolname=password1]', PASS);
  await fill('[formcontrolname=password2]', PASS);
  await page.click('button[type=submit]');
  await sleep(800);
  const reg = last('POST', 'auth/register');
  ok('register returns 201', reg && reg.s === 201, reg && reg.s);
  ok('register sends the CSRF header', reg && !!reg.h['x-csrftoken']);
  ok('no Authorization header is sent', calls.every(c => !c.h.authorization));
  await sleep(2200);
  ok('register goes on to login', path() === '/login', path());

  await fill('[formcontrolname=username]', USER);
  await fill('[formcontrolname=password]', 'wrong-password');
  await page.click('button[type=submit]');
  await sleep(800);
  const err = await page.$eval('.credentials-error', e => e.textContent.trim()).catch(() => null);
  ok('wrong password shows the server message', err === 'Incorrect username or password.', JSON.stringify(err));
  ok('wrong password stays on login', path() === '/login');

  await fill('[formcontrolname=password]', PASS);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => location.pathname === '/home', { timeout: 5000 }).catch(() => {});
  ok('login goes to home', path() === '/home', path());
  const ck = await cookies();
  ok('session cookie is HttpOnly', ck.sessionid && ck.sessionid.httpOnly);
  ok('session cookie is SameSite=Lax', ck.sessionid && ck.sessionid.sameSite === 'Lax');
  const js = await page.evaluate(() => ({ cookie: document.cookie, ls: Object.keys(localStorage), ss: Object.keys(sessionStorage) }));
  ok('scripts cannot read the session', !js.cookie.includes('sessionid'));
  ok('browser storage is empty', js.ls.length === 0 && js.ss.length === 0, JSON.stringify(js.ls));
  const nav = await page.$eval('.logout', e => e.textContent).catch(() => '');
  ok('navbar shows the username', /browser_user/i.test(nav), JSON.stringify(nav.trim()));

  await page.reload({ waitUntil: 'networkidle0' });
  ok('reload stays logged in', path() === '/home', path());

  await go('/documents');
  ok('protected page opens directly', path() === '/documents', path());
  await page.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Add New')).click());
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('.mat-mdc-menu-item')].find(b => b.textContent.includes('Group')).click());
  await sleep(500);
  await page.type('mat-dialog-container [formcontrolname=name]', 'gutenberg');
  await page.click('mat-dialog-container button[type=submit]');
  await sleep(1000);
  const grp = last('POST', 'groups/');
  ok('app can write: create group returns 201', grp && grp.s === 201, grp && grp.s);
  ok('that write carried the CSRF header', grp && !!grp.h['x-csrftoken']);

  const before = (await cookies()).sessionid.value;
  await page.deleteCookie({ name: 'sessionid', url: BASE });
  await sleep(3500); // let the success snackbar leave, it sits over the logout link
  await page.click('.logout');
  await sleep(1000);
  ok('expired session: 401 sends the user to login', path() === '/login', path());
  await go('/documents');
  ok('still logged out after session loss', path() === '/login', path());

  await page.setCookie({ name: 'sessionid', value: before, url: BASE, httpOnly: true });
  await go('/home');
  ok('restored cookie logs back in (test setup)', path() === '/home', path());
  await page.click('.logout');
  await page.waitForFunction(() => location.pathname === '/login', { timeout: 5000 }).catch(() => {});
  const lo = last('POST', 'auth/logout');
  ok('logout returns 204', lo && lo.s === 204, lo && lo.s);
  ok('logout goes to login', path() === '/login', path());
  ok('logout clears the session cookie', !(await cookies()).sessionid);
  await page.setCookie({ name: 'sessionid', value: before, url: BASE, httpOnly: true });
  await go('/home');
  ok('old session cookie is dead after logout', path() === '/login', path());

  ok('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${failed ? failed + ' FAILED' : 'ALL PASSED'}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
