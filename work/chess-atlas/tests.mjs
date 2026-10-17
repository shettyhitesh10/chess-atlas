import assert from 'node:assert/strict';
import {parseGame,OPERA} from './dist/model.js';
const opera=parseGame(OPERA);
assert.equal(opera.moves.length,33);assert(opera.checkmate);assert.equal(opera.snapshots[33].wra1.alive,false);assert.equal(opera.snapshots[33].wrh1.square,'d8');
assert.equal(opera.snapshots[23].wra1.square,'d1');assert.equal(opera.snapshots[23].wke1.square,'c1');
const queen=opera.pieces.find(p=>p.id==='wqd1');assert.equal(queen.capturedAt,32);assert.equal(queen.captureSquare,'b8');assert.equal(queen.history.at(-1).ply,32);assert(opera.snapshots[31].wqd1.alive);assert(!opera.snapshots[32].wqd1.alive);
const ep=parseGame('1. e4 a6 2. e5 d5 3. exd6');assert.equal(ep.pieces.find(p=>p.id==='bpd7').captureSquare,'d5');assert.equal(ep.snapshots[5].wpe2.square,'d6');assert(!ep.snapshots[5].bpd7.alive);
const promotion=parseGame('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+');assert.equal(promotion.snapshots[1].wpa7.type,'q');assert.equal(promotion.snapshots[0].wpa7.type,'p');assert.equal(promotion.pieces.length,3);
const blackStart=parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/8/K7 b - - 0 23"]\n\n23... Kg8');assert.equal(blackStart.moves[0].color,'b');assert.equal(blackStart.snapshots[1].bkh8.square,'g8');
const annotated=parseGame('1. e4 {hello} e5 (1... c5) 2. Nf3 Nc6');assert.equal(annotated.moves.length,4);
assert.throws(()=>parseGame('1. e4 e5 2. Bh6'));assert.throws(()=>parseGame(''));assert.equal(parseGame('[Event "Empty"]\n\n*').moves.length,0);
for(const [i,s] of opera.snapshots.entries()){const alive=Object.values(s).filter(p=>p.alive);assert.equal(new Set(alive.map(p=>p.square)).size,alive.length,`unique squares at ${i}`);for(const p of opera.pieces){const hist=p.history.filter(h=>h.ply<=i);assert.equal(hist.at(-1).square,s[p.id].square);}}
console.log('Passed: Opera replay, captures, castling, en passant, promotion, FEN, annotations, invalid input, and every replay snapshot.');

// Motion and capture spacing checks use actual game states, including the busy
// d7 square in the Opera Game and a simultaneous castling move.
const {piecePose,trailPoints,sampleMotion,PIECE_HEIGHT,KNIGHT_ROTATION}=await import('./dist/motion.js');
const options={height:1.1,pieceSize:.9,board:false,captured:true};
const rook=opera.pieces.find(p=>p.id==='wra1'),king=opera.pieces.find(p=>p.id==='wke1');
for(const p of [rook,king]){const a=piecePose(opera,p,22,options),b=piecePose(opera,p,23,options),mid=piecePose(opera,p,22.5,options);assert.equal(mid.x,(a.x+b.x)/2);assert.equal(mid.z,(a.z+b.z)/2);assert.equal(mid.y,(a.y+b.y)/2);}
assert.equal(sampleMotion({from:5,to:4,start:0,duration:800},400).cursor,4.5);
assert.equal(sampleMotion({from:4,to:5,start:0,duration:800},400).cursor,4.5);
assert(sampleMotion({from:4,to:5,start:0,duration:800},800).done);
const pawn=ep.pieces.find(p=>p.id==='bpd7');assert.equal(piecePose(ep,pawn,4.5,options).death,.5);assert.equal(piecePose(ep,pawn,4.5,{...options,board:true}).opacity,.5);
const trail=trailPoints(opera,queen,31.5,1.1);assert.equal(trail.at(-1).y,31.5*(9.5/33)*1.1+.07);
for(const height of [.4,1.1,1.7])for(const pieceSize of [.55,.9,1.15])for(let ply=0;ply<=33;ply++){
 const opts={...options,height,pieceSize};
 for(const p of opera.pieces.filter(p=>p.capturedAt!==null&&p.capturedAt<=ply)){
  const pose=piecePose(opera,p,ply,opts),top=pose.y+PIECE_HEIGHT[pose.type]*pose.size;
  for(const q of opera.pieces.filter(q=>q!==p)){
   const state=opera.snapshots[ply][q.id];if(state.square!==p.captureSquare)continue;
   if(!state.alive&&q.capturedAt<p.capturedAt||state.alive){const other=piecePose(opera,q,ply,opts);const otherTop=other.y+PIECE_HEIGHT[other.type]*other.size;
    assert(top<other.y||otherTop<pose.y,`No overlap: ${p.id} / ${q.id}, ply ${ply}, height ${height}`);
   }
  }
 }
}
assert(Math.sin(KNIGHT_ROTATION.w)>0);assert(Math.sin(KNIGHT_ROTATION.b)<0);
console.log('Passed: forward/backward interpolation, castling motion, capture fades, fractional trails, knight direction, and capture spacing across all size/height settings.');

const {advancePlayback,BASE_MOVE_MS,togglePiece,pathColor}=await import('./dist/playback.js');
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} ≈ ${expected}`);
let result=advancePlayback(33,-1,85,10,33,'bounce');close(result.cursor,32);assert.equal(result.direction,-1);
result=advancePlayback(.5,-1,85,10,33,'bounce');close(result.cursor,.5);assert.equal(result.direction,1);
result=advancePlayback(32.5,1,85,10,33,'bounce');close(result.cursor,32.5);assert.equal(result.direction,-1);
assert.deepEqual(advancePlayback(32,1,850,10,33,'forward'),{cursor:33,direction:1,done:true});
assert.deepEqual(advancePlayback(1,-1,850,10,33,'reverse'),{cursor:0,direction:-1,done:true});
assert(advancePlayback(0,1,1000,10,0).done);
close(advancePlayback(0,1,BASE_MOVE_MS,10,33,'forward').cursor,10);
close(advancePlayback(0,1,BASE_MOVE_MS,1,33,'forward').cursor,1);
// Reflections must produce the same final time whether a display delivers one
// long frame or many short ones, including multiple trips through the game.
let small={cursor:18.2,direction:-1};
for(let i=0;i<600;i++)small=advancePlayback(small.cursor,small.direction,1000/60,10,33,'bounce');
const large=advancePlayback(18.2,-1,10000,10,33,'bounce');close(small.cursor,large.cursor);assert.equal(small.direction,large.direction);
const original=new Set(['wqd1']);const multi=togglePiece(original,'bqd8');assert.equal(original.size,1);assert.equal(multi.size,2);assert(multi.has('wqd1'));assert(multi.has('bqd8'));assert.equal(togglePiece(multi,'wqd1').size,1);
assert.equal(pathColor('w',false),pathColor('b',false));assert.notEqual(pathColor('w',true),pathColor('b',true));
for(const p of opera.pieces)for(const cursor of [0,4,15.5,23,31.5,33]){
 const flat=trailPoints(opera,p,cursor,1.1,true);assert(flat.every(v=>v.y===.095));
 for(let i=1;i<flat.length;i++)assert(flat[i].x!==flat[i-1].x||flat[i].z!==flat[i-1].z);
}
const moving=opera.pieces.find(p=>p.id==='wpe2');const boardTrail=trailPoints(opera,moving,.5,1.1,true);assert.equal(boardTrail.length,2);close(boardTrail.at(-1).z,1.5);assert.equal(trailPoints(opera,king,1.5,1.1,true).length,1);
console.log('Passed: multi-selection, side colors, board trails, continuous 10× timing, reverse playback, endpoint reflection, and frame-rate-independent looping.');

// Import diagnostics must retain the first failing move, including FEN-based
// move numbers, rather than showing an unexplained generic parse error.
assert.throws(()=>parseGame('1. e4 e5 2. Bh6'),/Cannot read 2\. Bh6/);
assert.throws(()=>parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/8/K7 b - - 0 23"]\n\n23... Kh1'),/Cannot read 23\.\.\. Kh1/);
assert.throws(()=>parseGame('1. e4 prose e5'),/Cannot read 1\.\.\. prose/);
assert.equal(parseGame('1. e4 {prose} e5 0-1').moves.length,2);
console.log('Passed: numbered illegal-move and unbraced-comment import diagnostics.');
