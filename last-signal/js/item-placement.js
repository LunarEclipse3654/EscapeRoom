(function (global) {
 'use strict';
 const NS=global.LastSignal=global.LastSignal||{};
 // Placement uses the rendered world, including batched instances, so a tabletop
 // does not need a second invisible platform that can drift away from its art.
 class ItemPlacement {
  constructor({scene,camera,world,blocked,bounds,getDrops}) {
   this.scene=scene;this.camera=camera;this.world=world;
   this.blocked=blocked||(()=>false);this.bounds=bounds||NS.Model?.DROP_BOUNDS;
   this.getDrops=getDrops||(()=>[]);this.ray=new THREE.Raycaster();
   this.normalMatrix=new THREE.Matrix3();this.instanceMatrix=new THREE.Matrix4();
  }
  _solidMaterial(material) {
   return !!material&&material.visible!==false&&material.colorWrite!==false&&
    material.blending!==THREE.AdditiveBlending&&(!material.transparent||material.opacity>=.18)&&
    // Painted floor shadows and glowing sprites have no physical thickness.
    !(material.transparent&&material.depthWrite===false&&!material.isMeshPhysicalMaterial);
  }
  _visible(mesh) {
   if(!mesh.isMesh||!mesh.geometry)return false;
   for(let p=mesh;p;p=p.parent)if(!p.visible||p.isCamera||p.userData?.groundItem||p.name==='single-right-hand'||p.userData?.noItemPlacement)return false;
   return (Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(m=>this._solidMaterial(m));
  }
  _portable(mesh) {
   const papers=NS.Model?.PAPERS||NS.Model?.PORTABLE||[];
   for(let p=mesh;p;p=p.parent)if(papers.includes(p.userData?.interactionId))return true;
   return false;
  }
  _movable(mesh) {
   const names=['bookcase','machineDoor','skyPanel','exitDoor','door','drawerGroup','cabinetDoor','safeDoor','pressureHatch','clockFaceGroup','booksCompartment'];
   for(let p=mesh;p;p=p.parent)if(names.some(name=>this.world?.[name]===p))return true;
   return false;
  }
  _prepare() {
   this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
   this.meshes=[];this.parts=[];
   this.scene.traverse(mesh=>{
    if(!this._visible(mesh))return;
    this.meshes.push(mesh);const g=mesh.geometry;if(!g.boundingBox)g.computeBoundingBox();
    if(!g.boundingBox||g.boundingBox.isEmpty())return;
    const count=mesh.isInstancedMesh?mesh.count:1;
    for(let i=0;i<count;i++){
     const matrix=mesh.matrixWorld.clone();
     if(mesh.isInstancedMesh){mesh.getMatrixAt(i,this.instanceMatrix);matrix.multiply(this.instanceMatrix);}
     this.parts.push({mesh,instanceId:mesh.isInstancedMesh?i:null,box:g.boundingBox.clone().applyMatrix4(matrix),portable:this._portable(mesh)});
    }
   });
  }
  _hits(origin,direction,far) {
   this.ray.set(origin,direction);this.ray.near=0;this.ray.far=far;
   return this.ray.intersectObjects(this.meshes,false).filter(h=>{
    const materials=h.object.material,material=Array.isArray(materials)?materials[h.face?.materialIndex||0]:materials;
    return this._solidMaterial(material);
   });
  }
  _normal(hit) {
   if(!hit.face)return new THREE.Vector3();
   const matrix=hit.object.matrixWorld.clone();
   if(hit.object.isInstancedMesh&&hit.instanceId!==undefined){hit.object.getMatrixAt(hit.instanceId,this.instanceMatrix);matrix.multiply(this.instanceMatrix);}
   return hit.face.normal.clone().applyMatrix3(this.normalMatrix.getNormalMatrix(matrix)).normalize();
  }
  _inside(x,z) {
   const b=this.bounds;return !b||(x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ);
  }
  _footprint(id) {
   const dimensions={key:[.4,.22],fuse:[.34,.15],uv:[.37,.17],lens:[.35,.35],cipher:[.35,.35],acetate:[.57,.57],stripA:[.46,.24],stripB:[.46,.24]};
   const size=dimensions[id]||((NS.Model?.PAPERS||NS.Model?.PORTABLE||[]).includes(id)?[.57,.40]:[.58,.42]);
   return {hw:size[0]/2,hd:size[1]/2};
  }
  _samples(point) {
   const c=Math.cos(point.yaw),s=Math.sin(point.yaw),samples=[],size=this._footprint(point.id||this.itemId);
   for(const x of[-size.hw,0,size.hw])for(const z of[-size.hd,0,size.hd])samples.push({x:point.x+x*c+z*s,z:point.z-x*s+z*c});
   return samples;
  }
  _overlapRect(point,box,pad=0) {
   const c=Math.cos(point.yaw),s=Math.sin(point.yaw),size=this._footprint(point.id||this.itemId),hw=size.hw+pad,hd=size.hd+pad;
   const bx=(box.min.x+box.max.x)/2,bz=(box.min.z+box.max.z)/2,ex=(box.max.x-box.min.x)/2,ez=(box.max.z-box.min.z)/2;
   const dx=bx-point.x,dz=bz-point.z;
   return Math.abs(dx)<ex+Math.abs(c)*hw+Math.abs(s)*hd&&
    Math.abs(dz)<ez+Math.abs(s)*hw+Math.abs(c)*hd&&
    Math.abs(dx*c-dz*s)<hw+Math.abs(c)*ex+Math.abs(s)*ez&&
    Math.abs(dx*s+dz*c)<hd+Math.abs(s)*ex+Math.abs(c)*ez;
  }
  _overlapDrop(a,b) {
   if(Math.abs((a.y||0)-(b.y||0))>=.18)return false;
   const axes=[-(a.yaw||0),-(b.yaw||0)],dx=b.x-a.x,dz=b.z-a.z;
   for(const angle of axes)for(const perpendicular of[0,Math.PI/2]){
    const c=Math.cos(angle+perpendicular),s=Math.sin(angle+perpendicular);
    const extent=p=>{const size=this._footprint(p.id||this.itemId);return(size.hw+.02)*Math.abs(Math.cos(p.yaw||0)*c-Math.sin(p.yaw||0)*s)+(size.hd+.02)*Math.abs(Math.sin(p.yaw||0)*c+Math.cos(p.yaw||0)*s);};
    if(Math.abs(dx*c+dz*s)>=extent(a)+extent(b))return false;
   }
   return true;
  }
  _supported(point,floor=false) {
   if(!Number.isFinite(point.y)||point.y<-.035||point.y>2.4)return false;
   for(const p of this._samples(point)){
    if(!this._inside(p.x,p.z)||(floor&&this.blocked(p.x,p.z)))return false;
    const hit=this._hits(new THREE.Vector3(p.x,point.y+.075,p.z),new THREE.Vector3(0,-1,0),.16)[0];
    if(!hit||this._portable(hit.object)||this._movable(hit.object)||this._normal(hit).y<.96||Math.abs(hit.point.y-point.y)>.024)return false;
   }
   for(const part of this.parts){
    const b=part.box;
    // Thin uncollected clues are occupied surfaces, even when their paper is
    // less than a millimetre above the table. Furniture itself ends at support.
    const low=part.portable?point.y-.005:point.y+.033;
    if(b.max.y<=low||b.min.y>=point.y+.18)continue;
    if(this._overlapRect(point,b,.008))return false;
   }
   return !(this.getDrops()||[]).some(d=>this._overlapDrop(point,d));
  }
  _lineClear(point) {
   const end=new THREE.Vector3(point.x,point.y+.09,point.z),delta=end.clone().sub(this.camera.position),distance=delta.length();
   const hit=this._hits(this.camera.position,delta.normalize(),Math.max(0,distance-.055))[0];
   return !hit;
  }
  find({yaw=0,pitch=0,itemId}={}) {
   if(!Number.isFinite(yaw)||!Number.isFinite(pitch))return null;
   this.itemId=itemId;
   this._prepare();
   const direction=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
   const hit=this._hits(this.camera.position,direction,3.1)[0];
   if(hit&&this._normal(hit).y>=.96&&!this._portable(hit.object)&&!this._movable(hit.object)){
    const point={x:hit.point.x,y:hit.point.y,z:hit.point.z,yaw};
    if(this._supported(point,point.y<.08)&&this._lineClear(point))return {...point,y:Math.max(0,point.y)};
   }
   // Preserve Q's original near-player floor drop when no usable top is aimed
   // at. The path is checked at walking height as well as against visible art.
   for(const distance of[.85,.65,1.08,.45])for(const turn of[0,.42,-.42,.8,-.8,1.25,-1.25]){
    const x=this.camera.position.x-Math.sin(yaw+turn)*distance,z=this.camera.position.z-Math.cos(yaw+turn)*distance;
    if(!this._inside(x,z)||this.blocked(x,z))continue;
    let clear=true;for(let n=1;n<=8;n++)if(this.blocked(this.camera.position.x+(x-this.camera.position.x)*n/8,this.camera.position.z+(z-this.camera.position.z)*n/8)){clear=false;break;}
    if(!clear)continue;
    const floor=this._hits(new THREE.Vector3(x,.09,z),new THREE.Vector3(0,-1,0),.14)[0];
    if(!floor||this._normal(floor).y<.96||floor.point.y>.08)continue;
    const point={x,y:floor.point.y,z,yaw:yaw+turn};
    if(this._supported(point,true)&&this._lineClear(point))return {...point,y:Math.max(0,point.y)};
   }
   return null;
  }
 }
 NS.ItemPlacement=ItemPlacement;
})(globalThis);
