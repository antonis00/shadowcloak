// Drives the real pages for this round of fixes: new users, form errors, filters, returnUrl, limits.
const { launch } = require('./browser');
const BASE = 'http://localhost:4200';
let failed = 0;
const ok = (label, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label} ${extra}`); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const external = [];
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  const path = () => new URL(page.url()).pathname;
  const addNew = async item => {
    await page.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Add New')).click());
    await sleep(300);
    await page.evaluate(i => [...document.querySelectorAll('.mat-mdc-menu-item')].find(b => b.textContent.includes(i)).click(), item);
    await sleep(500);
  };
  const dialogSubmit = async () => { await page.evaluate(() => document.querySelector('mat-dialog-container button[type=submit]').click()); await sleep(800); };
  const dialogButton = async label => { await page.evaluate(l => [...document.querySelectorAll('mat-dialog-container button')].find(b => b.textContent.includes(l)).click(), label); await sleep(500); };
  const pick = async (index, option) => {
    await page.evaluate(i => document.querySelectorAll('.mat-mdc-select-trigger')[i].click(), index);
    await sleep(300);
    await page.evaluate(o => [...document.querySelectorAll('mat-option')].find(x => x.textContent.includes(o)).click(), option);
    await sleep(600);
  };
  const go = async p => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(300); };
  const type = async (name, value) => { await page.focus(`[formcontrolname=${name}]`); await page.$eval(`[formcontrolname=${name}]`, e => e.select()); await page.keyboard.press('Backspace'); await page.type(`[formcontrolname=${name}]`, value); };
  const text = () => page.evaluate(() => document.body.innerText);
  const api = (method, p, payload) => page.evaluate(async (method, p, payload) => {
    const csrf = document.cookie.split('; ').find(c => c.startsWith('csrftoken=')).split('=')[1];
    const r = await fetch('/api/' + p, { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf }, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const t = await r.text();
    let json = null; try { json = JSON.parse(t); } catch (e) { }
    return { status: r.status, json };
  }, method, p, payload);

  // Registration errors reach the user.
  await go('/register');
  await type('username', 'fixes_user');
  await type('password1', 'short');
  await type('password2', 'short');
  await page.click('button[type=submit]');
  await sleep(200);
  ok('a short password is caught in the form', (await text()).includes('at least 8 characters'));
  await type('password1', 'password');
  await type('password2', 'password');
  await page.click('button[type=submit]');
  await sleep(800);
  ok('a common password shows the server message', /too common/i.test(await text()));
  ok('the button works again after an error', !(await page.$eval('button[type=submit]', b => b.disabled)));
  await type('password1', 'correct-horse-battery');
  await type('password2', 'correct-horse-battery');
  await page.click('button[type=submit]');
  await page.waitForFunction(() => location.pathname === '/login');
  ok('a good password registers', path() === '/login');

  // returnUrl is honoured, and can't leave the app.
  await go('/find-author');
  ok('a protected page sends you to login', path() === '/login' && page.url().includes('returnUrl'), page.url());
  await type('username', 'fixes_user');
  await type('password', 'correct-horse-battery');
  await page.click('button[type=submit]');
  await page.waitForFunction(() => location.pathname !== '/login', { timeout: 8000 });
  await sleep(300);
  ok('login returns to the page you wanted', path() === '/find-author', path());

  // A new user with no categories: every page works and says what to do.
  ok('find author opens for a new user', (await text()).includes("don't have any categories"));
  await page.evaluate(() => { const ta = document.querySelector('textarea'); ta.value = 'some text here'; ta.dispatchEvent(new Event('input')); });
  await sleep(100);
  ok('detect stays disabled without a category', await page.$eval('main button', b => b.disabled));
  await go('/obfuscate');
  ok('obfuscate opens for a new user', (await text()).includes("don't have any categories"));
  ok('analyse is disabled without a category', await page.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Analyse Style')).disabled));
  await go('/documents');
  ok('documents opens for a new user', path() === '/documents');
  ok('no crash on any page for a new user', errors.length === 0, errors.slice(0, 2).join(' | '));

  // Panel errors reach the user: a duplicate name.
  const group = (await api('POST', 'groups/', { name: 'books' })).json.id;
  const posts = (await api('POST', 'groups/', { name: 'posts' })).json.id;
  const sarah = (await api('POST', 'authors/', { name: 'sarah' })).json.id;
  const john = (await api('POST', 'authors/', { name: 'john' })).json.id;
  const doc = (author, grp, title, body) => api('POST', 'documents/', { author, group: grp, title, body, publication_date: '2002-02-20', active: true });
  const S = 'the cat sat on the mat and the dog ran to the house of the old man '.repeat(20);
  const J = 'a bird flew over a hill while a fox hid in a den by a river near a farm '.repeat(20);
  await doc(sarah, group, 'a book', S);
  await doc(sarah, posts, 'a post', S);
  await doc(john, posts, 'his post', J);

  await go('/documents');
  await addNew('Author');
  await type('name', 'SARAH');
  await dialogSubmit();
  ok('a duplicate author name shows a message', (await text()).includes('You already have one with this name.'));
  await dialogButton('Cancel');
  await sleep(3000); // Let the dialog and any snackbar leave.

  // Filters, through the same call the page makes.
  const titles = r => Object.fromEntries(r.json.map(a => [a.name, a.documents.map(d => d.title)]));
  ok('group filter applies to nested documents', JSON.stringify(titles(await api('GET', `docsbyauthor/?group=${group}`))) === JSON.stringify({ sarah: ['a book'] }));
  ok('author filter alone works', (await api('GET', `docsbyauthor/?author=${john}`)).status === 200);
  ok('both filters, as the page sends them', JSON.stringify(titles(await api('GET', `docsbyauthor/?group=${posts}&&author=${john}`))) === JSON.stringify({ john: ['his post'] }));

  // The page shows the filtered documents.
  await go('/documents');
  const before = await text();
  ok('the page lists only the first category at first', before.includes('sarah') && !before.includes('john'));
  await pick(1, 'posts');
  ok('choosing another category shows its authors', (await text()).includes('john'));

  // Analysis errors reach the user.
  await go('/find-author');
  await page.evaluate(() => { const ta = document.querySelector('textarea'); ta.value = '12345 678'; ta.dispatchEvent(new Event('input')); });
  await sleep(100);
  await page.click('main button');
  await sleep(800);
  ok('a category with one author explains itself', (await text()).includes('at least two authors'));
  await go('/find-author');
  await pick(0, 'posts');
  await page.evaluate(() => { const ta = document.querySelector('textarea'); ta.value = '12345 678'; ta.dispatchEvent(new Event('input')); });
  await sleep(100);
  await page.click('main button');
  await sleep(800);
  ok('text with no words explains itself', (await text()).includes('The text has no words to analyse.'));

  // Oversized requests: refused, and the app doesn't fall over.
  const long = await api('POST', 'documents/', { author: sarah, group, title: 'long', body: 'a'.repeat(2000001), publication_date: '2002-02-20', active: true });
  ok('a document over the limit gets a message', long.status === 400 && long.json.body, JSON.stringify(long.json).slice(0, 80));
  const docs = await api('GET', 'documents/');
  ok('it was not stored', docs.json.every(d => !['long'].includes(d.title)));

  // The Documents page, driven through its own controls.
  await go('/documents');
  await pick(1, 'posts');
  await pick(0, 'john');
  await page.keyboard.press('Escape');
  await sleep(600);
  let shown = await text();
  ok('the author filter narrows the page', shown.includes('john') && !shown.includes('Author: sarah'));
  await pick(0, 'john');
  await page.keyboard.press('Escape');
  await sleep(600);
  ok('clearing the author filter brings them back', (await text()).includes('Author: sarah'));

  await addNew('Document');
  await type('title', 'added in the dialog');
  await page.type('[formcontrolname=body]', 'the words of a new document');
  await page.evaluate(() => document.querySelector('mat-dialog-container [formcontrolname=author] .mat-mdc-select-trigger').click());
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('mat-option')].find(o => o.textContent.includes('john')).click());
  await sleep(300);
  await dialogSubmit();
  ok('adding a document works', (await api('GET', 'documents/')).json.some(d => d.title === 'added in the dialog' && d.author === john && d.group === posts && d.publication_date === null));

  const headers = () => page.$$eval('.author-panel > mat-expansion-panel-header', h => h.map(x => x.textContent));
  await page.evaluate(() => [...document.querySelectorAll('.author-panel > mat-expansion-panel-header')].find(h => h.textContent.includes('john')).click());
  await sleep(500);
  ok('expanding an author lists their documents', (await text()).includes('added in the dialog'));
  await page.evaluate(() => document.querySelector('[aria-label="Edit document added in the dialog"]').click());
  await sleep(500);
  ok('editing fills in the document', await page.$eval('[formcontrolname=body]', e => e.value === 'the words of a new document'));
  await type('title', 'renamed');
  await dialogSubmit();
  ok('editing a document works', (await api('GET', 'documents/')).json.some(d => d.title === 'renamed'));
  await sleep(3000);

  await page.evaluate(() => document.querySelector('[aria-label="Edit author john"]').click());
  await sleep(500);
  await type('description', 'a described author');
  await dialogSubmit();
  ok('editing an author works', (await api('GET', `authors/${john}/`)).json.description === 'a described author');

  await page.evaluate(() => document.querySelector('[aria-label="Delete author john"]').click());
  await sleep(500);
  ok('deleting an author warns about their documents', (await text()).includes('All documents of that author will also be deleted!'));
  await dialogButton('Cancel');
  ok('cancelling a delete keeps the author', (await api('GET', `authors/${john}/`)).status === 200);
  await page.evaluate(() => document.querySelector('[aria-label="Delete author john"]').click());
  await sleep(500);
  await dialogButton('Delete');
  await sleep(500);
  ok('confirming a delete removes the author', (await api('GET', `authors/${john}/`)).status === 404);
  ok('the page updates after a delete', !(await text()).includes('john'));
  await sleep(3000);

  await page.evaluate(() => document.querySelector('[aria-label="Delete current group"]').click());
  await sleep(500);
  await dialogButton('Delete');
  await sleep(800);
  ok('deleting a group moves to another one', (await api('GET', `groups/${posts}/`)).status === 404 && (await text()).includes('books'));

  // Login can't be used to leave the app, and nothing is fetched from anywhere else.
  await page.evaluate(() => document.querySelector('.logout').click());
  await page.waitForFunction(() => location.pathname === '/login');
  for (const target of ['https://example.com/', '//example.com/']) {
    await go('/login?returnUrl=' + encodeURIComponent(target));
    await type('username', 'fixes_user');
    await type('password', 'correct-horse-battery');
    await page.click('button[type=submit]');
    await sleep(1500);
    ok(`returnUrl ${target} stays in the app`, page.url().startsWith(BASE), page.url());
    await page.evaluate(() => document.querySelector('.logout').click());
    await page.waitForFunction(() => location.pathname === '/login');
  }
  ok('every page loads only from this site', external.length === 0, external.slice(0, 2).join(' '));

  ok('no uncaught page errors at all', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(`\n${failed ? failed + ' FAILED' : 'ALL PASSED'}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
