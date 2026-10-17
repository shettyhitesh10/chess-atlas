// Pure geometry and interpolation helpers shared by the renderer and checks.
export const PIECE_HEIGHT={p:.449,b:.737,n:.796,r:.665,q:.765,k:.878};
export const KNIGHT_ROTATION={w:Math.PI/2,b:-Math.PI/2};
export const timeStep=(game,height)=>9.5/Math.max(game.moves.length,1)*height;
export const ease=t=>t*t*(3-2*t);
export function sampleMotion(motion,now){
 if(!motion)return null;
 const t=Math.min(1,Math.max(0,(now-motion.start)/motion.duration));
 return{cursor:motion.from+(motion.to-motion.from)*ease(t),done:t===1};
}
function endpoint(game,p,ply,opts){
 const state=game.snapshots[ply][p.id],step=timeStep(game,opts.height),dead=!state.alive;
 let size=opts.pieceSize??.9;
 const level=(dead?p.capturedAt:ply)*step+.07;
 if(dead&&!opts.board){
  // A memorial ends below its capture plane. Fit it between earlier memorials
  // on this square so consecutive captures cannot occupy the same volume.
  const earlier=game.pieces.filter(q=>q.id!==p.id&&q.captureSquare===p.captureSquare&&q.capturedAt<p.capturedAt&&q.capturedAt!==null);
  const previous=earlier.reduce((n,q)=>Math.max(n,q.capturedAt),0);
  const room=(p.capturedAt-previous)*step*.78;
  size=Math.min(size*.8,Math.max(Number.EPSILON,room)/PIECE_HEIGHT[state.type]);
 }
 return{x:state.square.charCodeAt(0)-100.5,z:4.5-Number(state.square[1]),y:opts.board?.05:dead?level-PIECE_HEIGHT[state.type]*size-Math.min(.035,step*.12):level,size,type:state.type,opacity:dead?(opts.board||!opts.captured?0:.58):1,death:dead?1:0};
}
export function piecePose(game,p,cursor,opts){
 const lo=Math.floor(cursor),hi=Math.min(game.moves.length,lo+1),f=cursor-lo;
 const a=endpoint(game,p,lo,opts),b=endpoint(game,p,hi,opts),result={type:a.type};
 for(const key of ['x','y','z','size','opacity','death'])result[key]=a[key]+(b[key]-a[key])*f;
 return result;
}
export function trailPoints(game,p,cursor,height,board=false){
 const step=timeStep(game,height),history=p.history.filter(h=>h.ply<=cursor);
 const points=history.map(h=>({x:h.square.charCodeAt(0)-100.5,y:h.ply*step+.07,z:4.5-Number(h.square[1]),moved:h.ply>0&&h.square!==p.history[h.ply-1]?.square}));
 const lo=Math.floor(cursor),f=cursor-lo;
 if(f>0&&(p.capturedAt===null||p.capturedAt>lo)){
  const a=game.snapshots[lo][p.id],b=game.snapshots[lo+1][p.id];
  points.push({x:a.square.charCodeAt(0)-100.5+(b.square.charCodeAt(0)-a.square.charCodeAt(0))*f,y:cursor*step+.07,z:4.5-Number(a.square[1])+(Number(a.square[1])-Number(b.square[1]))*f,moved:false});
 }
 if(board){
  const flattened=[];
  for(const point of points){const last=flattened.at(-1);if(!last||Math.abs(last.x-point.x)>1e-8||Math.abs(last.z-point.z)>1e-8)flattened.push({...point,y:.095});}
  return flattened;
 }
 return points;
}
