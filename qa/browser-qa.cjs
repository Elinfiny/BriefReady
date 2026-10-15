'use strict';

// PREPARED CANDIDATE: execute only in a separately admitted standard GitHub
// Actions run. Never execute this server/browser in the Sites managed host.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

if (process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.BRIEFREADY_QA_ADMISSION !== 'ADMITTED_SINGLE_RUN_USD0' ||
    process.env.GITHUB_RUN_ATTEMPT !== '1' ||
    process.env.SITES_MANAGED_LINUX_CONTAINER === '1') {
  throw new Error('QA is not admitted here. No server/browser was started.');
}

const { chromium } = require('playwright');
const PW_VERSION = '1.64.1';
const CHROMIUM_VERSION = '156.0.8078.4';
const CHROMIUM_REVISION = '1248';
const KEY = 'briefready.v1';
const APP_SOURCE_SHA256 = {
  'app.js': 'b6dd1c833fba7a63cc2ff7ccdcf2e72328ab8d276bcd0a70f1ad91d800f730b9',
  'core.js': '652f1e485698c65df3079ad875dfa5715d9a0372b23f52d3821b20c1fd2e16d7',
  'index.html': '3e5f8390b9f937e825e64fec060d91d73ec0cfbdc92a676811b2fd269f2b79c8',
  'styles.css': '66734bdc97abb0383cc3af7921324daa2e79592a9096168c8f15b941d5229ef7'
};
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.env.BRIEFREADY_QA_OUT || 'qa-evidence');
fs.mkdirSync(OUT, { recursive: true });
const reportPath = path.join(OUT, 'browser-qa.json');
const report = {
  schema: 'briefready-browser-qa-v1', status: 'RUNNING',
  startedAt: new Date().toISOString(), sourceCommit: process.env.GITHUB_SHA,
  headCommit: process.env.BRIEFREADY_QA_SOURCE_HEAD || null,
  runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  node: process.version, expected: { playwright: PW_VERSION, chromium: CHROMIUM_VERSION, revision: CHROMIUM_REVISION },
  cases: [], downloads: [], firstFailure: null,
  evidenceLimits: { screenshots: 0, videos: 0, traces: 0, maxBytes: 524288 }
};
let browser, server;
function persist() { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); }
function failOnce(error, at) {
  if (!report.firstFailure) report.firstFailure = { at, name: error.name, message: error.message, stack: error.stack };
  report.status = 'FAIL'; persist();
}
async function step(viewport, name, fn) {
  const entry = { viewport, name, status: 'RUNNING' }; report.cases.push(entry); persist();
  try { await fn(); entry.status = 'PASS'; }
  catch (error) { entry.status = 'FAIL'; failOnce(error, `${viewport}:${name}`); throw error; }
  finally { persist(); }
}
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
async function binaryHash(file) {
  const h = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
async function saved(page) { return page.evaluate(key => localStorage.getItem(key), KEY); }
async function download(page, buttonId, filename) {
  const event = page.waitForEvent('download');
  await page.locator(buttonId).click();
  const d = await event; assert.equal(await d.failure(), null);
  const file = path.join(OUT, filename); await d.saveAs(file);
  const bytes = fs.readFileSync(file);
  report.downloads.push({ filename, bytes: bytes.length, sha256: sha256(bytes), suggestedFilename: d.suggestedFilename() });
  persist(); return { file, bytes };
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'page horizontal overflow');
}
async function upload(page, name, data) {
  await page.locator('#import-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(data) });
}

async function exercise(origin, width, height) {
  const name = `${width}x${height}`;
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, serviceWorkers: 'block' });
  const consoleErrors = [], pageErrors = [], externalRequests = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || url.startsWith('blob:' + origin + '/')) return route.continue();
    externalRequests.push(url); return route.abort('blockedbyclient');
  });
  const page = await context.newPage(); page.setDefaultTimeout(5000); page.setDefaultNavigationTimeout(10000);
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  let exported, reference;
  try {
    await step(name, 'keyboard-skip-focus-and-empty-state', async () => {
      await page.goto(origin); await page.locator('.empty').waitFor();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('skip')), true);
      await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'workspace');
      assert.equal(await page.locator('#readiness').textContent(), 'Not started'); await noOverflow(page);
    });
    await step(name, 'synthetic-brief-to-source-linked-draft', async () => {
      await page.locator('#example').click();
      assert.match(await page.locator('#brief').inputValue(), /Deliverable:/);
      await page.locator('#brief-form button[type=submit]').click();
      assert.equal(await page.locator('#items article').count(), 2);
      assert.equal(await page.locator('#items .source').count(), 2);
      assert.match(await page.locator('#items .source').first().textContent(), /one-page brand guide/);
    });
    await step(name, 'edit-and-reorder-preserve-source', async () => {
      const first = page.locator('#items article').first();
      const source = await first.locator('.source').textContent();
      await first.locator('input[data-field=title]').fill('Brand guide — QA edition');
      await first.locator('textarea[data-field=criterion]').first().fill('Palette verified against approval v1');
      await first.locator('button[data-action=down]').click();
      const moved = page.locator('#items article').nth(1);
      assert.equal(await moved.locator('input[data-field=title]').inputValue(), 'Brand guide — QA edition');
      assert.equal(await moved.locator('.source').textContent(), source);
    });
    await step(name, 'acceptance-and-package-invariants', async () => {
      for (const card of await page.locator('#items article').all()) {
        assert.equal(await card.locator('.package-row input').isDisabled(), true);
        for (const check of await card.locator('.check-row input[type=checkbox]').all()) await check.check();
        await card.locator('.package-row input').check();
      }
      assert.equal(await page.locator('#readiness').textContent(), 'Handoff ready');
      const card = page.locator('#items article').first();
      await card.locator('textarea[data-field=criterion]').first().fill(' ');
      assert.equal(await card.locator('.check-row input[type=checkbox]').first().isChecked(), false);
      assert.equal(await card.locator('.check-row input[type=checkbox]').first().isDisabled(), true);
      assert.equal(await card.locator('.package-row input').isChecked(), false);
      await card.locator('textarea[data-field=criterion]').first().fill('Editable files match approved dimensions');
      await card.locator('.check-row input[type=checkbox]').first().focus();
      await page.keyboard.press('Space'); assert.equal(await card.locator('.check-row input[type=checkbox]').first().isChecked(), true);
      await card.locator('.package-row input').check();
      assert.equal(await page.locator('#readiness').textContent(), 'Handoff ready');
    });
    await step(name, 'local-storage-reload', async () => {
      const before = await saved(page); assert.ok(before); reference = JSON.parse(before);
      await page.reload(); assert.deepEqual(JSON.parse(await saved(page)), reference);
      assert.equal(await page.locator('#items article').count(), 2);
      assert.equal(await page.locator('#readiness').textContent(), 'Handoff ready');
    });
    await step(name, 'real-json-and-markdown-downloads', async () => {
      exported = await download(page, '#export-json', `${name}-worksheet.json`);
      assert.deepEqual(JSON.parse(exported.bytes.toString('utf8')), reference);
      const md = await download(page, '#export-md', `${name}-worksheet.md`);
      assert.match(md.bytes.toString('utf8'), /Brand guide/);
      assert.match(md.bytes.toString('utf8'), /Package: ready/);
    });
    await step(name, 'keyboard-modal-cancel-then-confirm-import', async () => {
      await page.locator('#project-title').fill('Keep this until confirmed'); const before = await saved(page);
      await upload(page, 'roundtrip.json', exported.bytes);
      await page.locator('#replace-dialog').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => document.activeElement.id), 'replace-cancel');
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'replace-confirm');
      await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'replace-cancel');
      await page.keyboard.press('Escape'); await page.locator('#replace-dialog').waitFor({ state: 'hidden' });
      assert.equal(await saved(page), before);
      await upload(page, 'roundtrip.json', exported.bytes); await page.locator('#replace-dialog').waitFor({ state: 'visible' });
      await page.locator('#replace-confirm').focus(); await page.keyboard.press('Enter');
      await page.locator('#replace-dialog').waitFor({ state: 'hidden' });
      assert.deepEqual(JSON.parse(await saved(page)), reference);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'workspace');
    });
    await step(name, 'malformed-and-hostile-json-refused-without-replacement', async () => {
      const before = await saved(page);
      for (const [file, payload, message] of [
        ['malformed.json', '{broken', 'This file is not valid JSON.'],
        ['hostile.json', before.replace('{', '{"__proto__":{"polluted":true},'), 'Unsupported worksheet structure.']
      ]) {
        await upload(page, file, payload);
        await page.waitForFunction(expected => document.getElementById('notice').textContent === expected, message);
        assert.equal(await page.locator('#notice.error').count(), 1);
        assert.equal(await saved(page), before); assert.equal(await page.locator('#items article').count(), 2);
        assert.equal(await page.locator('#replace-dialog').isVisible(), false);
      }
      assert.equal(await page.evaluate(() => ({}).polluted), undefined);
    });
    await step(name, 'suggestion-requires-edit-and-regeneration-cancel-is-safe', async () => {
      const before = await saved(page);
      await page.locator('#brief').fill('Deliverable: A modern flyer');
      await page.locator('#brief-form button[type=submit]').click();
      await page.locator('#replace-dialog').waitFor({ state: 'visible' });
      await page.locator('#replace-cancel').click(); assert.equal(await saved(page), before);
      await page.locator('#brief-form button[type=submit]').click(); await page.locator('#replace-confirm').click();
      const check = page.locator('#items .check-row input[type=checkbox]').first();
      assert.equal(await check.isDisabled(), true);
      await page.locator('#items textarea[data-field=criterion]').first().fill('Agreed A4 PDF with approved copy');
      assert.equal(await check.isDisabled(), false);
      await check.check(); await page.locator('#items .package-row input').check();
      assert.equal(await page.locator('#readiness').textContent(), 'Handoff ready');
      await upload(page, 'roundtrip.json', exported.bytes); await page.locator('#replace-confirm').click();
      assert.deepEqual(JSON.parse(await saved(page)), reference);
    });
    await step(name, 'corrupt-storage-retained-and-json-recovery', async () => {
      await page.evaluate(key => localStorage.setItem(key, '{corrupt'), KEY); await page.reload();
      assert.equal(await saved(page), '{corrupt');
      assert.match(await page.locator('#notice').textContent(), /unavailable or invalid/);
      assert.equal(await page.locator('#items article').count(), 0);
      await upload(page, 'recovery.json', exported.bytes);
      await page.locator('#items article').first().waitFor();
      assert.deepEqual(JSON.parse(await saved(page)), reference);
    });
    await step(name, 'refused-storage-keeps-memory-and-portable-export', async () => {
      const storedBefore = await saved(page);
      await page.evaluate(() => Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true, writable: true,
        value() { throw new DOMException('Synthetic write denial', 'QuotaExceededError'); }
      }));
      await page.locator('#project-title').fill('Storage blocked — still exportable');
      assert.match(await page.locator('#notice').textContent(), /could not be saved/);
      assert.equal(await saved(page), storedBefore);
      assert.equal(await page.locator('#items article').count(), 2);
      const recovery = await download(page, '#export-json', `${name}-blocked-storage-backup.json`);
      assert.equal(JSON.parse(recovery.bytes.toString('utf8')).title, 'Storage blocked — still exportable');
    });
    await step(name, 'console-network-and-responsive-overflow', async () => {
      await noOverflow(page); assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []); assert.deepEqual(externalRequests, []);
    });
  } finally {
    report.lastDiagnostics = { viewport: name, consoleErrors, pageErrors, externalRequests }; persist(); await context.close();
  }
}

async function main() {
  persist();
  const watchdog = setTimeout(() => { failOnce(new Error('180-second runner limit exceeded'), 'global-timeout'); process.exit(1); }, 180000);
  try {
    report.checkedOutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    assert.match(process.env.BRIEFREADY_QA_SOURCE_HEAD || '', /^[0-9a-f]{40}$/);
    assert.equal(report.checkedOutCommit, process.env.BRIEFREADY_QA_SOURCE_HEAD);
    report.applicationSource = {};
    for (const [filename, expected] of Object.entries(APP_SOURCE_SHA256)) {
      const observed = sha256(fs.readFileSync(path.join(ROOT, 'dist', filename)));
      assert.equal(observed, expected, `application baseline drift: ${filename}`);
      report.applicationSource[filename] = observed;
    }
    assert.equal(require('playwright/package.json').version, PW_VERSION);
    const metadata = JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'browsers.json'), 'utf8'));
    const pin = metadata.browsers.find(x => x.name === 'chromium');
    assert.equal(pin.revision, CHROMIUM_REVISION); assert.equal(pin.browserVersion, CHROMIUM_VERSION);
    // Static assets only. Binding loopback is admitted in the future standard
    // GitHub job, never in the managed Sites environment (entry guard above).
    const assets = new Map([['/', ['index.html', 'text/html']], ['/core.js', ['core.js', 'text/javascript']], ['/app.js', ['app.js', 'text/javascript']], ['/styles.css', ['styles.css', 'text/css']]]);
    server = http.createServer((req, res) => {
      const requested = new URL(req.url, 'http://localhost').pathname;
      if (requested === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      const asset = assets.get(requested);
      if (!asset || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': asset[1] + '; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(path.join(ROOT, 'dist', asset[0])));
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true });
    report.actualChromiumVersion = browser.version(); assert.equal(browser.version(), CHROMIUM_VERSION);
    report.chromiumExecutableSHA256 = await binaryHash(chromium.executablePath()); persist();
    await exercise(origin, 1440, 900); await exercise(origin, 390, 844);
    const outputBytes = fs.readdirSync(OUT).reduce((sum, f) => sum + fs.statSync(path.join(OUT, f)).size, 0);
    assert.ok(outputBytes <= report.evidenceLimits.maxBytes, 'evidence exceeds 512KiB cap');
    report.status = 'PASS';
  } catch (error) { failOnce(error, 'runner'); process.exitCode = 1; }
  finally {
    clearTimeout(watchdog);
    if (browser) await browser.close().catch(error => failOnce(error, 'browser-close'));
    if (server) await new Promise(resolve => server.close(resolve));
    report.finishedAt = new Date().toISOString(); persist();
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}
main().catch(error => { failOnce(error, 'unhandled'); process.exitCode = 1; });
