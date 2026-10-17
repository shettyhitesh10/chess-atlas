// One continuous clock drives both directions; reflection preserves overflow
// at the endpoints even at 10x or on a slower display.
export const BASE_MOVE_MS=850;
export function advancePlayback(cursor,direction,elapsed,speed,length,mode='bounce'){
 if(length<=0)return{cursor:0,direction,done:true};
 const distance=Math.max(0,elapsed)*speed/BASE_MOVE_MS;
 if(mode!=='bounce'){
  const sign=mode==='reverse'?-1:1,next=cursor+sign*distance;
  return{cursor:Math.max(0,Math.min(length,next)),direction:sign,done:sign>0?next>=length:next<=0};
 }
 const period=length*2,phase=direction<0?period-cursor:cursor;
 const next=((phase+distance)%period+period)%period;
 return{cursor:next<=length?next:period-next,direction:next<length?1:-1,done:false};
}
export function togglePiece(selection,id){const result=new Set(selection);result.has(id)?result.delete(id):result.add(id);return result;}
export const PATH_COLORS={moon:0xd3edff,w:0xffba66,b:0x63acff};
export function pathColor(side,twoColor){return twoColor?PATH_COLORS[side]:PATH_COLORS.moon;}
