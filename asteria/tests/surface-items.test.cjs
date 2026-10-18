'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../js/state.js');const Model=globalThis.LastSignal.Model;
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('all observation papers retain their surface height through save, reload, and pickup',()=>{
 const saved=storage(),m=new Model({storage:saved});
 for(const id of['map','journal','decoder']){m.collect(id);const p={x:9.3,y:.959,z:-1.9,yaw:.2};assert.equal(m.dropItem(id,p).ok,true);const r=new Model({storage:saved});assert.deepEqual(r.state.dropped.find(d=>d.id===id),{id,...p});assert.equal(r.pickupItem(id).ok,true);assert.equal(r.inventory().filter(v=>v.id===id).length,1);m.pickupItem(id);}
});
test('legacy floor saves remain compatible and malformed heights return papers to the bag',()=>{
 const saved=storage(),m=new Model({storage:saved});m.collect('map');m.dropItem('map',{x:0,z:0});assert.equal(Object.hasOwn(new Model({storage:saved}).state.dropped[0],'y'),false);
 for(const y of[-.1,2.401,NaN,Infinity,null,'1']){m.pickupItem('map');assert.equal(m.dropItem('map',{x:0,y,z:0}).ok,false);}
 saved.setItem(Model.SAVE_KEY,JSON.stringify({version:Model.VERSION,state:{collected:['map'],dropped:[{id:'map',x:0,y:8,z:0}]}}));
 const restored=new Model({storage:saved});assert.deepEqual(restored.state.dropped,[]);assert.equal(restored.inventory()[0].id,'map');
});
