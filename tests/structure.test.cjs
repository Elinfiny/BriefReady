const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
test('offline HTML references only present local assets, in execution order',()=>{
  const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(x=>x[1]);assert.deepEqual(scripts,['core.js','app.js']);
  for(const file of [...scripts,'styles.css'])assert.ok(fs.existsSync(path.join(root,file)));
  assert.ok(!/https?:\/\//.test(html));assert.match(html,/connect-src 'none'/);
});
test('each static DOM hook used by the app exists exactly once',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  const hooks=[...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);for(const hook of hooks)assert.ok(ids.includes(hook),hook);
});
test('source does not introduce remote calls or unsafe user HTML rendering',()=>{
  for(const name of ['app.js','core.js']){const text=fs.readFileSync(path.join(root,name),'utf8');assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(/.test(text));assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(text));}
});
test('static accessibility and responsive foundations exist, not a visual QA verdict',()=>{
  assert.match(html,/<html lang="en">/);assert.match(html,/name="viewport"/);assert.match(html,/aria-live="polite"/);assert.match(html,/<dialog/);assert.match(html,/class="skip"/);
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');assert.match(css,/@media\(max-width:800px\)/);assert.match(css,/:focus-visible/);assert.match(css,/min-height:44px/);
});
