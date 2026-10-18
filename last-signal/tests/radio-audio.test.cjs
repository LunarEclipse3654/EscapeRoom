'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../js/radio-audio.js');
const RadioAudio=globalThis.LastSignal.RadioAudio;
class Events {
  constructor(){this.handlers=new Map();this.hidden=false;}
  addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,new Set());this.handlers.get(name).add(fn);}
  removeEventListener(name,fn){this.handlers.get(name)?.delete(fn);}
  emit(name){for(const fn of this.handlers.get(name)||[])fn();}
  count(){return [...this.handlers.values()].reduce((n,v)=>n+v.size,0);}
}
function fixture(){
 const events=new Events(),doc=new Events(),ctx=new Events(),jobs=new Map();let timerId=0,initCount=0,volume=.4;
 Object.assign(ctx,{sampleRate:24000,currentTime:8,state:'running',sources:[],buffers:[],createBuffer(channels,length,rate){const data=new Float32Array(length),buffer={length,sampleRate:rate,duration:length/rate,getChannelData:()=>data};this.buffers.push(buffer);return buffer;},createGain(){return {gain:{value:0},connect(){},disconnect(){}};},createBiquadFilter(){return {frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};},createBufferSource(){const source={onended:null,started:0,stopped:0,disconnected:0,connect(){},disconnect(){this.disconnected++;},start(at=0){this.started++;this.startAt=at;},stop(){this.stopped++;},end(){this.onended?.();}};this.sources.push(source);return source;}});
 const sound={ctx:null,gain:null,init(){initCount++;this.ctx=ctx;this.gain=ctx.createGain();}};
 const timers={setTimeout(fn,delay){const id=++timerId;jobs.set(id,{fn,delay});return id;},clearTimeout(id){jobs.delete(id);}};
 const radio=new RadioAudio({sound,getVolume:()=>volume,timers,events,document:doc});
 return {radio,events,doc,ctx,sound,jobs,get initCount(){return initCount;},setVolume:v=>volume=v,runTimer(){const [id,job]=jobs.entries().next().value;jobs.delete(id);job.fn();}};
}
const active={active:true,powered:true,frequency:970,received:false};
test('an unpowered or closed receiver remains silent without initializing audio',()=>{
 const f=fixture();for(const view of [{},{active:true},{active:true,powered:false,frequency:1037,received:true}])f.radio.setView(view);
 assert.equal(f.initCount,0);assert.equal(f.radio.status.mode,'off');f.radio.dispose();
});
test('wrong or not-yet-received frequency produces a single continuous static source',()=>{
 const f=fixture();f.radio.setView(active);assert.equal(f.radio.status.mode,'static');const noise=f.ctx.sources[0];
 assert.equal(noise.loop,true);assert.ok(noise.buffer.duration>=2);
 for(let i=0;i<120;i++)f.radio.setView({frequency:i%2?1000:1037});
 assert.equal(f.ctx.sources.length,1);assert.equal(noise.stopped,0);f.radio.dispose();assert.equal(noise.stopped,1);
});
test('a received station replaces static with actual embedded English speech and never overlaps',()=>{
 const f=fixture();f.radio.setView(active);const noise=f.ctx.sources[0];f.radio.setView({frequency:1037,received:true});
 assert.equal(noise.stopped,1);assert.equal(f.radio.status.mode,'voice');assert.equal(f.radio.status.message,'QRUWK');assert.equal(RadioAudio.VOICE.text,'Q. R. U. W. K.');
 const voice=f.ctx.sources[1],samples=voice.buffer.getChannelData(0);assert.equal(voice.loop,false);assert.ok(voice.buffer.duration>3&&voice.buffer.duration<8);assert.ok(samples.some(v=>Math.abs(v)>.1));assert.equal(voice.buffer.sampleRate,12000);assert.equal(voice.startAt,8.16);
 for(let i=0;i<120;i++)f.radio.setView({frequency:1037,received:true});assert.equal(f.ctx.sources.length,2);
 voice.end();assert.equal(f.radio.status.mode,'waiting');assert.equal(f.jobs.size,1);assert.equal(f.jobs.values().next().value.delay,RadioAudio.REPEAT_GAP);assert.equal(f.ctx.sources.length,2);
 f.runTimer();assert.equal(f.radio.status.mode,'voice');assert.equal(f.ctx.sources.length,3);assert.equal(f.radio.status.playCount,2);f.radio.dispose();
});
test('detuning cuts the spoken transmission immediately and cancels pending repeats',()=>{
 const f=fixture();f.radio.setView({...active,frequency:1037,received:true});const first=f.ctx.sources[0];
 f.radio.setView({frequency:1036});assert.equal(first.stopped,1);assert.equal(first.onended,null);assert.equal(f.radio.status.mode,'static');assert.equal(f.jobs.size,0);
 f.radio.setView({frequency:1037});const next=f.ctx.sources.at(-1);next.end();assert.equal(f.jobs.size,1);f.radio.setView({frequency:1029});assert.equal(f.jobs.size,0);assert.equal(f.radio.status.mode,'static');f.radio.dispose();
});
test('power, mute, hidden state, blur, close, and suspended audio stop all radio sources',()=>{
 for(const gate of ['power','mute','viewHidden','documentHidden','blur','close','suspended']){
  const f=fixture();f.radio.setView({...active,frequency:1037,received:true});const voice=f.ctx.sources[0];
  if(gate==='power')f.radio.setView({powered:false});
  if(gate==='mute'){f.setVolume(0);f.radio.setView({});}
  if(gate==='viewHidden')f.radio.setView({hidden:true});
  if(gate==='documentHidden'){f.doc.hidden=true;f.doc.emit('visibilitychange');}
  if(gate==='blur')f.events.emit('blur');
  if(gate==='close')f.radio.stop();
  if(gate==='suspended'){f.ctx.state='suspended';f.ctx.emit('statechange');}
  assert.equal(f.radio.status.mode,'off',gate);assert.equal(voice.stopped,1,gate);assert.equal(f.jobs.size,0,gate);f.radio.dispose();
 }
});
test('focus and context restoration resume only an eligible open receiver',()=>{
 const f=fixture();f.radio.setView(active);f.events.emit('blur');assert.equal(f.radio.status.noise,false);f.events.emit('focus');assert.equal(f.radio.status.noise,true);
 f.ctx.state='suspended';f.ctx.emit('statechange');assert.equal(f.radio.status.mode,'off');f.ctx.state='running';f.ctx.emit('statechange');assert.equal(f.radio.status.mode,'static');
 f.radio.stop();f.events.emit('focus');assert.equal(f.radio.status.mode,'off');f.radio.dispose();
});
test('close during a repeat gap and disposal cannot resurrect old audio',()=>{
 const f=fixture();f.radio.setView({...active,frequency:1037,received:true});const first=f.ctx.sources[0],oldEnded=first.onended;first.end();const oldTimer=f.jobs.values().next().value.fn;
 f.radio.stop();assert.equal(f.jobs.size,0);oldTimer();oldEnded();assert.equal(f.ctx.sources.length,1);assert.equal(f.radio.status.mode,'off');
 f.radio.setView({...active,frequency:1037,received:true});assert.equal(f.radio.status.playCount,2);f.radio.replay();assert.equal(f.radio.status.playCount,3);assert.equal(f.ctx.sources[1].stopped,1);
 f.radio.dispose();assert.equal(f.events.count(),0);assert.equal(f.doc.count(),0);assert.equal(f.ctx.count(),0);assert.equal(f.radio.voiceBuffer,null);f.radio.setView(active);assert.equal(f.radio.status.mode,'off');
});
