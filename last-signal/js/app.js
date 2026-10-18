/* Browser adapter. The rule model, room, evidence art and interface are independent. */
(function(){
 'use strict';
 const NS=window.LastSignal=window.LastSignal||{},$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const storage=(()=>{try{const s=localStorage;s.setItem('ls-test','1');s.removeItem('ls-test');return s;}catch(_){return null;}})();
 let settings={quality:'auto',volume:.35,sensitivity:1,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
 try{settings={...settings,...JSON.parse(storage?.getItem('last-signal-settings')||'{}')};}catch(_){}
 settings.volume=Math.min(1,Math.max(0,Number(settings.volume)||0));settings.sensitivity=Math.min(2,Math.max(.3,Number(settings.sensitivity)||1));if(!['auto','high','medium','low'].includes(settings.quality))settings.quality='auto';
 let renderer,scene,camera,menuCamera,world,model,ui,handView,groundItems,itemPlacement,raycaster,rayCenter;
 let started=false,keys={},target=null,yaw=0,pitch=0,lastTime=0,lastRaf=0,renderElapsed=0,saveClock=0,frameClock=0,frames=0,qualitySamples=0,slowSamples=0,liveTime=0,targetClock=0,lastWorldState='';
 let dragging=false,pointerStart=null,dragDistance=0,touchMode=matchMedia('(pointer: coarse)').matches;
   class Sound {
    constructor(){ this.ctx=null; this.gain=null; this.ambient=null; }
    init(){
      try {
        if(!this.ctx){
          this.ctx=new (window.AudioContext||window.webkitAudioContext)();
          this.gain=this.ctx.createGain();this.gain.gain.value=settings.volume*.35;this.gain.connect(this.ctx.destination);
          const b=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate), d=b.getChannelData(0);
          let last=0; for(let i=0;i<d.length;i++){last=(last+Math.random()*.04-.02)/1.02;d[i]=last*2.5;}
          const n=this.ctx.createBufferSource();n.buffer=b;n.loop=true;
          const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=500;
          const g=this.ctx.createGain();g.gain.value=.11;n.connect(f);f.connect(g);g.connect(this.gain);n.start();this.ambient=n;
        }
        this.ctx.resume().catch(()=>{});
      } catch (_) {}
    }
    volume(){if(this.gain)this.gain.gain.setTargetAtTime(settings.volume*.35,this.ctx.currentTime,.1);}
    tone(f=500,t=.1,delay=0,type='sine',level=.18){
      if(!this.ctx||!this.gain)return;
      const o=this.ctx.createOscillator(),g=this.ctx.createGain(),now=this.ctx.currentTime+delay;
      o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level,now+.012);g.gain.exponentialRampToValueAtTime(.001,now+t);
      o.connect(g);g.connect(this.gain);o.start(now);o.stop(now+t+.03);
    }
    click(){this.tone(380,.06,0,'triangle',.07);}
    success(){[440,554,659].forEach((f,i)=>this.tone(f,.5,i*.13));}
    error(){this.tone(150,.18,0,'triangle',.15);}
    drop(){this.tone(170,.07,0,'triangle',.12);this.tone(110,.1,.045,'sine',.08);}
    pickup(){this.tone(580,.065,0,'triangle',.09);this.tone(810,.09,.055,'sine',.06);}
    signal(){[784,523,659].forEach((f,i)=>this.tone(f,.42,i*.7,'sine',.3));}
  }
  const sound = new Sound();
  const radioAudio=new NS.RadioAudio({sound,getVolume:()=>settings.volume});

 function saveSettings(){try{storage?.setItem('last-signal-settings',JSON.stringify(settings));}catch(_){}}
 let lookPending=false,lookRequest=0,lookResume=0;
 function unlock(){lookResume++;keys={};dragging=false;if(document.pointerLockElement)document.exitPointerLock();}
 function inventoryBusy(){return !!(ui?.bag?.isOpen||ui?.bag?.isDragging);}
 function canLook(){return started&&!ui.modal&&!inventoryBusy()&&!touchMode&&!document.hidden;}
 function showLookTip(){if(canLook()&&!document.pointerLockElement)$('#look-tip').classList.remove('hidden');}
 function requestLook(){
  if(!canLook()||document.pointerLockElement===renderer.domElement||lookPending)return;
  if(!renderer.domElement.requestPointerLock){showLookTip();return;}
  sound.init();lookPending=true;const request=++lookRequest;
  const failed=()=>{if(request!==lookRequest)return;lookPending=false;showLookTip();};
  try{const p=renderer.domElement.requestPointerLock();p?.then?.(()=>{if(request!==lookRequest)return;lookPending=false;if(!canLook()&&document.pointerLockElement===renderer.domElement)document.exitPointerLock();},failed);}catch(_){failed();}
 }
 function resumeLook(){
  keys={};const resume=++lookResume;
  // Let synchronous UI-to-UI transitions finish within this user gesture.
  queueMicrotask(()=>{if(resume!==lookResume||!started||ui.modal||inventoryBusy()||document.hidden)return;$('#viewport').focus({preventScroll:true});if(touchMode)$('#touch-controls').classList.remove('hidden');else requestLook();});
 }
 function resetPlayer(){camera.position.set(world.spawn.x,world.spawn.y,world.spawn.z);yaw=world.spawn.yaw||0;pitch=-.02;}
 function startGame(fresh=false){radioAudio.stop();if(fresh){model.reset();ui.bag?.resetLayout();resetPlayer();}ui.bag?.setOpen(false);ui.bag?.cancelDrag();started=true;ui.modal=null;ui.backTarget=null;$('#title-screen').classList.add('hidden');$('#dialog-layer').classList.add('hidden');$('#hud').classList.remove('hidden');sound.init();if(fresh)savePosition();if(touchMode)$('#touch-controls').classList.remove('hidden');ui.updateHUD();if(model.state.escaped){ui.ending();return;}if(model.state.elapsed<2&&!model.state.seen.length)ui.intro();else requestLook();}
 function home(){radioAudio.stop();ui.bag?.cancelDrag();ui.bag?.setOpen(false);model.save();savePosition();started=false;ui.modal=null;unlock();$('#dialog-layer').classList.add('hidden');$('#hud').classList.add('hidden');$('#touch-controls').classList.add('hidden');$('#title-screen').classList.remove('hidden');}
 function applyQuality(){qualitySamples=slowSamples=0;const cap={high:1.75,medium:1.2,low:.8,auto:1.5}[settings.quality];renderer.setPixelRatio(Math.min(devicePixelRatio||1,cap));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=settings.quality!=='low';renderer.shadowMap.needsUpdate=true;world.setQuality?.(settings.quality);}
 function overlaps(b,x,z){return x+.25>b.minX&&x-.25<b.maxX&&z+.25>b.minZ&&z-.25<b.maxZ;}
 function blocked(x,z){if(x< -4.65||x>4.65||z< -3.65||z>7.8)return true;if(z>4.65&&(!model.state.doorUnlocked||Math.abs(x)>(z<5.4?.66:1.12)))return true;return world.colliders.some(b=>overlaps(b,x,z))||(!model.state.doorUnlocked&&world.doorCollider&&overlaps(world.doorCollider,x,z));}
 function movement(dt){if(!started||ui.modal||inventoryBusy())return;yaw+=((keys.ArrowLeft?1:0)-(keys.ArrowRight?1:0))*dt*1.45;let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0);const len=Math.hypot(f,r);if(len){f/=len;r/=len;}const v=(keys.ShiftLeft||keys.ShiftRight?3.5:2.25)*dt,dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*v,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*v,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));for(let i=0;i<n;i++){if(!blocked(camera.position.x+dx/n,camera.position.z))camera.position.x+=dx/n;if(!blocked(camera.position.x,camera.position.z+dz/n))camera.position.z+=dz/n;}camera.position.y=world.spawn.y+(!settings.reducedMotion&&len?Math.sin(liveTime*9)*.018:0);camera.rotation.set(pitch,yaw,0,'YXZ');if(model.state.doorUnlocked&&!model.state.escaped&&camera.position.z>6.6){model.escape();ui.ending();}}
 function updateTarget(){if(!started||ui.modal||inventoryBusy()){target=null;return;}camera.updateMatrixWorld();raycaster.setFromCamera(rayCenter,camera);raycaster.far=3.1;const hits=raycaster.intersectObjects(world.targets.filter(t=>t.enabled!==false&&inventoryVisible(t.mesh)).map(t=>t.mesh),true);let next=null;if(hits.length){let p=hits[0].object;while(p&&!next){next=world.targets.find(t=>t.mesh===p);p=p.parent;}}target=next&&!groundOccluded(next)?next:null;$('#crosshair').classList.toggle('active',!!target);$('#interaction').classList.toggle('hidden',!target);}
 let dropOutline=null,dropOutlineId=null;
 function inventoryVisible(m){for(let p=m;p;p=p.parent)if(!p.visible)return false;return true;}
 function resolveWorldDrop(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||!started||ui.modal)return null;const element=document.elementFromPoint(x,y);if(!element?.closest('#viewport'))return null;const r=renderer.domElement.getBoundingClientRect(),v=new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),ray=new THREE.Raycaster();camera.updateMatrixWorld();ray.setFromCamera(v,camera);ray.far=3.1;const choices=world.targets.filter(t=>t.enabled!==false&&(!t.available||t.available(model.state))&&inventoryVisible(t.mesh)),hit=ray.intersectObjects(choices.map(t=>t.mesh),true)[0];if(!hit)return null;let p=hit.object,t=null;while(p&&!t){t=choices.find(v=>v.mesh===p);p=p.parent;}if(!t)return null;const obstacle=ray.intersectObjects(scene.children,true).find(v=>v.object.isMesh&&inventoryVisible(v.object)&&v.object.material?.blending!==THREE.AdditiveBlending);if(obstacle&&obstacle.distance<hit.distance-.045){let q=obstacle.object;while(q&&q!==t.mesh)q=q.parent;if(!q)return null;}return t.id;}
 function showWorldDrop(id){if(id===dropOutlineId)return;dropOutlineId=id;if(dropOutline){dropOutline.removeFromParent();dropOutline.geometry.dispose();dropOutline.material.dispose();dropOutline=null;}const t=world?.targets.find(t=>t.id===id);if(t){dropOutline=new THREE.BoxHelper(t.mesh,0xe4bf78);dropOutline.material.depthTest=false;dropOutline.material.transparent=true;dropOutline.material.opacity=.6;dropOutline.renderOrder=10;scene.add(dropOutline);}}
 function interact(){if(started&&!ui.modal&&!inventoryBusy()&&target){sound.init();if(target.itemId){const r=model.pickupItem(target.itemId);if(r.ok)sound.pickup();else sound.error();return;}sound.click();ui.interact(target.id);}}
 function dropHeld(){
  if(!started||ui.modal||ui.bag?.handBusy)return false;
  const held=ui.bag?.heldItem();if(!held)return false;
  camera.updateMatrixWorld();const position=itemPlacement.find({yaw,pitch,itemId:held});
  sound.init();if(!position){sound.error();return false;}
  const r=model.dropItem(held,position);if(r.ok)sound.drop();else sound.error();return r.ok;
 }
 function groundItem(id){const items=ui.inventoryItems(true);return items.find(v=>v.id===id);}
 function groundOccluded(hit){if(!hit?.itemId)return false;const obstacle=raycaster.intersectObjects(scene.children,true).find(v=>{if(!v.object.isMesh||!inventoryVisible(v.object)||v.object.material?.blending===THREE.AdditiveBlending)return false;for(let p=v.object;p;p=p.parent)if(p.name==='single-right-hand')return false;return true;});if(!obstacle)return false;let p=obstacle.object;while(p){if(p===hit.mesh)return false;p=p.parent;}const centerHit=raycaster.intersectObject(hit.mesh,true)[0];return !!centerHit&&obstacle.distance<centerHit.distance-.04;}
 function savePosition(){if(!camera||!started)return;try{storage?.setItem('last-signal:position:v2',JSON.stringify({x:camera.position.x,z:camera.position.z,yaw,pitch}));}catch(_){}}
 function frame(ms){requestAnimationFrame(frame);const rd=lastRaf?(ms-lastRaf)/1000:1/60;lastRaf=ms;if(document.hidden){lastTime=ms;renderElapsed=0;return;}const budget=(!started||ui.modal||inventoryBusy())?1/30:1/60;renderElapsed+=rd;if(renderElapsed+1e-5<budget)return;renderElapsed%=budget;const raw=lastTime?(ms-lastTime)/1000:1/60,dt=Math.min(.05,raw);lastTime=ms;liveTime+=dt;radioAudio.setView({active:started&&ui.modal==='radio',powered:model.state.powered,frequency:model.state.frequency,received:model.state.radioSolved,volume:settings.volume,hidden:document.hidden});if(started&&!ui.modal)movement(dt);if(started&&!['pause','controls','confirm','ending','intro'].includes(ui.modal)){model.tick(Math.min(raw,1));saveClock+=raw;if(saveClock>5){saveClock=0;model.save();savePosition();}}if(!started){menuCamera.position.set(.6,1.87,3.6);menuCamera.rotation.set(-.035,Math.sin(liveTime*.09)*.07-.11,0,'YXZ');}world.update(dt,liveTime,model.state);groundItems?.update(dt);if(handView){const held=ui.bag?.heldItem();handView.update(dt,liveTime,{item:ui.bag?.item(held)||null,visible:started&&!ui.modal&&!inventoryBusy(),moving:!!(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown),reducedMotion:settings.reducedMotion});}targetClock+=dt;if(targetClock>.065){targetClock=0;updateTarget();}renderer.render(scene,started?camera:menuCamera);frameClock+=raw;frames++;if(frameClock>=1){const c=[['N','북쪽'],['E','동쪽'],['S','남쪽'],['W','서쪽']][((Math.round(-yaw/(Math.PI/2))%4)+4)%4];$('#heading span').textContent=c[0];$('#heading small').textContent=c[1];NS.app.stats={fps:Math.round(frames/frameClock),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio()};if(settings.quality==='auto'&&started&&!ui.modal&&!inventoryBusy()){qualitySamples++;if(frames/frameClock<32)slowSamples++;if(qualitySamples>=5){if(slowSamples>=3&&renderer.getPixelRatio()>.8){renderer.setPixelRatio(Math.max(.8,renderer.getPixelRatio()-.25));renderer.setSize(innerWidth,innerHeight);}qualitySamples=slowSamples=0;}}frameClock=frames=0;}}
 function events(){
  $('#start').onclick=()=>startGame();
  const dropIcon='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M17 8h14v14H17zM24 24v12m-7-7 7 7 7-7M9 41h30"/></svg>';
  for(const container of[document.querySelector('.hud-tools'),document.querySelector('.inventory-header')])if(container){const button=document.createElement('button');button.type='button';button.className='drop-held-control';button.setAttribute('aria-label','손에 든 물건 평평한 표면에 내려놓기 (Q)');button.innerHTML=dropIcon;button.onclick=dropHeld;container.append(button);}
  document.addEventListener('keydown',e=>{if(!['KeyR','KeyQ','KeyI'].includes(e.code)||e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!started||ui.bag?.handBusy)return;const input=document.activeElement;if(/^(INPUT|TEXTAREA|SELECT)$/.test(input?.tagName)||input?.isContentEditable)return;if(ui.studyItem){if(e.code==='KeyR'||e.code==='KeyI'){e.preventDefault();ui.close();if(e.code==='KeyI')ui.bag.setOpen(true);}return;}if(ui.modal||e.code==='KeyI')return;e.preventDefault();if(e.code==='KeyQ')dropHeld();else{const held=ui.bag?.heldItem();if(held)ui.inspectItem(held);}},{capture:true});
  document.addEventListener('keydown',e=>{if(e.defaultPrevented)return;const textInput=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;if(!textInput&&started&&!ui.modal&&!ui.bag?.isOpen&&!ui.bag?.isDragging&&/^(Digit|Numpad)[1-9]$/.test(e.code)){e.preventDefault();ui.bag.selectHotbar(Number(e.code.slice(-1))-1);return;}if(e.code==='Escape'&&ui.bag?.cancelDrag()){e.preventDefault();return;}if(e.code==='KeyI'&&!textInput&&started&&!['intro','ending','pause','controls','confirm','error'].includes(ui.modal)){e.preventDefault();if(!e.repeat)ui.inventory();return;}if(e.code==='Escape'&&ui.bag?.isOpen){e.preventDefault();ui.bag.setOpen(false);return;}if(ui.modal||ui.bag?.isOpen){if(e.code==='Escape'){e.preventDefault();ui.close();return;}if(e.code==='Tab'){const nodes=[...document.querySelectorAll('#dialog-layer:not(.hidden) button:not(:disabled),#dialog-layer:not(.hidden) input:not(:disabled),#dialog-layer:not(.hidden) select,#dialog-layer:not(.hidden) textarea,#dialog-layer:not(.hidden) [data-inventory-drop],#inventory-panel:not(.hidden) button:not(:disabled),#inventory-bar:not(.hidden) button:not(:disabled)')].filter(x=>x.offsetParent!==null),i=nodes.indexOf(document.activeElement);if(nodes.length&&((e.shiftKey&&i<=0)||(!e.shiftKey&&(i<0||i===nodes.length-1)))){e.preventDefault();nodes[e.shiftKey?nodes.length-1:0].focus();}}return;}if(!started)return;if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;if(e.code==='KeyE')interact();if(e.code==='Tab')ui.notebook();if(e.code==='Escape')ui.pause();});
  addEventListener('wheel',e=>{if(!started||ui.modal||inventoryBusy()||e.ctrlKey||e.metaKey||Math.abs(e.deltaY)<1)return;const editing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;if(editing)return;e.preventDefault();ui.bag.cycleHotbar(e.deltaY);},{passive:false});
  document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('pointerlockchange',()=>{keys={};lookPending=false;if(document.pointerLockElement===renderer.domElement){if(!canLook())document.exitPointerLock();else $('#look-tip').classList.add('hidden');}else showLookTip();});document.addEventListener('pointerlockerror',()=>{lookPending=false;showLookTip();});
  document.addEventListener('mousemove',e=>{if(started&&!ui.modal&&!inventoryBusy()&&document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.002*settings.sensitivity;pitch=Math.max(-1.35,Math.min(1.35,pitch-e.movementY*.002*settings.sensitivity));}});
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{if(!started||ui.modal||inventoryBusy())return;if(e.pointerType==='touch'){touchMode=true;$('#touch-controls').classList.remove('hidden');}dragging=true;pointerStart={x:e.clientX,y:e.clientY};dragDistance=0;canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging||!started||ui.modal||inventoryBusy()||document.pointerLockElement)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;dragDistance+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004*settings.sensitivity;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.004*settings.sensitivity));pointerStart={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',()=>{if(!started||ui.modal||inventoryBusy())return;dragging=false;if(dragDistance<5){if(document.pointerLockElement&&target)interact();else requestLook();}});canvas.addEventListener('pointercancel',()=>dragging=false);
  $$('[data-move]').forEach(b=>{const key={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'}[b.dataset.move];b.onpointerdown=e=>{e.preventDefault();keys[key]=true;b.setPointerCapture(e.pointerId);};['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,()=>keys[key]=false));});const touchUse=$('#touch-use');touchUse.onpointerdown=e=>{e.preventDefault();interact();};touchUse.onkeydown=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();interact();}};
  addEventListener('resize',()=>{camera.aspect=menuCamera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();menuCamera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});addEventListener('blur',()=>{keys={};dragging=false;if(started&&!ui.modal)ui.pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){model.save();savePosition();keys={};sound.ctx?.suspend().catch(()=>{});if(started&&!ui.modal)ui.pause();}else sound.ctx?.resume().catch(()=>{});});addEventListener('beforeunload',()=>{model.save();savePosition();});
 }
 try{
  if(!window.THREE||!NS.Art||!NS.Model||!NS.World||!NS.UI)throw new Error('게임 파일을 읽지 못했습니다. 폴더 전체를 압축 해제한 뒤 실행해 주세요.');
  model=new NS.Model({storage});renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;$('#viewport').appendChild(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.08,100);menuCamera=camera.clone();world=new NS.World(scene);raycaster=new THREE.Raycaster();rayCenter=new THREE.Vector2(0,0);resetPlayer();
  try{const p=JSON.parse(storage?.getItem('last-signal:position:v2')||'null');if(p&&[p.x,p.z,p.yaw,p.pitch].every(Number.isFinite)&&!blocked(p.x,p.z)){camera.position.x=p.x;camera.position.z=p.z;yaw=p.yaw%(Math.PI*2);pitch=Math.max(-1.35,Math.min(1.35,p.pitch));}}catch(_){}
  ui=new NS.UI({model,storage,sound,radioAudio,settings,resolveWorldDrop,showWorldDrop,isStarted:()=>started,onStart:startGame,onHome:home,continueLook:requestLook,applyQuality,saveSettings,onOpen:()=>{unlock();$('#interaction').classList.add('hidden');$('#touch-controls').classList.add('hidden');$('#look-tip').classList.add('hidden');},onClose:resumeLook,onExplore:()=>{camera.position.set(0,world.spawn.y,3.7);yaw=Math.PI;pitch=0;}});
  groundItems=new NS.GroundItems({scene,world,getItem:groundItem});groundItems.sync(model.state);
  itemPlacement=new NS.ItemPlacement({scene,camera,world,blocked,bounds:NS.Model.DROP_BOUNDS,getDrops:()=>model.state.dropped});
  handView=new NS.HandView({camera,scene});document.body.classList.add('hand-view-active');
  NS.app={model,world,radioAudio,groundItems,itemPlacement,dropHeld,get hand(){return handView;},camera,renderer,scene,ui,stats:{},get target(){return target;},get modal(){return ui.modal;},get started(){return started;},setView(v){if(Number.isFinite(v.x)&&Number.isFinite(v.z)&&!blocked(v.x,v.z)){camera.position.x=v.x;camera.position.z=v.z;}if(Number.isFinite(v.yaw))yaw=v.yaw;if(Number.isFinite(v.pitch))pitch=Math.max(-1.35,Math.min(1.35,v.pitch));}};
  model.subscribe(()=>{ui.updateHUD();groundItems.sync(model.state);const k=[model.state.powered,model.state.doorUnlocked].join(':');if(k!==lastWorldState){lastWorldState=k;renderer.shadowMap.needsUpdate=true;}});applyQuality();events();ui.updateHUD();$('#loading').classList.add('hidden');$('#title-screen').classList.remove('hidden');
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();model.save();ui.open('error','화면이 잠시 중단되었습니다','<p>진행 상황은 저장되었습니다.</p><div class="actions"><button class="primary" id="reload">다시 불러오기</button></div>');$('#reload').onclick=()=>location.reload();});requestAnimationFrame(frame);
 }catch(e){$('#loading').innerHTML='<span class="loading-mark">✦</span><p>관측소를 열지 못했습니다.</p><p style="max-width:440px;line-height:1.9;letter-spacing:0">'+String(e.message).replace(/</g,'&lt;')+'<br>Chrome에서 다시 열어 주세요.</p>';console.error(e);}
})();
