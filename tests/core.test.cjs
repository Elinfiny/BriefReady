const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../dist/core.js');
const brief='Deliverable: Brand guide\nAccept: Include palette and typography\nAccept: Deliver PDF\nDeliverable: Social templates\nAccept: Export editable files';
const draft=()=>C.generate(brief,'Studio launch');
test('brief to ordered source-linked deliverables and explicit checks',()=>{
  const s=draft();assert.equal(s.items.length,2);assert.equal(s.items[0].source,'Deliverable: Brand guide');
  assert.deepEqual(s.items.map(i=>i.title),['Brand guide','Social templates']);
  assert.deepEqual(s.items[0].criteria.map(c=>c.text),['Include palette and typography','Deliver PDF']);
  assert.equal(s.items[0].criteria[0].origin,'brief');assert.equal(C.progress(s).ready,false);
});
test('unprefixed lines and bullet/numbered lists work without inventing content',()=>{
  const s=C.generate('- A PDF report\n1. Three diagrams');assert.deepEqual(s.items.map(i=>i.title),['A PDF report','Three diagrams']);
});
test('blank/oversized briefs fail without mutating a previous worksheet',()=>{
  const s=draft(),before=C.serialize(s);for(const bad of ['', '  \n ','x'.repeat(12001),null])assert.throws(()=>C.generate(bad));assert.equal(C.serialize(s),before);
});
test('explicit acceptance before a deliverable is unassigned, not silently attributed',()=>{
  const s=C.generate('Accept: Use PDF\nA report');assert.match(s.questions[0],/Unassigned/);assert.equal(s.items[0].criteria[0].origin,'suggested');
  assert.throws(()=>C.generate('Accept: Use PDF'));
});
test('vague wording raises a prompt; it is not quietly treated as clear scope',()=>{
  const s=C.generate('A modern landing page ASAP');assert.match(s.questions[0],/Clarify vague wording/);
});
test('suggested criteria cannot be checked until edited into agreed user text',()=>{
  const s=C.generate('A report'),i=s.items[0],c=i.criteria[0];c.done=true;assert.throws(()=>C.validate(s),/suggested/);
  c.done=false;C.update(s,i.id,c.id,'Includes the approved figures as PDF');assert.equal(c.origin,'user');c.done=true;assert.equal(C.packable(i),true);
});
test('edits reopen checks and package flags, keeping completion truthful',()=>{
  const s=draft(),i=s.items[0];i.criteria.forEach(c=>c.done=true);i.packed=true;
  C.update(s,i.id,i.criteria[0].id,'Include approved palette');assert.equal(i.criteria[0].done,false);assert.equal(i.packed,false);
  i.criteria.forEach(c=>c.done=true);i.packed=true;C.update(s,i.id,null,'Revised guide');assert.equal(i.packed,false);
});
test('empty states are never ready; packing requires all agreed nonblank checks',()=>{
  assert.equal(C.progress(C.empty()).ready,false);const s=draft();assert.throws(()=>C.validate({...s,items:[{...s.items[0],packed:true}]}));
  s.items.forEach(i=>{i.criteria.forEach(c=>c.done=true);i.packed=true;});assert.deepEqual(C.progress(s),{total:3,done:3,packages:2,packed:2,ready:true});
});
test('reordering preserves IDs, criteria, completion and source',()=>{
  const s=draft(),original=structuredClone(s.items[1]);assert.equal(C.move(s,s.items[1].id,-1),true);assert.deepEqual(s.items[0],original);
  assert.equal(C.move(s,s.items[0].id,-1),false);assert.equal(C.move(s,'missing',1),false);assert.equal(C.move(s,s.items[0].id,2),false);
});
test('JSON export/import is an exact portable round-trip including edited order and completion',()=>{
  const s=draft();C.move(s,s.items[1].id,-1);C.update(s,s.items[0].id,s.items[0].criteria[0].id,'Export source and preview');s.items[0].criteria[0].done=true;s.items[0].packed=true;
  assert.deepEqual(C.parse(C.serialize(s)),s);
});
test('invalid imports reject completely without modifying the current worksheet',()=>{
  const s=draft(),before=C.serialize(s);
  const bad=[{},null,[],{...s,version:2},{...s,items:'items'},{...s,questions:[5]},{...s,extra:true},{...s,title:7}];
  for(const x of bad)assert.throws(()=>C.parse(JSON.stringify(x)));assert.throws(()=>C.parse('{oops'));assert.equal(C.serialize(s),before);
});
test('IDs are unique across deliverables and checks; extra keys and nonboolean state reject',()=>{
  for(const mutate of [
    s=>s.items[1].id=s.items[0].id,
    s=>s.items[0].criteria[0].id=s.items[0].id,
    s=>s.items[0].criteria[0].done='true',
    s=>s.items[0].packed=1,
    s=>s.items[0].criteria[0].origin='ai',
    s=>s.items[0].criteria[0].extra='unknown',
    s=>s.items[0].criteria[0].text='',
  ]){const s=draft();s.items[0].criteria[0].done=true;mutate(s);assert.throws(()=>C.validate(s));}
});
test('prototype pollution and hostile nesting reject at the boundary',()=>{
  assert.throws(()=>C.parse('{"version":1,"__proto__":{"polluted":true}}'));assert.equal({}.polluted,undefined);
  assert.throws(()=>C.parse('['.repeat(1000)+'0'+']'.repeat(1000)));
});
test('cardinality and size bounds reject rather than truncate user requirements',()=>{
  assert.throws(()=>C.generate(Array.from({length:41},(_,i)=>'Item '+i).join('\n')));
  assert.throws(()=>C.generate('Report\n'+Array(21).fill('Accept: PDF').join('\n')));
  assert.throws(()=>C.generate('x'.repeat(201)));
  assert.throws(()=>C.parse(' '.repeat(C.LIMIT.json+1)));
  assert.throws(()=>C.parse('é'.repeat(C.LIMIT.json/2+1)));
});
test('even the maximum valid worksheet with escaped Unicode round-trips under the file cap',()=>{
  const s=C.empty();s.title='\u0000'.repeat(200);s.brief='\u0000'.repeat(12000);s.questions=Array(40).fill('\u0000'.repeat(2000));
  for(let n=0;n<40;n++){const i=C.newItem('\u0000'.repeat(200),'\u0000'.repeat(2000));for(let j=0;j<20;j++)i.criteria.push(C.newCriterion('\u0000'.repeat(500)));s.items.push(i);}
  const encoded=C.serialize(s);assert.ok(Buffer.byteLength(encoded)<=C.LIMIT.json);assert.deepEqual(C.parse(encoded),s);
});
test('Markdown includes source, pending/done, package status and ambiguity prompts',()=>{
  const s=C.generate('A modern report\nAccept: PDF','Report');s.items[0].criteria[0].done=true;const md=C.markdown(s);
  assert.match(md,/# Report/);assert.match(md,/Brief source: A modern report/);assert.match(md,/- \[x\] PDF \(brief\)/);assert.match(md,/Package: pending/);assert.match(md,/Questions to resolve/);
});
test('hostile strings stay data in JSON and are escaped in exported Markdown',()=>{
  const s=C.generate('<script>alert(1)</script>\nAccept: [click](javascript:alert(1))','<img src=x onerror=alert(1)>');
  const md=C.markdown(s);assert.ok(!md.includes('<script>'));assert.ok(!md.includes('<img'));assert.ok(!md.includes('[click]('));assert.deepEqual(C.parse(C.serialize(s)),s);
});
