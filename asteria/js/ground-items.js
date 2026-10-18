(function(global){
 'use strict';
 const NS=global.LastSignal=global.LastSignal||{};
 class GroundItems{
  constructor({scene,world,getItem}){this.scene=scene;this.world=world;this.getItem=getItem;this.entries=new Map();this.elapsed=0;}
  _material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.1,...extra});}
  _mesh(group,geometry,material,x,y,z,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=false;m.receiveShadow=true;group.add(m);return m;}
  _build(item){
   const T=THREE,g=new T.Group(),gold=this._material(0xcba963,{metalness:.65}),dark=this._material(0x293d43),cream=this._material(0xe0dac6),iron=this._material(0x9faeb0,{metalness:.55});g.userData.ownedMaterials=[gold,dark,cream,iron];
   if(item.id==='key'){
    this._mesh(g,new T.TorusGeometry(.075,.014,6,18),gold,-.10,.025,0,-Math.PI/2);
    this._mesh(g,new T.BoxGeometry(.23,.025,.027),gold,.06,.025,0);
    this._mesh(g,new T.BoxGeometry(.026,.025,.06),gold,.14,.025,.026);
    this._mesh(g,new T.BoxGeometry(.025,.025,.05),gold,.08,.025,.023);
   }else if(item.id==='fuse'){
    this._mesh(g,new T.CylinderGeometry(.04,.04,.22,12),cream,0,.046,0,0,0,Math.PI/2);
    for(const x of[-.12,.12])this._mesh(g,new T.CylinderGeometry(.045,.045,.04,12),iron,x,.046,0,0,0,Math.PI/2);
   }else if(item.id==='uv'){
    this._mesh(g,new T.CylinderGeometry(.035,.035,.24,12),dark,0,.046,0,0,0,Math.PI/2);
    this._mesh(g,new T.CylinderGeometry(.055,.055,.065,12),iron,.15,.046,0,0,0,Math.PI/2);
    this._mesh(g,new T.CircleGeometry(.045,16),this._material(0xa88bcd),.185,.046,0,0,Math.PI/2);
   }else if(item.id==='lens'||item.id==='cipher'){
    this._mesh(g,new T.TorusGeometry(.13,.017,6,24),gold,0,.025,0,-Math.PI/2);
    this._mesh(g,new T.CircleGeometry(.127,24),item.id==='lens'?this._material(0x9ecbd0,{transparent:true,opacity:.6,side:T.DoubleSide}):gold,0,.024,0,-Math.PI/2);
    if(item.id==='cipher'){this._mesh(g,new T.TorusGeometry(.085,.008,5,24),dark,0,.03,0,-Math.PI/2);this._mesh(g,new T.CylinderGeometry(.012,.012,.026,8),iron,0,.04,0);}
   }else{
    const ratio=NS.ItemArt?.aspect(item.id)||1.5,w=['stripA','stripB'].includes(item.id)?.40:.51,h=['stripA','stripB'].includes(item.id)?.18:w/ratio;
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768/ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#decfac';ctx.fillRect(0,0,canvas.width,canvas.height);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;
    const mat=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,transparent:['acetate','stripA','stripB'].includes(item.id),opacity:['acetate','stripA','stripB'].includes(item.id)?.86:1});
    this._mesh(g,new T.PlaneGeometry(w,h),mat,0,.023,0,-Math.PI/2);
    const src=NS.ItemArt?.url(item.id,item.state||{},item.icon)||this._iconURL(item.icon),img=new Image();img.onload=()=>{if(!g.userData.disposed){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);tex.needsUpdate=true;}};if(src?.startsWith('data:image/'))img.src=src;
   }
   return g;
  }
  _iconURL(icon){if(!icon)return null;if(icon.trim().startsWith('<svg'))return'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(icon.includes('xmlns=')?icon:icon.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'));const doc=new DOMParser().parseFromString(icon,'text/html');return doc.querySelector('img')?.getAttribute('src')||null;}
  sync(state){
   const drops=state.dropped||[],alive=new Set(drops.map(v=>v.id));
   for(const[id,e]of this.entries)if(!alive.has(id)){this._remove(e);this.entries.delete(id);}
   for(const d of drops){let e=this.entries.get(d.id);if(e){e.root.position.set(d.x,(d.y||0)+.02,d.z);e.root.rotation.y=d.yaw||0;continue;}
    const item=this.getItem(d.id);if(!item)continue;
    const root=new THREE.Group();root.name='ground-'+d.id;root.userData.groundItem=d.id;root.position.set(d.x,(d.y||0)+.02,d.z);root.rotation.y=d.yaw||0;
    const visual=this._build({...item,state});
    // Rest the actual lowest vertex on the support rather than floating the
    // paper and each differently shaped tool at a shared arbitrary offset.
    const box=new THREE.Box3().setFromObject(visual),restY=box.isEmpty()?0:-box.min.y-.016;visual.position.y=restY;root.add(visual);
    const hit=new THREE.Mesh(new THREE.BoxGeometry(.58,.15,.42),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.position.y=.07;root.add(hit);
    this.scene.add(root);const target={id:'ground:'+d.id,itemId:d.id,label:'',mesh:root,enabled:true,available:s=>(s.dropped||[]).some(v=>v.id===d.id)};this.world.targets.push(target);e={root,visual,target,restY,born:this.elapsed};this.entries.set(d.id,e);
   }
  }
  update(dt){this.elapsed+=dt;for(const e of this.entries.values()){const t=this.elapsed-e.born;e.visual.position.y=e.restY+(t<.32?Math.abs(Math.sin(t/.32*Math.PI))*Math.max(0,.12*(1-t/.32)):0);}}
  _remove(e){e.root.removeFromParent();e.visual.userData.disposed=true;this.world.targets=this.world.targets.filter(t=>t!==e.target);const geometries=new Set(),materials=new Set(),textures=new Set();e.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [...(o.userData.ownedMaterials||[]),...(Array.isArray(o.material)?o.material:o.material?[o.material]:[])]){materials.add(m);if(m.map)textures.add(m.map);}});for(const v of textures)v.dispose();for(const v of materials)v.dispose();for(const v of geometries)v.dispose();}
  dispose(){for(const e of this.entries.values())this._remove(e);this.entries.clear();}
 }
 NS.GroundItems=GroundItems;
})(globalThis);
