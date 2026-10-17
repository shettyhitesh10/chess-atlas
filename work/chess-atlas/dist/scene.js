import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {pathColor} from './playback.js';
import {piecePose,trailPoints,timeStep,sampleMotion,KNIGHT_ROTATION} from './motion.js';
const C={cream:0xcbd9e7,teal:0x487e9b,gold:0xd3edff};
export class ChessScene{
 constructor(host,onSelect){
  this.host=host;this.onSelect=onSelect;this.scene=new T.Scene();this.scene.fog=new T.FogExp2(0x071221,.009);
  this.camera=new T.PerspectiveCamera(40,1,.1,120);
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;host.append(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.minDistance=7;this.controls.maxDistance=45;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minPolarAngle=.08;
  this.scene.add(new T.HemisphereLight(0xbcd9fa,0x071021,1.2));
  const key=new T.DirectionalLight(0xd0e1ff,2.1);key.position.set(-6,15,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.normalBias=.03;this.scene.add(key);
  const fill=new T.DirectionalLight(0x6da4e1,1.7);fill.position.set(8,10,-9);this.scene.add(fill);
  const rim=new T.DirectionalLight(0xb5d5ff,1.3);rim.position.set(-7,4,-5);this.scene.add(rim);
  this.staticGroup=new T.Group();this.scene.add(this.staticGroup);this.pieceGroup=new T.Group();this.scene.add(this.pieceGroup);this.traceGroup=new T.Group();this.scene.add(this.traceGroup);this.tailGroup=new T.Group();this.scene.add(this.tailGroup);this.markers=new T.Group();this.scene.add(this.markers);
  this.makeBoard();this.makeStars();this.meshes=new Map();this.ray=new T.Raycaster();this.pointer=new T.Vector2();let down;
  host.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});host.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const rect=host.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObjects(this.pieceGroup.children.filter(o=>o.visible),true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.id)o=o.parent;if(o)this.onSelect(o.userData.id);}});
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.reset(false);
  this.renderer.setAnimationLoop(now=>{
   if(this.motion){const sample=sampleMotion(this.motion,now);this.cursor=sample.cursor;this.rebuild(this.current.game,this.cursor,this.current.selected,this.current.opts);if(sample.done)this.motion=null;}
   this.controls.update();this.renderer.render(this.scene,this.camera);
  });
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 reset(board){
  const total=board?0:9.5*(this.current?.opts.height??1.1),narrow=this.host.clientWidth/this.host.clientHeight<1;
  const distance=Math.max(1,total/10)*(narrow?1.24:1);this.camera.position.set(board?9:13,board?12:total*.5+8,board?12:18).multiplyScalar(distance);
  this.controls.target.set(0,board?0:total*.47,0);this.controls.update();
 }
 makeStars(){
  const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d'),gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(226,243,255,1)');gradient.addColorStop(.12,'rgba(192,223,255,.9)');gradient.addColorStop(.35,'rgba(111,174,255,.23)');gradient.addColorStop(1,'rgba(60,120,255,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);this.starTexture=new T.CanvasTexture(cv);
  const positions=[];let seed=901;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<190;i++){positions.push((random()-.5)*65,random()*31-3,-14-random()*25);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));this.scene.add(new T.Points(geometry,new T.PointsMaterial({color:0x94bee7,size:.22,map:this.starTexture,transparent:true,opacity:.42,depthWrite:false,blending:T.AdditiveBlending})));
 }
 star(position,size=.4,color=C.gold,group=this.traceGroup){
  const star=new T.Sprite(new T.SpriteMaterial({map:this.starTexture,color,transparent:true,opacity:.9,depthTest:false,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  star.position.copy(position);star.scale.setScalar(size);star.renderOrder=21;star.userData.sharedMap=true;group.add(star);
 }
 update(game,ply,selected,opts){
  const previous=this.current,from=this.cursor??ply;
  const canAnimate=!opts.direct&&previous&&previous.game===game&&previous.opts.board===opts.board&&previous.opts.height===opts.height&&opts.smooth&&Math.abs(ply-from)>0.001&&Math.abs(ply-from)<=2;
  this.current={game,ply,selected:new Set(selected),opts};
  if(canAnimate)this.motion={from,to:ply,start:performance.now(),duration:opts.duration??650};
  else{this.motion=null;this.cursor=ply;}
  this.rebuild(game,this.cursor,this.current.selected,opts);
 }
 drawTrail(data,chosen,color,hasSelection,group){
  if(data.length<2)return;
  const points=data.map(v=>new T.Vector3(v.x,v.y,v.z));
  const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:chosen?1:hasSelection?.13:.4,depthWrite:false}));group.add(line);
  if(!chosen)return;
  class Path extends T.Curve{getPoint(t,target=new T.Vector3()){const i=Math.min(points.length-2,Math.floor(t*(points.length-1)));return target.lerpVectors(points[i],points[i+1],t*(points.length-1)-i);}}
  for(const [radius,opacity] of [[.092,.05],[.052,.12],[.018,1]]){
   const tube=this.mesh(new T.TubeGeometry(new Path(),Math.max(2,(points.length-1)*3),radius,6,false),new T.MeshBasicMaterial({color,transparent:true,opacity,depthTest:false,depthWrite:false,blending:radius<.02?T.NormalBlending:T.AdditiveBlending,toneMapped:false}),group);
   tube.renderOrder=20;tube.castShadow=false;
  }
 }
 material(color,extra={}){return new T.MeshStandardMaterial({color,roughness:.3,metalness:.16,...extra});}
 mesh(geo,mat,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 label(text,x,y,z,scale=.5,color='#a9b79b'){
  const cv=document.createElement('canvas');cv.width=256;cv.height=96;const ctx=cv.getContext('2d');ctx.font='500 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,128,48);const tex=new T.CanvasTexture(cv);const mat=new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false});const s=new T.Sprite(mat);s.position.set(x,y,z);s.scale.set(scale,scale*.375,1);return s;
 }
 makeBoard(){
  const wood=this.material(0x0e1b2c,{roughness:.45}),brass=this.material(0x637a90,{metalness:.7,roughness:.28});
  this.mesh(new T.BoxGeometry(8.7,.36,8.7),wood,this.staticGroup,0,-.26,0);this.mesh(new T.BoxGeometry(8.75,.045,8.75),brass,this.staticGroup,0,-.12,0);this.mesh(new T.BoxGeometry(8.56,.08,8.56),wood,this.staticGroup,0,-.055,0);
  const light=this.material(0x60778c,{roughness:.52,metalness:.08}),dark=this.material(0x243e54,{roughness:.5,metalness:.1});
  this.boardMaterials=[wood,brass,light,dark];for(const mat of this.boardMaterials)mat.userData.baseColor=mat.color.clone();
  for(let file=0;file<8;file++)for(let rank=0;rank<8;rank++){this.mesh(new T.BoxGeometry(.992,.075,.992),(file+rank)%2?light:dark,this.staticGroup,file-3.5,0,3.5-rank);}
  for(let i=0;i<8;i++){this.staticGroup.add(this.label('abcdefgh'[i],i-3.5,.08,4.22,.32));this.staticGroup.add(this.label(String(i+1),-4.22,.08,3.5-i,.32));}
  const floor=this.mesh(new T.CircleGeometry(20,96),new T.ShadowMaterial({opacity:.18}),this.staticGroup,0,-.48,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  const axis=new T.BufferGeometry().setFromPoints([new T.Vector3(-4.65,0,-4.4),new T.Vector3(-4.65,10,-4.4)]);this.timeAxis=new T.Line(axis,new T.LineBasicMaterial({color:0x6181a5,transparent:true,opacity:.25}));this.staticGroup.add(this.timeAxis);
 }
 makePiece(type,color){
  const g=new T.Group();const mat=this.material(color==='w'?C.cream:C.teal,{roughness:.24,metalness:color==='w'?.13:.28});const accent=this.material(color==='w'?0xc7b480:0x9ab591,{metalness:.65,roughness:.3});g.userData.bodyMaterial=mat;g.userData.accentMaterial=accent;
  const lathe=pts=>this.mesh(new T.LatheGeometry(pts.map(p=>new T.Vector2(...p)),40),mat,g);
  lathe([[0,0],[.26,0],[.29,.035],[.29,.085],[.26,.12],[.22,.15],[.23,.18],[.23,.21],[.17,.24],[.13,.33],[.11,.47],[.15,.51],[.17,.54]]);
  this.mesh(new T.TorusGeometry(.255,.012,8,48),accent,g,0,.13).rotation.x=Math.PI/2;
  const ball=(r,x,y,z=0)=>this.mesh(new T.SphereGeometry(r,28,20),mat,g,x,y,z);
  if(type==='p'){ball(.16,0,.62);g.scale.setScalar(.81);}
  if(type==='b'){lathe([[0,.54],[.17,.54],[.13,.61],[.18,.68],[.13,.82],[.03,.96],[0,.98]]);ball(.047,0,.99);const slash=this.mesh(new T.BoxGeometry(.018,.14,.255),this.material(color==='w'?0x9b9e89:0x1d4539),g,0,.8,.015);slash.rotation.z=-.38;}
  if(type==='r'){lathe([[.15,.52],[.21,.56],[.21,.62],[.2,.66],[.23,.7],[.23,.82],[0,.82]]);for(let i=0;i<6;i++){let a=i*Math.PI/3;const m=this.mesh(new T.BoxGeometry(.115,.13,.12),mat,g,Math.cos(a)*.18,.87,Math.sin(a)*.18);m.rotation.y=-a;}}
  if(type==='q'||type==='k'){
   lathe([[.16,.54],[.14,.58],[.12,.65],[.13,.76],[.19,.79],[.19,.84],[.15,.88],[0,.88]]);
   if(type==='q'){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const spike=this.mesh(new T.ConeGeometry(.045,.18,12),mat,g,Math.cos(a)*.15,.94,Math.sin(a)*.15);ball(.036,Math.cos(a)*.15,1.04,Math.sin(a)*.15);}ball(.073,0,.97);}
   else{ball(.095,0,.94);this.mesh(new T.BoxGeometry(.065,.27,.07),mat,g,0,1.1);this.mesh(new T.BoxGeometry(.21,.065,.07),mat,g,0,1.12);}
  }
  if(type==='n'){
   const shape=new T.Shape();shape.moveTo(-.19,.5);shape.bezierCurveTo(-.24,.68,-.13,.93,.07,1);shape.lineTo(.12,1.09);shape.lineTo(.19,1.02);shape.lineTo(.2,.93);shape.lineTo(.32,.8);shape.lineTo(.29,.7);shape.lineTo(.18,.69);shape.lineTo(.08,.77);shape.lineTo(.04,.67);shape.lineTo(.17,.51);shape.closePath();
   const geo=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.028,bevelThickness:.035});this.mesh(geo,mat,g,0,0,-.09);
   for(const z of [-.127,.127])this.mesh(new T.SphereGeometry(.023,12,10),accent,g,.155,.89,z);
   g.rotation.y=KNIGHT_ROTATION[color];
  }
  g.scale.multiplyScalar(.71);g.userData.baseScale=g.scale.clone();return g;
 }
 coord(square,y){return new T.Vector3(square.charCodeAt(0)-97-3.5,y,3.5-(+square[1]-1));}
 clearGroup(group){for(const obj of [...group.children]){obj.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!o.userData.sharedMap)m.map?.dispose();m.dispose();}}});group.remove(obj);}}
 rebuild(game,ply,selected,opts){
  const scale=timeStep(game,opts.height),board=opts.board;
  this.timeAxis.visible=!board;this.timeAxis.scale.y=game.moves.length*scale/10;
  for(const mat of this.boardMaterials)mat.color.copy(mat.userData.baseColor).multiplyScalar(selected.size?(board?.42:.28):1);
  // Completed segments are reused between move boundaries. Only the growing
  // tip changes each frame, keeping many selected paths fluid at high speed.
  const floor=Math.floor(ply),traceKey=[floor,board,opts.height,opts.twoColor,opts.isolate,[...selected].sort().join(',')].join(':');
  const refresh=game!==this.traceGame||traceKey!==this.traceKey;
  if(refresh){this.clearGroup(this.traceGroup);this.traceGame=game;this.traceKey=traceKey;}
  this.clearGroup(this.tailGroup);this.clearGroup(this.markers);
  const ids=new Set(game.pieces.map(p=>p.id));for(const [id,m] of this.meshes)if(!ids.has(id)){this.pieceGroup.remove(m);this.meshes.delete(id);m.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  for(const p of game.pieces){
   const pose=piecePose(game,p,ply,opts),dead=pose.death>.99,chosen=selected.has(p.id),color=pathColor(p.color,opts.twoColor);
   let mesh=this.meshes.get(p.id);if(!mesh||mesh.userData.type!==pose.type){if(mesh){this.pieceGroup.remove(mesh);mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}mesh=this.makePiece(pose.type,p.color);mesh.userData.id=p.id;mesh.userData.type=pose.type;this.pieceGroup.add(mesh);this.meshes.set(p.id,mesh);}
   mesh.position.set(pose.x,pose.y,pose.z);mesh.scale.copy(mesh.userData.baseScale).multiplyScalar(pose.size);mesh.visible=pose.opacity>.001;
   const mat=mesh.userData.bodyMaterial;mat.emissive.setHex(chosen?color:0x000000);mat.emissiveIntensity=chosen?.28:0;
   mesh.traverse(o=>{if(o.isMesh){o.castShadow=pose.death<.01;o.material.transparent=pose.opacity<1;o.material.opacity=pose.opacity;o.material.depthWrite=pose.opacity>.95;}});
   if(chosen&&mesh.visible){const ring=this.mesh(new T.TorusGeometry(.29*pose.size,.012,8,48),new T.MeshBasicMaterial({color,depthTest:false,transparent:true,opacity:.8,toneMapped:false}),this.markers,pose.x,pose.y+.012,pose.z);ring.rotation.x=Math.PI/2;ring.renderOrder=20;}
   if(opts.isolate&&!chosen)continue;
   const base=trailPoints(game,p,floor,opts.height,board);
   const data=trailPoints(game,p,ply,opts.height,board);
   if(refresh){
    this.drawTrail(base,chosen,color,selected.size>0,this.traceGroup);
    if(chosen)for(let i=0;i<base.length;i++)if(i===0||base[i].moved)this.star(new T.Vector3(base[i].x,base[i].y,base[i].z),.34,color);
   }
   if(data.length>base.length)this.drawTrail(data.slice(-2),chosen,color,selected.size>0,this.tailGroup);
   if(chosen&&data.length){const tip=data.at(-1);this.star(new T.Vector3(tip.x,tip.y,tip.z),.48,color,this.tailGroup);}
   if(dead&&opts.captured&&!board){const v=this.coord(p.captureSquare,p.capturedAt*scale+.07);const ring=this.mesh(new T.TorusGeometry(.2*pose.size+.06,.009,6,32),new T.MeshBasicMaterial({color:chosen?color:0x658eae,transparent:true,opacity:.5}),this.markers,v.x,v.y,v.z);ring.rotation.x=Math.PI/2;}

  }
  if(!board){
   const top=ply*scale+.03;
   const outline=[[-4,top,-4],[4,top,-4],[4,top,4],[-4,top,4],[-4,top,-4]].map(v=>new T.Vector3(...v));this.markers.add(new T.Line(new T.BufferGeometry().setFromPoints(outline),new T.LineBasicMaterial({color:0x779dbb,transparent:true,opacity:.12})));
  }
  const key=String(board)+':'+game.moves.length+':'+opts.height;
  if(this.axisKey!==key){
   if(this.axisGroup){this.clearGroup(this.axisGroup);this.scene.remove(this.axisGroup);}this.axisGroup=new T.Group();this.scene.add(this.axisGroup);this.axisKey=key;
   if(!board){const ticks=new Set([0,Math.round(game.moves.length*.25),Math.round(game.moves.length*.5),Math.round(game.moves.length*.75),game.moves.length]);for(const t of ticks)this.axisGroup.add(this.label(t===0?'START':String(t)+' PLY',-5.2,t*scale+.12,-4.4,.7,'#6f8aa7'));}
  }
 }
}
