// Drives the real Obfuscate page and real CKEditor against the real backend, on real books.
const { launch } = require('./browser');
const data = require('./books.json');
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
  const sent = [];
  page.on('request', r => { if (r.method() === 'POST' && /\/api\/(analyse|findauthor)\//.test(r.url())) sent.push({ url: r.url(), body: JSON.parse(r.postData()).body }); });

  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  const api = (path, payload) => page.evaluate(async (path, payload) => {
    const csrf = document.cookie.split('; ').find(c => c.startsWith('csrftoken=')).split('=')[1];
    const r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf }, body: JSON.stringify(payload) });
    const text = await r.text();
    return { status: r.status, json: text ? JSON.parse(text) : null };
  }, path, payload);

  const creds = { username: 'obfuscate_user', password: 'correct-horse-battery' };
  await api('auth/register/', { ...creds, password1: creds.password, password2: creds.password });
  await api('auth/login/', creds);
  const group = (await api('groups/', { name: 'books' })).json.id;
  for (const [name, body] of Object.entries(data.train)) {
    const author = (await api('authors/', { name })).json.id;
    const r = await api('documents/', { author, group, title: name, body, publication_date: '2002-02-20', active: true });
    if (r.status !== 201) throw new Error('seed failed ' + r.status);
  }

  const editor = () => page.waitForSelector('.ck-editor__editable');
  const setData = html => page.evaluate(h => document.querySelector('.ck-editor__editable').ckeditorInstance.setData(h), html);
  const getData = () => page.evaluate(() => document.querySelector('.ck-editor__editable').ckeditorInstance.getData());
  const clickText = async text => {
    const done = page.waitForResponse(r => /\/api\/(analyse|findauthor)\//.test(r.url()));
    await page.evaluate(t => [...document.querySelectorAll('main button')].find(b => b.textContent.includes(t)).click(), text);
    const response = await done;
    await sleep(300);
    return response.status();
  };
  const verdict = () => page.evaluate(() => {
    const title = document.querySelector('mat-dialog-container h2');
    return title ? title.textContent.trim() : null;
  });
  const open = async () => { await page.goto(BASE + '/obfuscate', { waitUntil: 'networkidle0' }); await editor(); await sleep(300); };

  const hasMarkup = s => /<|span|style=|3f51b5|color:/.test(s);
  let unchanged = 0, clean = true, highlighted = 0;
  for (const excerpt of data.excerpts) {
    sent.length = 0;
    await open();
    await setData('<p>' + excerpt.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>');
    await sleep(200);
    await clickText('Analyse Style');
    const html = await getData();
    if (/style="color:/.test(html)) highlighted++;
    await clickText('Detect author');
    const title = await verdict();
    if (title && title.includes('Unsuccessful')) unchanged++;
    if (sent.length !== 2 || sent.some(s => hasMarkup(s.body))) clean = false;
    if (sent.length === 2 && sent[0].body !== sent[1].body) clean = false;
  }
  const n = data.excerpts.length;
  ok(`highlights still show in the editor (${highlighted}/${n})`, highlighted === n);
  ok('both requests carry identical plain text', clean);
  ok(`zero edits gives "unchanged" (${unchanged}/${n})`, unchanged === n);

  // Realistic edit: the editor normalises the markup, which the old cleanup missed.
  sent.length = 0;
  await open();
  await setData('<p>' + data.excerpts[0] + '</p>');
  await sleep(200);
  await clickText('Analyse Style');
  const edited = (await getData()).replace('</p>', ' zebra</p>');
  await setData(edited);
  await sleep(300);
  const after = await getData();
  await clickText('Detect author');
  ok('editor output after an edit does contain markup (test is meaningful)', /<span|<strong|<b>/.test(after));
  const last = sent[sent.length - 1].body;
  ok('after an edit the request has the edit and no markup', last.includes('zebra') && !hasMarkup(last));

  // Removing a chip re-highlights; the markup must not pile up.
  await page.evaluate(() => { const b = document.querySelector('mat-dialog-container button'); if (b) b.click(); });
  await sleep(400);
  const beforeChips = await page.$$eval('.tokens .chip', c => c.length);
  await page.evaluate(() => document.querySelector('.tokens .chip button').click());
  await sleep(400);
  const afterChips = await page.$$eval('.tokens .chip', c => c.length);
  const chipHtml = await getData();
  ok('removing a token chip works', afterChips === beforeChips - 1, `${beforeChips}->${afterChips}`);
  ok('re-highlighting leaves no nested markup', !/<span[^>]*><span|<strong><strong|<b><b>/.test(chipHtml));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Reset Tokens')).click());
  await sleep(300);
  ok('reset tokens restores the chips', (await page.$$eval('.tokens .chip', c => c.length)) === beforeChips);

  // Text that looks like HTML stays literal, and multiple paragraphs don't glue words together.
  sent.length = 0;
  await open();
  await setData('<p>the end of one &lt;script&gt;alert(1)&lt;/script&gt; and more</p><p>start of the two</p>');
  await sleep(200);
  await clickText('Analyse Style');
  ok('user-typed angle brackets reach the server as text', sent[0].body.includes('<script>alert(1)</script>'));
  ok('paragraphs stay separate', sent[0].body.includes('more\nstart'));
  const lit = await getData();
  ok('angle brackets stay literal text in the editor', lit.includes('&lt;script&gt;') && !/<script/.test(lit));
  ok('editor keeps two paragraphs', (lit.match(/<p>/g) || []).length === 2);

  // Formatting survives the whole Obfuscate flow.
  sent.length = 0;
  await open();
  const FORMATTED = '<h2>A heading of it</h2><p>The <strong>quick</strong> fox <i>runs</i> over the dog, and <a href="https://example.com">the link</a> and <strong>the</strong> bold, <span style="color:rgb(10,20,30);">zebra</span>.</p><ul><li>the first of it</li><li>second</li></ul>';
  await setData(FORMATTED);
  await sleep(200);
  const startHtml = await getData();
  const kept = h => ['<h2>', '<strong>quick</strong>', '<i>runs</i>', 'href="https://example.com"', '<ul>', '<li>', 'zebra'].every(t => h.includes(t));
  const THE = /<span style="color:[^"]*">the<\/span>/;
  const plain = h => h.replace(/<[^>]+>/g, '');
  await clickText('Analyse Style');
  let now = await getData();
  ok('Analyse keeps heading, bold, italic, link, list', kept(now));
  ok('Analyse highlights in place', THE.test(now));
  ok('highlighting adds no bold of its own', !/<b>/.test(now) && (now.match(/<strong>/g) || []).length === 2, `strong=${(now.match(/<strong>/g) || []).length}`);
  ok("the user's own colour on an unmatched word stays", /color:rgb\(10,20,30\);">zebra/.test(now));
  ok("the user's own bold on a matched word stays", /<strong>.*the.*<\/strong>/.test(now));
  ok('Analyse leaves the words alone', plain(now) === plain(startHtml));
  ok('the analysis received plain text', !/<|color|strong/.test(sent[0].body) && sent[0].body.includes('A heading of it\nThe quick fox'));
  const count = await page.$$eval('.tokens .chip', c => c.length);
  await page.evaluate(() => [...document.querySelectorAll('.tokens .chip')].find(c => c.textContent.trim().startsWith('the')).querySelector('button').click());
  await sleep(400);
  now = await getData();
  ok('removing the "the" chip removes its highlight', !THE.test(now));
  ok('formatting survives removing a chip', kept(now));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Reset Tokens')).click());
  await sleep(400);
  now = await getData();
  ok('reset brings the highlight back', THE.test(now) && (await page.$$eval('.tokens .chip', c => c.length)) === count);
  ok('formatting survives reset', kept(now));
  await setData(now.replace('runs', 'walks'));
  await sleep(300);
  await clickText('Detect author');
  const editedHtml = await getData();
  ok('an edit keeps formatting and reaches the analysis', kept(editedHtml.replace('walks', 'runs')) && sent[sent.length - 1].body.includes('walks') && !/<|color/.test(sent[sent.length - 1].body));

  // Probe, not a requirement: a colour the user put on a word that also gets highlighted.
  await open();
  await setData('<p><span style="color:rgb(10,20,30);">the</span> dog of the man and it was the end</p>');
  await sleep(200);
  await clickText('Analyse Style');
  console.log('INFO  user colour on a highlighted word:', (await getData()).slice(0, 70));

  // Reset Process asks first, then starts again from a clean page.
  await open();
  await setData('<p>the dog of the man and it was the end</p>');
  await sleep(200);
  await clickText('Analyse Style');
  await page.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Reset Process')).click());
  await sleep(400);
  ok('reset process asks first', (await verdict()) === 'Reset Process');
  await page.evaluate(() => [...document.querySelectorAll('mat-dialog-container button')].find(b => b.textContent.includes('Proceed')).click());
  await sleep(600);
  ok('reset process clears the analysis', !(await page.$('.tokens')) && (await getData()) === '<p>Put the text you want to anonymize here.</p>', (await getData()).slice(0, 60));
  ok('reset process brings the category back', !!(await page.$('app-category-select')));

  // The result says how sure it is, and matching ignores case and punctuation.
  await open();
  await setData('<p>' + data.excerpts[0] + '</p>');
  await sleep(200);
  await clickText('Analyse Style');
  const pageText = await page.evaluate(() => document.body.innerText);
  ok('the ranking shows', /Closest authors, lower is closer: .+ \(\d\.\d\d\), /.test(pageText));
  ok('a short text gets a warning', (await page.$$eval('.warning', w => w.map(x => x.textContent).join(' '))).includes('rough guess'));
  const chips = await page.$$eval('.tokens .chip', c => c.map(x => x.textContent.trim().split(/\s+/)[0]));
  ok('tokens are listed', chips.length > 0 && chips.length <= 30, chips.slice(0, 5).join(' '));
  const coloured = await page.evaluate(() => [...document.querySelectorAll('.ck-editor__editable span[style*="color"]')].map(s => s.textContent));
  ok('every coloured word is a listed token, whatever its case', coloured.length > 0 && coloured.every(w => chips.some(c => c.replace(/[^a-z]/gi, '') === w.toLowerCase())), coloured.slice(0, 5).join(' '));
  await page.evaluate(() => document.querySelector('.ck-editor__editable').ckeditorInstance.setData('<p>The dog, The end. the</p>'));
  await sleep(200);

  // A real attribution on Find Author shows the same things.
  await page.goto(BASE + '/find-author', { waitUntil: 'networkidle0' });
  await sleep(300);
  await page.evaluate(t => { const ta = document.querySelector('textarea'); ta.value = t; ta.dispatchEvent(new Event('input')); }, data.excerpts[0]);
  await sleep(200);
  await page.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Detect Author')).click());
  await sleep(1500);
  const dialog = await page.$eval('mat-dialog-container', d => d.innerText);
  ok('find author shows the author, ranking and warning', dialog.includes('Most Probable Author') && dialog.includes('Closest authors') && dialog.includes('rough guess'), dialog.replace(/\s+/g, ' ').slice(0, 120));

  // A blank editor can't be submitted.
  await open();
  await setData('<p>&nbsp;</p>');
  await sleep(300);
  ok('blank editor disables the button', await page.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Analyse Style')).disabled));

  ok('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(`\n${failed ? failed + ' FAILED' : 'ALL PASSED'}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
