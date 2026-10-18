/* Drawn interface controls. Physical evidence retains its original inscriptions. */
(function(NS){
 'use strict';
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const paths={
  eye:'<path d="M3 24S11 11 24 11 45 24 45 24 37 37 24 37 3 24 3 24Z"/><circle cx="24" cy="24" r="6"/>',
  hand:'<path d="M17 27V11a3 3 0 0 1 6 0v13-17a3 3 0 0 1 6 0v17-13a3 3 0 0 1 6 0v15-8a3 3 0 0 1 6 0v15c0 9-6 14-14 14-6 0-10-4-13-8L7 28c-3-5 2-8 5-5l5 4Z"/>',
  bag:'<path d="M17 14V9a7 7 0 0 1 14 0v5M12 14h24l4 29H8l4-29ZM9 26h30M18 26v8h12v-8M18 39h12"/>',
  notebook:'<path d="M11 7h28v36H11ZM5 12h12M5 21h12M5 30h12M5 39h12M22 14h10M22 22h10M22 30h7"/>',
  play:'<path d="M16 9 39 24 16 39Z"/>',pause:'<path d="M16 10v28M32 10v28"/>',close:'<path d="M12 12 36 36M36 12 12 36"/>',
  home:'<path d="M5 22 24 6 43 22M11 19v23h26V19M20 42V28h8v14"/>',
  enter:'<path d="M28 5h13v38H28M7 24h26M23 14l10 10-10 10"/>',
  reset:'<path d="M10 18a16 16 0 1 1-1 14M10 7v12H0"/>',
  undo:'<path d="M19 10 7 21l12 11M8 21h19c10 0 15 5 13 16"/>',
  back:'<path d="M20 10 6 24l14 14M7 24h34"/>',
  help:'<circle cx="24" cy="24" r="19"/><path d="M17 17c0-10 16-10 16 0 0 7-9 6-9 13M24 36h.1"/>',
  lever:'<path d="M7 38h34v6H7ZM24 37 34 12M27 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0ZM15 37v-9h13"/>',
  knob:'<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="5"/><path d="M24 8V3M24 45v-5M8 24H3M45 24h-5M12 12 8 8M36 36l4 4M12 36l-4 4M36 12l4-4"/>',
  wind:'<circle cx="21" cy="25" r="13"/><circle cx="21" cy="25" r="4"/><path d="M30 15 39 6M34 4l9 9M9 9l4 4M6 25H1M21 43v4"/>',
  valve:'<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="5"/><path d="M24 7v12M24 29v12M7 24h12M29 24h12M12 12l8 8M28 28l8 8M12 36l8-8M28 20l8-8"/>',
  rotate:'<path d="M10 16a17 17 0 1 1-1 14M10 5v12H0M24 17v7l8 5"/>',
  rotateLeft:'<g transform="translate(48 0) scale(-1 1)"><path d="M10 16a17 17 0 1 1-1 14M10 5v12H0M24 17v7l8 5"/></g>',
  lift:'<path d="m8 24 16-10 16 10-16 10ZM8 35l16 10 16-10M24 2v15M18 8l6-6 6 6"/>',
  layers:'<path d="m5 16 19-12 19 12-19 12ZM5 26l19 12 19-12M5 36l19 12 19-12"/>',
  film:'<path d="M9 6h27l5 5v31H7V11ZM13 11h5M13 37h5M30 11h5M30 37h5M18 17h12v14H18Z"/><circle cx="24" cy="24" r="3"/>',
  socket:'<circle cx="24" cy="24" r="17"/><path d="M12 24h24M18 19v10M30 19v10"/>',
  lens:'<circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="13"/><path d="M14 18c2-5 6-6 10-6"/>',
  antenna:'<path d="M24 44V22M17 44h14M18 21a8 8 0 0 1 12 0M11 15a18 18 0 0 1 26 0M5 9a27 27 0 0 1 38 0"/><circle cx="24" cy="24" r="3"/>',
  plus:'<path d="M24 10v28M10 24h28"/>',minus:'<path d="M10 24h28"/>',
  up:'<path d="m10 27 14-14 14 14M24 14v28"/>',down:'<path d="m10 21 14 14 14-14M24 34V6"/>',left:'<path d="m27 10-14 14 14 14M14 24h28"/>',right:'<path d="m21 10 14 14-14 14M34 24H6"/>',
  horizontal:'<path d="M5 24h38M12 17l-7 7 7 7M36 17l7 7-7 7"/>',vertical:'<path d="M24 5v38M17 12l7-7 7 7M17 36l7 7 7-7"/>',
  sound:'<path d="M5 18h9l12-10v32L14 30H5ZM33 16a13 13 0 0 1 0 16M39 9a23 23 0 0 1 0 30"/>',
  sensitivity:'<path d="M17 15a8 8 0 0 1 16 0v18a8 8 0 0 1-16 0ZM17 22h16M25 8v11M3 24h8M7 20l4 4-4 4M39 24h7M42 20l4 4-4 4"/>',
  motion:'<path d="M9 18c8-15 12 25 20 10s10 3 13 0M7 37 39 5"/>',
  graphics:'<path d="m24 3 19 11v21L24 46 5 35V14ZM5 14l19 11 19-11M24 25v21M14 9l19 11M14 19v21"/>',
  quality0:'<path d="M8 37V24h6v13M21 37V17h6v20M34 37V8h6v29" stroke-opacity=".4"/><path d="M7 13 13 7 19 13M13 7v14"/>',
  quality1:'<path d="M8 37V24h6v13M21 37V17h6v20M34 37V8h6v29"/>',
  quality2:'<path d="M8 37V24h6v13M21 37V17h6v20"/><path d="M34 37V8h6v29" stroke-opacity=".2"/>',
  quality3:'<path d="M8 37V24h6v13"/><path d="M21 37V17h6v20M34 37V8h6v29" stroke-opacity=".2"/>',
  door:'<path d="M9 44V5h27v39M15 43V12l16-4v36M24 27h2M4 44h40"/>',
  lock:'<rect x="10" y="20" width="28" height="24" rx="3"/><path d="M15 20V12a9 9 0 0 1 18 0v8M24 29v7"/>',
  rail:'<path d="M5 33h38M5 42h38M10 33v9M20 33v9M30 33v9M40 33v9M8 6h23v22H8ZM31 6l9 9v13h-9M13 11h13M13 17h13"/>',
  record:'<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="6" fill="currentColor"/>',
  footsteps:'<path d="M13 4c7 0 8 11 6 19L8 22C5 14 6 4 13 4ZM8 27l10 1-1 8H7ZM35 12c7 0 8 11 6 19l-11-1c-3-8-2-18 5-18ZM30 35l10 1-1 8H29Z"/>',
  diamond:'<path d="m24 3 18 21-18 21L6 24Z"/>',
  triangle:'<path d="M24 5 44 41H4Z"/>',circle:'<circle cx="24" cy="24" r="18"/>',
  moon:'<path d="M31 4a21 21 0 1 0 0 40 23 23 0 0 1 0-40Z" fill="currentColor"/>',
  star:'<path d="m24 3 6 14 15 2-11 10 3 16-13-8-13 8 3-16L3 19l15-2Z"/>',
  compass:'<circle cx="24" cy="24" r="19"/><path d="m31 11-3 17-17 9 9-17ZM24 1v7M24 40v7M1 24h7M40 24h7"/>',
  pencil:'<path d="m8 33 24-25 9 9-25 24-12 4ZM27 13l9 9M8 33l8 8M4 45l6-1-5-5"/>',
  keyboard:'<rect x="3" y="11" width="42" height="28" rx="3"/><path d="M9 18h3M18 18h3M27 18h3M36 18h3M9 25h3M18 25h3M27 25h3M36 25h3M14 33h20"/>',
  wheel:'<rect x="13" y="3" width="22" height="42" rx="11"/><path d="M13 21h22M24 3v18M24 8v7"/>',
  drop:'<path d="M24 3v24M16 19l8 8 8-8M8 34h32v10H8ZM13 34v-5M35 34v-5"/>',
  storage:'<path d="M5 7h38v34H5ZM5 18h38M5 30h38M18 7v34M30 7v34"/>',
  hotbar:'<path d="M3 17h42v15H3ZM10 17v15M17 17v15M24 17v15M31 17v15M38 17v15"/>',
  hour:'<circle cx="24" cy="24" r="18"/><path d="M24 10v14h10"/>',minute:'<circle cx="24" cy="24" r="18"/><path d="M24 7v17l-9 9"/>',
  lighthouse:'<path d="m16 42 4-24h8l4 24ZM17 18V9h14v9ZM14 9 24 2 34 9M12 42h24M3 8l9 3M36 11l9-3M4 20l8-3M36 17l8 3M19 30h10"/><path d="M3 46q7-6 14 0t14 0t14 0"/>',
  telescope:'<path d="m8 13 25-9 8 17-25 10ZM7 13l9 18-7 3L1 16ZM28 28l-6 17M28 28l12 15M28 28v17M33 4l8 17M30 8l7 15"/>',
 };
 function icon(name){return '<svg data-ui-icon="'+name+'" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.eye)+'</svg>';}
 const buttonIcons={start:'enter','new-game':'reset','reload':'reset','close-dialog':'close','dialog-notebook':'notebook','touch-use':'hand','inventory-close':'close','inventory-inspect':'eye','reference-close':'close','intro-ok':'eye','intro-guide':'help','guide-close':'close','notebook-back':'back','notebook-close':'notebook','note-back':'back','item-back':'bag','disc-back':'bag','disc-left':'rotateLeft','disc-right':'rotate','books-reset':'undo','books-check':'lever','overlay-turn':'rotate','overlay-lift':'lift','overlay-return':'layers','power-check':'lever','clock-check':'wind','scope-observe':'eye','freq-down':'minus','freq-up':'plus','radio-receive':'antenna','safe-back':'undo','safe-check':'knob','pressure-check':'valve','door-check':'knob','pause-guide':'help','pause-home':'home','resume':'play','cancel-new':'back','confirm-new':'reset','ending-explore':'footsteps','ending-home':'home','map-bag':'bag','map-study':'eye','sky-reset':'undo','sky-check':'rotate','blueprint-bag':'bag','lab-play':'record'};
 function picture(el,name){if(!el)return;const own=el.querySelector(':scope > svg[data-ui-icon]');if(own?.dataset.uiIcon===name&&el.childNodes.length===1)return;if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',(el.textContent||'').trim()||name);el.innerHTML=icon(name);el.classList.add('pictorial-button');}
 function quality(){const select=$('#quality');if(!select)return;select.classList.add('pictorial-native-quality');let group=$('#quality-pictures');if(!group){group=document.createElement('div');group.id='quality-pictures';group.className='quality-pictures';group.setAttribute('role','group');group.setAttribute('aria-label','그래픽 품질');for(const [i,v]of ['auto','high','medium','low'].entries()){const b=document.createElement('button');b.type='button';b.dataset.quality=v;b.setAttribute('aria-label',['자동 품질','높은 품질','보통 품질','낮은 품질'][i]);b.innerHTML=icon('quality'+i);b.onclick=()=>{select.value=v;select.dispatchEvent(new Event('change',{bubbles:true}));quality();};group.append(b);}select.after(group);}group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.quality===select.value)));}
 function controls(){const grid=$('.controls-grid');if(!grid||grid.dataset.drawn)return;grid.dataset.drawn='true';const diagrams=[['keyboard','footsteps'],['wheel','eye'],['keyboard','footsteps'],['keyboard','hand'],['keyboard','bag'],['wheel','hotbar'],['keyboard','eye'],['keyboard','notebook'],['keyboard','pause'],['keyboard','drop']];grid.innerHTML=diagrams.map(([a,b])=>'<div class="control-picture" aria-label="'+({footsteps:'이동',eye:'시점 또는 물건 관찰',hand:'물건 회수',bag:'인벤토리',hotbar:'핫바 선택',notebook:'기록',pause:'일시정지',drop:'내려놓기'}[b])+'">'+icon(a)+'<span class="pictorial-link"></span>'+icon(b)+'</div>').join('');}
 function apply(){
  for(const[id,name]of Object.entries(buttonIcons))picture($('#'+id),name);
  $$('button[data-action]').forEach(b=>picture(b,{inventory:'bag',notebook:'notebook',pause:'pause',controls:'help'}[b.dataset.action]||'eye'));
  $$('[title]').forEach(e=>{if(!e.closest('svg'))e.removeAttribute('title');});
  $$('[data-direction]').forEach(b=>picture(b,{N:'up',S:'down',E:'right',W:'left'}[b.dataset.direction]));
  $$('[data-pressure]').forEach(b=>picture(b,b.dataset.step==='1'?'plus':'minus'));
  $$('[data-move]').forEach(b=>picture(b,{forward:'up',back:'down',left:'left',right:'right'}[b.dataset.move]));
  $$('#cabinet-form button[type=submit]').forEach(b=>picture(b,'lever'));
  const mirror=$('#mirror-pause');if(mirror)picture(mirror,NS.app?.ui?.mirrorPaused?'play':'pause');
  $$('.axis-controls label').forEach((label,i)=>{if(!label.querySelector(':scope > svg[data-ui-icon]')){[...label.childNodes].forEach(n=>{if(n.nodeType===3)n.textContent='';});label.insertAdjacentHTML('afterbegin',icon(i?'vertical':'horizontal'));}});
  $$('.time-inputs label').forEach((label,i)=>{if(!label.querySelector(':scope > svg[data-ui-icon]')){[...label.childNodes].forEach(n=>{if(n.nodeType===3)n.textContent='';});label.querySelector('span')?.remove();label.insertAdjacentHTML('afterbegin',icon(i?'minute':'hour'));}});
  $$('.setting label').forEach(label=>picture(label,{quality:'graphics',volume:'sound',sensitivity:'sensitivity',motion:'motion'}[label.htmlFor]||'knob'));
  $$('#safe-slots > span').forEach(span=>{const name={'↑':'up','↓':'down','←':'left','→':'right'}[span.textContent];if(name)picture(span,name);else if(!span.querySelector('svg')&&span.textContent.trim())span.textContent='';});
  $$('.scope-cross').forEach(el=>picture(el,'plus'));
  $$('.drive-line > span').forEach((el,i)=>picture(el,i===2?'diamond':'knob'));
  const interaction=$('#interaction .key');if(interaction)picture(interaction,'hand');
  const heading=$('#heading');if(heading&&!heading.querySelector('svg'))heading.insertAdjacentHTML('afterbegin',icon('compass'));
  const h1=$('#title-screen h1');if(h1&&!h1.querySelector('svg'))h1.innerHTML=icon(NS.Art.names.map?'telescope':'lighthouse');
  const loading=$('.loading-mark');if(loading)picture(loading,'compass');
  const scratch=$('#scratch');if(scratch)scratch.removeAttribute('placeholder');
  const memo=$('label[for=scratch]');if(memo)picture(memo,'pencil');
  $$('.observations>div>span').forEach(el=>{const shape={'☾':'moon','△':'triangle','◇':'diamond','✶':'star'}[el.textContent];if(shape&&!el.querySelector('svg'))el.innerHTML=NS.Art.icon?NS.Art.icon(shape):icon(shape);});
  const view=$('#dialog')?.dataset.view;
  if(['intro','confirm'].includes(view)&&!$('#pictorial-scene'))$('#dialog-content').insertAdjacentHTML('afterbegin','<div id="pictorial-scene" class="pictorial-scene">'+icon(view==='confirm'?'reset':'compass')+'</div>');
  if(view==='ending'&&!$('#dialog-content .evidence-image')&&!$('#pictorial-scene'))$('#dialog-content').insertAdjacentHTML('afterbegin','<div id="pictorial-scene" class="pictorial-scene ending">'+icon('door')+icon('lighthouse')+'</div>');
  const labels=$$('.inventory-storage-label');labels.forEach((el,i)=>picture(el,i?'hotbar':'storage'));
  quality();controls();
 }
 let queued=false;
 const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;apply();});}});
 function start(){document.body.classList.add('pictorial-ui');apply();observer.observe(document.body,{childList:true,subtree:true});}
 NS.Pictorial={icon,apply,dispose(){observer.disconnect();}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window.LastSignal=window.LastSignal||{});
