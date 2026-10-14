(function () {
  'use strict';
  const C=window.BriefReady, $=id=>document.getElementById(id), KEY='briefready.v1';
  let state=C.empty(), pending=null, importSequence=0;
  const sample='Deliverable: A one-page brand guide\nAccept: Include the approved palette, type scale and logo spacing\nAccept: Export a print-ready PDF\nDeliverable: Three social templates\nAccept: Include editable source files and PNG previews\nAccept: Confirm the final dimensions before delivery';
  function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
  function save(){
    try {localStorage.setItem(KEY,C.serialize(state));notice('Worksheet saved in this browser. Export JSON for a portable copy.');}
    catch {notice('This worksheet could not be saved in this browser. Keep this tab open and export JSON.',true);}
  }
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function button(text,action,itemId,criterionId){const b=el('button',text);b.type='button';b.dataset.action=action;if(itemId)b.dataset.item=itemId;if(criterionId)b.dataset.criterion=criterionId;return b;}
  function refreshSummary(){
    const p=C.progress(state);$('readiness').textContent=p.ready?'Handoff ready':p.packages?'Review in progress':'Not started';
    $('summary').textContent=p.packages?`${p.done} of ${p.total} checks verified · ${p.packed} of ${p.packages} packages ready`:'A small plan you can actually finish.';
    $('progress-bar').style.width=(p.total?100*p.done/p.total:0)+'%';
    state.items.forEach(i=>{
      const check=$('packed-'+i.id);if(check){check.disabled=!C.packable(i);check.checked=i.packed;}
      i.criteria.forEach(c=>{const box=$('done-'+c.id);if(box){box.disabled=!c.text.trim()||c.origin==='suggested';box.checked=c.done;}
        const label=$('origin-'+c.id);if(label)label.textContent=originLabel(c);
      });
    });
  }
  function originLabel(c){return c.origin==='suggested'?'Suggested — edit to define an agreed check':c.origin==='brief'?'From brief — verify with the client':'Edited by you — verify before checking';}
  function render(){
    const active=document.activeElement, activeId=active&&active.id;
    const selection=active&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null;
    const host=$('items');host.replaceChildren();
    if(!state.items.length){const n=el('div',undefined,'empty');n.append(el('div','↳','empty-symbol'),el('h3','A brief is just the beginning.'),el('p','Paste the ask on the left. Your source-linked delivery checklist will appear here.'));host.append(n);}
    state.items.forEach((i,index)=>{
      const card=el('article',undefined,'card');card.setAttribute('aria-label',`Deliverable ${index+1}`);
      const top=el('div',undefined,'card-top'), actions=el('div',undefined,'card-actions');top.append(el('span',String(index+1).padStart(2,'0'),'item-number'));
      const up=button('↑','up',i.id),down=button('↓','down',i.id),remove=button('Remove','remove',i.id);
      up.id='up-'+i.id;down.id='down-'+i.id;up.disabled=index===0;down.disabled=index===state.items.length-1;
      up.setAttribute('aria-label',`Move deliverable ${index+1} up`);down.setAttribute('aria-label',`Move deliverable ${index+1} down`);remove.setAttribute('aria-label',`Remove deliverable ${index+1}`);remove.className='remove';actions.append(up,down,remove);top.append(actions);
      const label=el('label','Deliverable');label.htmlFor='title-'+i.id;
      const input=el('input');input.type='text';input.id=label.htmlFor;input.value=i.title;input.maxLength=C.LIMIT.title;input.className='title-input';input.dataset.field='title';input.dataset.item=i.id;
      const source=el('p','Brief source: '+i.source,'source');
      const criteria=el('div',undefined,'criteria');criteria.append(el('h3','Acceptance checks','eyebrow'));
      if(!i.criteria.length)criteria.append(el('p','Add an agreed acceptance check to define done.','help'));
      i.criteria.forEach((c,n)=>{
        const row=el('div',undefined,'check-row'+(c.origin==='suggested'?' suggested':''));
        const checkbox=el('input');checkbox.type='checkbox';checkbox.id='done-'+c.id;checkbox.dataset.action='done';checkbox.dataset.item=i.id;checkbox.dataset.criterion=c.id;checkbox.checked=c.done;checkbox.setAttribute('aria-label',`Verify check ${n+1} for deliverable ${index+1}`);
        const field=el('div'),clabel=el('label',`Check ${n+1}`);clabel.htmlFor='criterion-'+c.id;
        const area=el('textarea');area.id=clabel.htmlFor;area.rows=2;area.maxLength=C.LIMIT.criterion;area.value=c.text;area.dataset.field='criterion';area.dataset.item=i.id;area.dataset.criterion=c.id;
        const origin=el('span',originLabel(c),'origin');origin.id='origin-'+c.id;area.setAttribute('aria-describedby',origin.id);
        field.append(clabel,area,origin);const del=button('×','delete-check',i.id,c.id);del.className='delete-check';del.setAttribute('aria-label',`Remove check ${n+1} from deliverable ${index+1}`);row.append(checkbox,field,del);criteria.append(row);
      });
      const add=button('+ Add acceptance check','add-check',i.id);add.className='text-button';add.disabled=i.criteria.length>=C.LIMIT.criteria;criteria.append(add);
      const packLabel=el('label',undefined,'package-row'),pack=el('input');pack.type='checkbox';pack.id='packed-'+i.id;pack.dataset.action='packed';pack.dataset.item=i.id;pack.checked=i.packed;packLabel.append(pack,el('span','Delivery package prepared'));
      const hint=el('p','Verify all agreed checks before marking the package ready.','package-help');hint.id='pack-help-'+i.id;pack.setAttribute('aria-describedby',hint.id);
      card.append(top,label,input,source,criteria,packLabel,hint);host.append(card);
    });
    $('questions').replaceChildren(...state.questions.map(q=>el('li',q)));$('questions-box').hidden=!state.questions.length;
    $('add-item').hidden=!state.items.length;$('add-item').disabled=state.items.length>=C.LIMIT.items;$('export-tools').hidden=!state.items.length;
    refreshSummary();
    if(activeId){const next=$(activeId);if(next){next.focus();if(selection)next.setSelectionRange(...selection);}}
  }
  function apply(candidate){state=C.validate(candidate);$('project-title').value=state.title;$('brief').value=state.brief;render();save();$('workspace').focus();}
  function propose(candidate){
    C.validate(candidate);
    if(state.items.length){pending=candidate;$('replace-dialog').showModal();}else apply(candidate);
  }
  $('replace-confirm').addEventListener('click',()=>{const candidate=pending;pending=null;$('replace-dialog').close();if(candidate)apply(candidate);});
  $('replace-cancel').addEventListener('click',()=>{pending=null;$('replace-dialog').close();});
  $('replace-dialog').addEventListener('cancel',()=>{pending=null;});
  $('replace-dialog').addEventListener('close',()=>{pending=null;});
  $('example').addEventListener('click',()=>{
    if($('brief').value.trim()){
      // Preserve both the current textarea and worksheet: the example is a new candidate.
      try{propose(C.generate(sample,'Studio launch kit · synthetic example'));}catch(e){notice(e.message,true);}
    }else{$('brief').value=sample;$('project-title').value='Studio launch kit · synthetic example';notice('Synthetic example loaded. Draft it, then review every acceptance check.');}
  });
  $('brief-form').addEventListener('submit',e=>{e.preventDefault();try{propose(C.generate($('brief').value,$('project-title').value));}catch(err){notice(err.message,true);}});
  $('project-title').addEventListener('input',()=>{state.title=$('project-title').value;save();});
  $('items').addEventListener('input',e=>{
    const t=e.target;if(!t.dataset.field)return;
    try{C.update(state,t.dataset.item,t.dataset.criterion,t.value);refreshSummary();save();}catch(err){notice(err.message,true);}
  });
  $('items').addEventListener('change',e=>{
    const t=e.target,i=state.items.find(x=>x.id===t.dataset.item);if(!i)return;
    if(t.dataset.action==='done'){
      const c=i.criteria.find(x=>x.id===t.dataset.criterion);if(!c)return;
      c.done=Boolean(t.checked && c.text.trim() && c.origin!=='suggested');i.packed=false;
    }else if(t.dataset.action==='packed'){i.packed=Boolean(t.checked && C.packable(i));}else return;
    render();save();
  });
  $('items').addEventListener('click',e=>{
    const t=e.target.closest('button[data-action]');if(!t)return;
    const i=state.items.find(x=>x.id===t.dataset.item);if(!i)return;
    switch(t.dataset.action){
      case 'up':C.move(state,i.id,-1);break;
      case 'down':C.move(state,i.id,1);break;
      case 'remove':state.items=state.items.filter(x=>x!==i);break;
      case 'delete-check':i.criteria=i.criteria.filter(c=>c.id!==t.dataset.criterion);i.packed=false;break;
      case 'add-check':if(i.criteria.length<C.LIMIT.criteria){i.criteria.push(C.newCriterion());i.packed=false;}break;
      default:return;
    }
    render();save();
    if(t.dataset.action==='add-check')$('criterion-'+i.criteria.at(-1).id).focus();
    if(t.dataset.action==='remove')$('workspace').focus();
  });
  $('add-item').addEventListener('click',()=>{if(state.items.length>=C.LIMIT.items)return;const i=C.newItem();state.items.push(i);render();save();$('title-'+i.id).focus();});
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0],sequence=++importSequence;if(!file)return;
    const baseline=C.serialize(state);
    try{
      if(file.size>C.LIMIT.json)throw new Error('Choose a JSON worksheet no larger than 4MB.');
      const candidate=C.parse(await file.text());
      if(sequence!==importSequence)return;
      if(C.serialize(state)!==baseline)throw new Error('Worksheet changed while the file was loading. Import again after saving your edits.');
      propose(candidate);
    }catch(err){notice(err.message,true);}finally{e.target.value='';}
  });
  function download(text,type,extension){
    const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download='briefready-worksheet.'+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('Export prepared. Check your browser downloads and keep the JSON copy before closing.');
  }
  $('export-json').addEventListener('click',()=>{try{download(C.serialize(state),'application/json','json');}catch(e){notice(e.message,true);}});
  $('export-md').addEventListener('click',()=>{try{download(C.markdown(state),'text/markdown','md');}catch(e){notice(e.message,true);}});
  try{
    const stored=localStorage.getItem(KEY);if(stored){state=C.parse(stored);$('project-title').value=state.title;$('brief').value=state.brief;notice('Saved worksheet restored from this browser.');}
  }catch{notice('Saved browser data is unavailable or invalid. It has not been replaced. You can import a valid JSON copy.',true);}
  render();
})();
