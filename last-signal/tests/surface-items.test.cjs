'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const THREE=globalThis.THREE=require('../vendor/three.min.js');
require('../js/state.js');require('../js/item-placement.js');require('../js/ground-items.js');
const {Model,ItemPlacement}=globalThis.LastSignal;
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
function setup(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.08,100),world={};camera.position.set(0,1.65,1.7);
 const bounds={minX:-5,maxX:5,minZ:-5,maxZ:5};let drops=[];
 const solver=new ItemPlacement({scene,camera,world,bounds,getDrops:()=>drops});
 const mesh=(x,y,z,w,h,d,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial());m.position.set(x,y,z);parent.add(m);return m;};
 mesh(0,-.11,0,10,.2,10);
 return {scene,camera,solver,mesh,world,setDrops:v=>{drops=v;},aim:(x,y,z)=>{const dx=x-camera.position.x,dz=z-camera.position.z;return {yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(y-camera.position.y,Math.hypot(dx,dz))};}};
}
test('surface height survives save/reload and pickup without changing legacy floor records',()=>{
 const saved=storage(),m=new Model({storage:saved});m.collect('photo');
 const p={x:1.1,y:1.01,z:-2.4,yaw:.2};assert.equal(m.dropItem('photo',p).ok,true);
 const restored=new Model({storage:saved});assert.deepEqual(restored.state.dropped,[{id:'photo',...p}]);
 assert.equal(restored.pickupItem('photo').ok,true);assert.equal(restored.state.inventory.filter(v=>v==='photo').length,1);
 restored.dropItem('photo',{x:0,z:0});assert.equal(Object.hasOwn(restored.state.dropped[0],'y'),false);
});
test('invalid surface heights cannot lose an owned item or survive save sanitization',()=>{
 const saved=storage(),m=new Model({storage:saved});m.collect('photo');
 for(const y of[-.01,2.401,NaN,Infinity,null,'1'])assert.equal(m.dropItem('photo',{x:0,y,z:0}).ok,false);
 saved.setItem(Model.SAVE_KEY,JSON.stringify({version:Model.SAVE_VERSION,state:{collected:['photo'],dropped:[{id:'photo',x:0,y:99,z:0}]}}));
 const restored=new Model({storage:saved});assert.deepEqual(restored.state.dropped,[]);assert.ok(restored.state.inventory.includes('photo'));
});
test('a whole item rests on a visible table even though walking underneath is blocked',()=>{
 const f=setup();f.mesh(0,.95,0,2,.1,1.5);f.solver.blocked=(x,z)=>Math.abs(x)<1&&Math.abs(z)<.75;
 const p=f.solver.find(f.aim(0,1,0));assert.ok(p);assert.ok(Math.abs(p.y-1)<1e-6);assert.ok(Math.abs(p.z)<1e-5);
});
test('aiming beside a table edge cannot leave an item floating over that edge',()=>{
 const f=setup();f.mesh(0,.95,0,2,.1,1.5);const p=f.solver.find(f.aim(.9,1,0));
 assert.ok(!p||p.y<.08,'an edge may fall back to safe floor placement');
});
test('flat shelf tops require clear volume, including narrow decorations between support probes',()=>{
 const f=setup();f.mesh(0,.95,0,2,.1,1.5);f.mesh(.14,1.09,.11,.035,.18,.035);
 const p=f.solver.find(f.aim(0,1,0));assert.ok(!p||p.y<.08);
});
test('a wall occludes a table, and the floor fallback stays on the player side',()=>{
 const f=setup();f.mesh(0,.95,-.8,2,.1,1.5);f.mesh(0,1,.65,4,2,.12);f.solver.blocked=(x,z)=>z<.75;
 const p=f.solver.find(f.aim(0,1,-.8));assert.ok(!p||(p.y<.08&&p.z>.75));
});
test('an instanced rotated tabletop uses the instance normal and its real height',()=>{
 const f=setup(),table=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),2);
 const m=new THREE.Matrix4().compose(new THREE.Vector3(0,.95,0),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.45),new THREE.Vector3(2,.1,1.5));table.setMatrixAt(0,m);
 table.setMatrixAt(1,new THREE.Matrix4().makeTranslation(4,1,4));f.scene.add(table);
 const p=f.solver.find(f.aim(0,1,0));assert.ok(p);assert.ok(Math.abs(p.y-1)<1e-6);
});
test('sloping furniture and moving mechanisms are not usable support platforms',()=>{
 for(const moving of[false,true]){
  const f=setup(),g=new THREE.Group();f.scene.add(g);f.mesh(0,.95,0,2,.1,1.5,g);
  if(moving)f.world.bookcase=g;else g.rotation.z=.4;
  const p=f.solver.find(f.aim(0,1,0));assert.ok(!p||p.y<.08);
 }
});
test('one surface never overlaps an existing item, while a lower floor item does not occupy the table',()=>{
 const f=setup();f.mesh(0,.95,0,2,.1,1.5);f.setDrops([{id:'key',x:0,y:1,z:0,yaw:.6}]);
 const crowded=f.solver.find(f.aim(0,1,0));assert.ok(!crowded||crowded.y<.08);
 f.setDrops([{id:'key',x:0,z:0,yaw:0}]);assert.ok(Math.abs(f.solver.find(f.aim(0,1,0)).y-1)<1e-6);
});
test('hand meshes, invisible hit boxes, and light sprites cannot become support or obstruction',()=>{
 const f=setup();f.mesh(0,.95,0,2,.1,1.5);
 const rig=new THREE.Group();rig.name='single-right-hand';f.scene.add(rig);f.mesh(0,1.3,.8,1,.1,1,rig);
 const hit=f.mesh(0,1.4,.7,1,.1,1);hit.material.transparent=true;hit.material.opacity=0;hit.material.colorWrite=false;
 const sprite=f.mesh(0,1.45,.6,1,.1,1);sprite.material.transparent=true;sprite.material.blending=THREE.AdditiveBlending;
 const p=f.solver.find(f.aim(0,1,0));assert.ok(p&&Math.abs(p.y-1)<1e-6);
});
test('a narrow clear shelf accepts a small key but refuses a square film that would hang over it',()=>{
 const f=setup();f.mesh(0,.95,0,1,.1,.3);
 const key=f.solver.find({...f.aim(0,1,0),itemId:'key'});assert.ok(key&&Math.abs(key.y-1)<1e-6);
 const film=f.solver.find({...f.aim(0,1,0),itemId:'acetate'});assert.ok(!film||film.y<.08);
});
test('paper and tool geometry touch a table after their short drop animation, without changing saved anchor height',()=>{
 const oldDocument=globalThis.document,oldImage=globalThis.Image;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};globalThis.Image=class{};
 try{
  for(const id of['photo','key','uv','fuse','cipher','lens']){
   const scene=new THREE.Scene(),ground=new globalThis.LastSignal.GroundItems({scene,world:{targets:[]},getItem:id=>({id,icon:''})});
   ground.sync({dropped:[{id,x:1,y:1.01,z:0}],photoOrder:[4,0,5,2,1,3]});ground.update(.4);
   const entry=ground.entries.get(id);scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(entry.visual);
   assert.ok(Math.abs(entry.root.position.y-1.03)<1e-6);assert.ok(Math.abs(box.min.y-1.014)<1e-6,id);
   ground.dispose();
  }
 }finally{globalThis.document=oldDocument;globalThis.Image=oldImage;}
});
