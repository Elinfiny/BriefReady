(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BriefReady = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMIT = {brief:12000, title:200, source:2000, criterion:500, questions:40, items:40, criteria:20, json:4*1024*1024};
  let seq = 0;
  const id = () => 'b' + Date.now().toString(36) + (++seq).toString(36);
  const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  function fail(message) { throw new Error(message); }
  function keys(v, expected) {
    if (!record(v) || Object.keys(v).sort().join('|') !== [...expected].sort().join('|')) fail('Unsupported worksheet structure.');
  }
  function str(v, max) { if (typeof v !== 'string' || v.length > max) fail('A text field is missing or too long.'); }
  function list(v, max) { if (!Array.isArray(v) || v.length > max) fail('A list is missing or too long.'); }
  function validate(v) {
    keys(v,['version','title','brief','questions','items']);
    if (v.version !== 1) fail('Unsupported worksheet version.');
    str(v.title,LIMIT.title); str(v.brief,LIMIT.brief); list(v.questions,LIMIT.questions); list(v.items,LIMIT.items);
    v.questions.forEach(q => str(q,LIMIT.source));
    const used = new Set();
    function unique(value) {
      if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value) || used.has(value)) fail('Invalid or duplicate worksheet ID.');
      used.add(value);
    }
    v.items.forEach(item => {
      keys(item,['id','title','source','criteria','packed']); unique(item.id);
      str(item.title,LIMIT.title); str(item.source,LIMIT.source); list(item.criteria,LIMIT.criteria);
      if (typeof item.packed !== 'boolean') fail('Invalid package state.');
      item.criteria.forEach(c => {
        keys(c,['id','text','origin','done']); unique(c.id); str(c.text,LIMIT.criterion);
        if (!['brief','suggested','user'].includes(c.origin) || typeof c.done !== 'boolean') fail('Invalid acceptance state.');
        if (c.done && (!c.text.trim() || c.origin === 'suggested')) fail('A suggested or blank check cannot be complete.');
      });
      if (item.packed && !packable(item)) fail('A package cannot be ready before its checks.');
    });
    return v;
  }
  function packable(item) {
    return Boolean(item.title.trim() && item.criteria.length && item.criteria.every(c=>c.text.trim() && c.done && c.origin !== 'suggested'));
  }
  const empty = () => ({version:1,title:'Untitled delivery',brief:'',questions:[],items:[]});
  const criterion = (text='', origin='user') => ({id:id(),text,origin,done:false});
  const item = (title='', source='Added by you') => ({id:id(),title,source,criteria:[],packed:false});
  function generate(brief, title='Untitled delivery') {
    str(brief,LIMIT.brief); str(title,LIMIT.title);
    if (!brief.trim()) fail('Paste a brief before drafting a checklist.');
    const state = {...empty(),brief,title:title.trim() || 'Untitled delivery'};
    const lines = brief.split(/\r?\n/).map(s=>s.replace(/^\s*(?:[-*•]|\d+[.)])\s+/,'').trim()).filter(Boolean);
    let current;
    for (const line of lines) {
      str(line,LIMIT.source);
      const accept = /^(?:accept(?:ance)?|done when|must):\s*(.+)$/i.exec(line);
      if (accept) {
        str(accept[1],LIMIT.criterion);
        if (current) current.criteria.push(criterion(accept[1],'brief'));
        else state.questions.push('Unassigned acceptance requirement: '+accept[1]);
      } else {
        const text = line.replace(/^(?:deliverable|deliver):\s*/i,'');
        if (!text.trim()) fail('A deliverable line is empty.');
        str(text,LIMIT.title); current=item(text,line); state.items.push(current);
      }
      if (/\b(asap|soon|modern|user[ -]friendly|etc|nice|simple)\b/i.test(line)) {
        state.questions.push('Clarify vague wording: '+line);
      }
    }
    if (!state.items.length) fail('Add at least one deliverable before acceptance requirements.');
    state.items.forEach(i=>{if(!i.criteria.length)i.criteria.push(criterion('Confirm the expected format, content and completion criteria.','suggested'));});
    return validate(state);
  }
  function parse(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > LIMIT.json) fail('Choose a JSON worksheet no larger than 4MB.');
    let v; try { v=JSON.parse(text); } catch { fail('This file is not valid JSON.'); }
    return validate(v);
  }
  const serialize = state => JSON.stringify(validate(state),null,2)+'\n';
  function progress(state) {
    validate(state);
    const checks=state.items.flatMap(i=>i.criteria), done=checks.filter(c=>c.done).length, packed=state.items.filter(i=>i.packed).length;
    return {total:checks.length,done,packages:state.items.length,packed,ready:state.items.length>0 && packed===state.items.length};
  }
  function move(state, itemId, delta) {
    const at=state.items.findIndex(i=>i.id===itemId), to=at+delta;
    if (at<0 || ![-1,1].includes(delta) || to<0 || to>=state.items.length) return false;
    [state.items[at],state.items[to]]=[state.items[to],state.items[at]]; return true;
  }
  function update(state, itemId, criterionId, text) {
    const it=state.items.find(i=>i.id===itemId); if(!it)fail('Deliverable not found.');
    if (criterionId) {
      const c=it.criteria.find(c=>c.id===criterionId); if(!c)fail('Check not found.'); str(text,LIMIT.criterion);
      if (text !== c.text) {c.text=text;c.origin='user';c.done=false;it.packed=false;}
    } else { str(text,LIMIT.title);if(text!==it.title){it.title=text;it.packed=false;} }
    return state;
  }
  function escapeMD(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\`*_{}\[\]()#+.!|~-]/g,'\\$&').replace(/\r?\n/g,' ');
  }
  function markdown(state) {
    validate(state); const p=progress(state);
    const out=['# '+escapeMD(state.title),'','Delivery worksheet • review every item before client use','',`${p.done}/${p.total} checks verified · ${p.packed}/${p.packages} packages ready`,''];
    state.items.forEach((i,n)=>{
      out.push(`## ${n+1}. ${escapeMD(i.title || 'Untitled deliverable')}`,'','Brief source: '+escapeMD(i.source),'');
      i.criteria.forEach(c=>out.push(`- [${c.done?'x':' '}] ${escapeMD(c.text || 'Add acceptance text')} (${c.origin})`));
      out.push('',`Package: ${i.packed?'ready':'pending'}`,'');
    });
    if(state.questions.length)out.push('## Questions to resolve','',...state.questions.map(q=>'- '+escapeMD(q)),'');
    out.push('## Original brief','',escapeMD(state.brief),'');
    return out.join('\n');
  }
  return {LIMIT,validate,empty,generate,parse,serialize,markdown,progress,move,update,packable,newItem:item,newCriterion:criterion};
});
