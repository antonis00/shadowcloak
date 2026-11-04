const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/** Opens the Chrome already on this machine. Set CHROME_PATH if it's somewhere unusual. */
exports.launch = () => puppeteer.launch({
  headless: 'new',
  executablePath: CHROME_PATHS.find(candidate => candidate && fs.existsSync(candidate)),
  args: ['--no-sandbox'],
});
