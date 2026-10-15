'use strict';
// PRIVATE CANDIDATE. Future destination: qa/capture-demo.cjs. Never run in Sites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.SITES_MANAGED_LINUX_CONTAINER === '1' ||
    process.env.GITHUB_RUN_ATTEMPT !== '1' || process.env.BRIEFREADY_CAPTURE_ADMISSION !== 'ADMITTED_SINGLE_CAPTURE_USD0' ||
    !/^[a-f0-9]{64}$/.test(process.env.BRIEFREADY_CAPTURE_COST_EVIDENCE_SHA256 || '')) {
  throw new Error('Capture not admitted; no dependency import, browser or server started.');
}
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.env.BRIEFREADY_CAPTURE_OUT);
const CACHE = path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH);
const MAX = 25 * 1024 * 1024, STOP_AT = 20 * 1024 * 1024;
const SIZE = { width: 1440, height: 900 };
const REPORT = path.join(OUT, 'capture-report.json');
fs.mkdirSync(OUT, { recursive: true });
const report = { schema: 'briefready-demo-capture-v1', status: 'PREPARING', startedAt: new Date().toISOString(),
  runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  expectedHead: process.env.BRIEFREADY_CAPTURE_SOURCE_HEAD, costEvidenceSHA256: process.env.BRIEFREADY_CAPTURE_COST_EVIDENCE_SHA256,
  targetSeconds: 150, videoAndViewport: SIZE, steps: [], firstFailure: null, screenshots: 0, traces: 0,
  limits: { maxArtifactBytes: MAX, closeCaptureAtBytes: STOP_AT, jobMinutes: 10, retries: 0 },
  note: 'New real product demonstration; no replay of historical QA and no learner participation claim.' };
let browserServer, browser, context, page, server, video, timer, monitor, stopReason;
let original, originalMediaBytes, mediaContext, captureStarted = false;
const persist = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function hashFile(file) { const h = crypto.createHash('sha256'); for await (const b of fs.createReadStream(file)) h.update(b); return h.digest('hex'); }
function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name); assert.ok(!e.isSymbolicLink(), 'unexpected evidence symlink');
    return e.isDirectory() ? filesUnder(p) : [p];
  });
}
function bytesUnder(dir) { return filesUnder(dir).reduce((n, f) => n + fs.statSync(f).size, 0); }
function firstFailure(error, stage) {
  if (!report.firstFailure) report.firstFailure = { stage, name: error.name, message: error.message };
  report.status = original ? 'RECORDED_REQUIRES_RECONCILIATION_NO_RERECORD' : 'FAIL'; persist();
}
function halt(message) {
  if (!stopReason) { stopReason = new Error(message); firstFailure(stopReason, 'capture-bound');
    if (context) context.close().catch(e => firstFailure(e, 'bounded-close'));
  }
}
async function waitUntil(start, seconds) {
  while (performance.now() < start + seconds * 1000) {
    if (stopReason) throw stopReason;
    await new Promise(resolve => setTimeout(resolve, Math.min(500, start + seconds * 1000 - performance.now())));
  }
  if (stopReason) throw stopReason;
}
// MEDIA_VALIDATION_BEGIN: inert harness extracts these exact production functions only.
function mediaVerdict(m) {
  const errors = [];
  for (const name of ['loadedmetadata', 'loadeddata', 'playing', 'ended'])
    if (!m.events.some(e => e.name === name)) errors.push(`missing ${name}`);
  if (m.error || m.events.some(e => e.name === 'error')) errors.push(m.error || 'media error');
  if (!Number.isFinite(m.duration) || m.duration < 145 || m.duration >= 180) errors.push('invalid final duration');
  if (m.width !== 1440 || m.height !== 900) errors.push('invalid decoded dimensions');
  if (m.playbackRate !== 1 || m.startTime !== 0 || m.seekingEvents !== 0 || !m.ended || m.currentTime < m.duration - 0.25) errors.push('incomplete single rate1 playback');
  if (!Number.isInteger(m.decodedFrames) || m.decodedFrames <= 0 || m.presentedCallbacks <= 0 || !Number.isInteger(m.totalVideoFrames) || m.totalVideoFrames <= 0) errors.push('no decoded frame evidence');
  return errors;
}
async function mediaPlaybackInPage({ url, timeoutMs }) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.loop = false; v.preload = 'auto';
  v.playbackRate = 1; v.defaultPlaybackRate = 1; document.body.append(v);
  const m = { events: [], startTime: v.currentTime, seekingEvents: 0, presentedCallbacks: 0, error: null };
  let finished = false, frameId, timeout;
  return await new Promise(resolve => {
    const finish = error => {
      if (finished) return; finished = true; clearTimeout(timeout);
      if (frameId !== undefined) v.cancelVideoFrameCallback(frameId);
      const quality = typeof v.getVideoPlaybackQuality === 'function' ? v.getVideoPlaybackQuality() : {};
      Object.assign(m, { error: error || m.error, duration: v.duration, width: v.videoWidth, height: v.videoHeight,
        playbackRate: v.playbackRate, currentTime: v.currentTime, ended: v.ended,
        decodedFrames: v.webkitDecodedFrameCount, totalVideoFrames: quality.totalVideoFrames,
        droppedVideoFrames: quality.droppedVideoFrames });
      // NaN/Infinity are retained as explicit initial-event strings, never replaced by planned duration.
      v.pause(); resolve(m);
    };
    for (const name of ['loadedmetadata', 'loadeddata', 'playing', 'durationchange', 'ended', 'error']) {
      v.addEventListener(name, () => {
        m.events.push({ name, currentTime: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : String(v.duration) });
        if (name === 'error') finish(`HTMLMediaElement error ${v.error?.code}: ${v.error?.message || 'unspecified'}`);
        if (name === 'ended') finish();
      });
    }
    v.addEventListener('seeking', () => { m.seekingEvents++; finish('Unexpected media seek'); });
    v.addEventListener('ratechange', () => { if (v.playbackRate !== 1) finish('Playback rate changed'); });
    if (typeof v.requestVideoFrameCallback !== 'function' || typeof v.getVideoPlaybackQuality !== 'function' || typeof v.webkitDecodedFrameCount !== 'number') {
      finish('Qualified Chromium decoded-frame APIs unavailable'); return;
    }
    const frame = () => { if (finished) return; m.presentedCallbacks++; frameId = v.requestVideoFrameCallback(frame); };
    frameId = v.requestVideoFrameCallback(frame);
    timeout = setTimeout(() => finish('Single original playback timed out'), timeoutMs);
    v.src = url; // Set exactly once; no seek, reload, loop, alternate URL, browser or codec.
    v.play().catch(error => finish(`Media play rejected: ${error.message}`));
  });
}
// MEDIA_VALIDATION_END
function locatePinnedEncoder(revision) {
  // Inspect the installed revision directory and executable ELF files; import no internal registry.
  const dirs = fs.readdirSync(CACHE, { withFileTypes: true }).filter(e => e.isDirectory() && e.name === `ffmpeg-${revision}`);
  assert.equal(dirs.length, 1, 'Pinned ffmpeg revision not installed; STOP without capture');
  const found = filesUnder(path.join(CACHE, dirs[0].name)).filter(f => {
    const s = fs.statSync(f); if (!(s.mode & 0o111)) return false;
    const fd = fs.openSync(f, 'r'), b = Buffer.alloc(4); try { fs.readSync(fd, b, 0, 4, 0); } finally { fs.closeSync(fd); }
    return b.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
  });
  assert.equal(found.length, 1, 'Encoder ELF identity ambiguous');
  const file = fs.realpathSync(found[0]); assert.ok(file.startsWith(fs.realpathSync(CACHE) + path.sep));
  const version = execFileSync(file, ['-version'], { encoding: 'utf8', timeout: 5000 }).split('\n')[0];
  assert.match(version, /^ffmpeg version /); return { file, version, revision };
}
function findEncoderProcess(expectedFile) {
  for (const id of fs.readdirSync('/proc').filter(s => /^\d+$/.test(s))) {
    try {
      if (fs.realpathSync(`/proc/${id}/exe`) === expectedFile &&
          /^PPid:\s*(\d+)$/m.exec(fs.readFileSync(`/proc/${id}/status`, 'utf8'))?.[1] === String(process.pid)) return Number(id);
    } catch { /* A concurrently exited process is not identity evidence. */ }
  }
  throw new Error('Actual recorder process not bound to qualified encoder; preserve original, no retry');
}
async function getDownload(button, name) {
  const pending = page.waitForEvent('download'); await page.locator(button).click();
  const d = await pending; assert.equal(await d.failure(), null);
  const file = path.join(OUT, name); await d.saveAs(file);
  report.downloads ||= []; report.downloads.push({ file: name, bytes: fs.statSync(file).size, sha256: await hashFile(file) });
  return file;
}
async function main() {
  persist();
  report.checkedOutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.match(report.expectedHead || '', /^[a-f0-9]{40}$/); assert.equal(report.checkedOutCommit, report.expectedHead);
  const sourceHashes = {
    'dist/app.js': 'b6dd1c833fba7a63cc2ff7ccdcf2e72328ab8d276bcd0a70f1ad91d800f730b9',
    'dist/core.js': '652f1e485698c65df3079ad875dfa5715d9a0372b23f52d3821b20c1fd2e16d7',
    'dist/index.html': '3e5f8390b9f937e825e64fec060d91d73ec0cfbdc92a676811b2fd269f2b79c8',
    'dist/styles.css': '66734bdc97abb0383cc3af7921324daa2e79592a9096168c8f15b941d5229ef7',
    'qa/package.json': '7c7cd78ab58e901c930aabb10707cc44c7e8c15e3dc5091735f33e9a2ee64691',
    'qa/package-lock.json': '274a51869fe902d8343da63145a39a5a45140b171e9d37b1f6b1b7c204898b2d',
    'README.md': 'eded159eb80e9f4c853de682b898ad11a76c3319b8137617040aa00892a75e53',
    'devpost/checklist.md': 'a15cdbb7838e9e00f22b341d3889ad8ba51a0bd1578a90bead6fc409c3c3c3fb',
    'devpost/spec.md': '2abe312f803164a281ee1cd673fb26654c7b965e32d8d1e45f3671cc7a8f5e63'
  };
  for (const [file, expected] of Object.entries(sourceHashes)) assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), expected, `source drift ${file}`);
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/package-lock.json')));
  assert.equal(lock.packages['node_modules/playwright'].integrity, 'sha512-HCrVhHr5QQuwYoswEUGTb7gGp522yflbv/ST8nF4sFWGuLjQCt17Q/EubpGGSNKYn1tsTCPZxqHhHCfVURu7UA==');
  assert.equal(lock.packages['node_modules/playwright-core'].integrity, 'sha512-BC4s8y6SEVA6Q1rSxZTto8hI1KUI3xXlHGZgvGqP4IqPdI/a6FX9H29IDNz7vKo9l21b6LfYosScPL6M3xxyDQ==');
  const { chromium } = require('playwright'); assert.equal(require('playwright/package.json').version, '1.64.1');
  const raw = fs.readFileSync(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'browsers.json'));
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest('hex'), '6352eed69ace538834662cfc68e353bf8d874e0f');
  const metadata = JSON.parse(raw); const cp = metadata.browsers.find(b => b.name === 'chromium');
  assert.equal(cp.revision, '1248'); assert.equal(cp.browserVersion, '156.0.8078.4');
  const ep = metadata.browsers.find(b => b.name === 'ffmpeg'); assert.equal(ep.revision, '1013');
  const encoder = locatePinnedEncoder(ep.revision); encoder.sha256 = await hashFile(encoder.file); report.encoder = encoder;
  const executablePath = fs.realpathSync(chromium.executablePath());
  report.browserBinary = { declaredPath: executablePath, sha256: await hashFile(executablePath) };
  report.runtime = { node: process.version, ImageOS: process.env.ImageOS, ImageVersion: process.env.ImageVersion, playwright: '1.64.1' }; persist();
  timer = setTimeout(() => halt('240-second presentation limit reached'), 240000);
  browserServer = await chromium.launchServer({ executablePath, headless: true, host: '127.0.0.1', timeout: 10000 });
  const child = browserServer.process(); assert.ok(child?.pid);
  const procFile = fs.realpathSync(`/proc/${child.pid}/exe`); assert.equal(procFile, executablePath);
  assert.equal(await hashFile(`/proc/${child.pid}/exe`), report.browserBinary.sha256);
  report.browserBinary.actualProcess = { pid: child.pid, executable: procFile, hashMatchesDeclared: true };
  browser = await chromium.connect(browserServer.wsEndpoint(), { timeout: 10000 });
  assert.equal(browser.version(), '156.0.8078.4'); report.actualBrowserVersion = browser.version();
  const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/core.js', ['core.js', 'text/javascript']], ['/styles.css', ['styles.css', 'text/css']]]);
  server = http.createServer((req, res) => {
    if (req.url === '/original-demo.webm') {
      if (req.method !== 'GET' || !originalMediaBytes) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'video/webm', 'Content-Length': originalMediaBytes.length,
        'Cache-Control': 'no-store', 'Accept-Ranges': 'none' });
      res.end(originalMediaBytes); return;
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (pathname === '/captured-export.md' && fs.existsSync(path.join(OUT, 'worksheet.md'))) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(fs.readFileSync(path.join(OUT, 'worksheet.md'))); return;
    }
    const a = assets.get(pathname); if (!a) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': a[1] + '; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(fs.readFileSync(path.join(ROOT, 'dist', a[0])));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: path.join(OUT, 'original'), size: SIZE }, acceptDownloads: true, serviceWorkers: 'block' });
  await context.route('**/*', route => route.request().url().startsWith(origin + '/') || route.request().url().startsWith('blob:' + origin + '/') ? route.continue() : route.abort('blockedbyclient'));
  page = await context.newPage(); video = page.video(); captureStarted = true;
  report.encoder.actualProcess = { pid: findEncoderProcess(encoder.file), matchedQualifiedFile: true };
  page.setDefaultTimeout(5000); page.setDefaultNavigationTimeout(10000);
  page.on('pageerror', error => halt(`Product page error: ${error.message}`));
  page.on('console', msg => { if (msg.type() === 'error') halt(`Product console error: ${msg.text()}`); });
  monitor = setInterval(() => { try { if (bytesUnder(OUT) >= STOP_AT) halt('Evidence size guard: preserve original partial recording, no trimming'); } catch (e) { halt(e.message); } }, 250);
  await page.goto(origin); await page.locator('.empty').waitFor();
  const start = performance.now(); report.status = 'CAPTURING'; report.captureStart = new Date().toISOString(); persist();
  async function scene(seconds, title, fn) { await waitUntil(start, seconds); await fn(); report.steps.push({ targetSeconds: seconds, actualSeconds: (performance.now() - start) / 1000, title }); persist(); }
  await scene(0, 'BriefReady: source-linked handoff worksheet', async () => {});
  await scene(15, 'Load the labeled synthetic brief and create the draft', async () => { await page.locator('#example').click(); await page.locator('#brief-form button[type=submit]').click(); await page.locator('#items article').nth(1).waitFor(); });
  await scene(35, 'Review source and edit acceptance wording', async () => { const card = page.locator('#items article').first(); await card.locator('input[data-field=title]').fill('Brand guide — demo'); await card.locator('textarea[data-field=criterion]').first().fill('Palette verified against approval v1'); });
  await scene(55, 'Changed wording clears old verification; reorder', async () => { const card = page.locator('#items article').first(); await card.locator('.check-row input[type=checkbox]').first().check(); await card.locator('textarea[data-field=criterion]').first().fill('Palette and typography checked against approval v1'); assert.equal(await card.locator('.check-row input[type=checkbox]').first().isChecked(), false); await card.locator('button[data-action=down]').click(); });
  await scene(80, 'Verify checks and mark packages prepared', async () => { for (const card of await page.locator('#items article').all()) { for (const check of await card.locator('.check-row input[type=checkbox]').all()) await check.check(); await card.locator('.package-row input').check(); } await page.reload(); await page.locator('#items article').nth(1).waitFor(); });
  let jsonFile;
  await scene(105, 'Export real Markdown and JSON', async () => { jsonFile = await getDownload('#export-json', 'worksheet.json'); await getDownload('#export-md', 'worksheet.md'); await page.goto(origin + '/captured-export.md'); });
  await scene(130, 'Cancel replacement once, then restore the saved worksheet', async () => { await page.goto(origin); await page.locator('#items article').nth(1).waitFor(); await page.locator('#project-title').fill('Keep this until confirmed'); await page.locator('#import-file').setInputFiles(jsonFile); await page.locator('#replace-dialog').waitFor({ state: 'visible' }); await page.locator('#replace-cancel').click(); await page.locator('#import-file').setInputFiles(jsonFile); await page.locator('#replace-confirm').click(); await page.locator('#replace-dialog').waitFor({ state: 'hidden' }); });
  await scene(145, 'Restored worksheet: trace the brief and check the handoff', async () => { await page.locator('#items article').nth(1).waitFor(); });
  await waitUntil(start, 150); await context.close(); context = undefined;
  report.captureEnd = new Date().toISOString(); report.status = 'CAPTURED_PENDING_PROBE'; persist();
  // No trimming, remux, transcode, replacement video or rerecording is performed.
  original = await video.path(); report.original = { relativePath: path.relative(OUT, original), bytes: fs.statSync(original).size, sha256: await hashFile(original), unmodified: true };
  persist(); // Original count/SHA are durably written before any media parse/probe.
  assert.ok(report.original.bytes > 0 && report.original.bytes <= MAX, 'Original WebM exceeds media cap; preserve without probing');
  originalMediaBytes = fs.readFileSync(original); assert.equal(sha(originalMediaBytes), report.original.sha256);
  clearTimeout(timer); timer = undefined; clearInterval(monitor); // 240s capture guard ends; separate finite playback timeout follows.
  report.decoder = { method: 'HTMLVideoElement single complete playback; separate NON-recording context',
    browserPID: child.pid, browserExecutableSHA256: report.browserBinary.sha256, version: browser.version(), recording: false };
  mediaContext = await browser.newContext({ viewport: SIZE, serviceWorkers: 'block' });
  const mediaURL = origin + '/original-demo.webm';
  await mediaContext.route('**/*', route => route.request().url() === mediaURL ? route.continue() : route.abort('blockedbyclient'));
  const mediaPage = await mediaContext.newPage();
  await mediaPage.setContent('<!doctype html><html lang="en"><title>Private original media validation</title><body></body></html>');
  report.probe = await mediaPage.evaluate(mediaPlaybackInPage, { url: mediaURL, timeoutMs: 210000 });
  persist(); // Keep events and first error before validation can throw.
  await mediaContext.close(); mediaContext = undefined;
  assert.equal(await hashFile(original), report.original.sha256, 'Original changed during playback');
  assert.equal(fs.statSync(original).size, report.original.bytes);
  const errors = mediaVerdict(report.probe); assert.equal(errors.length, 0, errors.join('; '));
  report.actualSeconds = report.probe.duration; assert.ok(bytesUnder(OUT) < MAX - 16384, 'Evidence exceeds cap; preserve original, do not truncate');
  report.status = 'PASS_REAL_CAPTURE';
}
main().catch(error => firstFailure(error, captureStarted ? 'capture-or-probe' : 'preflight')).finally(async () => {
  clearTimeout(timer); clearInterval(monitor);
  if (context) await context.close().catch(e => firstFailure(e, 'context-close'));
  if (video && !report.original) {
    try { original = await video.path(); report.original = { relativePath: path.relative(OUT, original), bytes: fs.statSync(original).size, sha256: await hashFile(original), unmodified: true }; }
    catch (e) { firstFailure(e, 'original-recovery'); }
  }
  if (mediaContext) await mediaContext.close().catch(e => firstFailure(e, 'media-context-close'));
  if (browser) await browser.close().catch(e => firstFailure(e, 'browser-close'));
  if (browserServer) await browserServer.close().catch(e => firstFailure(e, 'browser-server-close'));
  if (server) await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString(); report.reconciliation = report.original && report.status !== 'PASS_REAL_CAPTURE' ? 'Original retained; next investigation is read-only on same original, NEVER auto-rerecord' : null;
  persist(); if (report.status !== 'PASS_REAL_CAPTURE') process.exitCode = 1;
});
