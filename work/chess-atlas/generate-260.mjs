import {Chess} from './dist/vendor/chess.js';
import {parseGame} from './dist/model.js';
import {readFileSync,writeFileSync} from 'node:fs';
const original=new Chess();original.loadPgn(readFileSync('supplied-260-opening.pgn','utf8'));
const prefix=original.history().slice(0,98);
let final;
for(let attempt=1;attempt<=32&&!final;attempt++){
 let seed=attempt*9187;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const c=new Chess();for(const m of prefix)c.move(m);
 for(let ply=98;ply<520;ply++){
  const options=c.moves({verbose:true}),before=c.board().flat().filter(Boolean),clock=Number(c.fen().split(' ')[4]);
  const king=before.find(p=>p.color!==c.turn()&&p.type==='k');
  let best,bestScore=-Infinity;
  for(const m of options){
   c.move(m.san);const pieces=c.board().flat().filter(Boolean),pawns=pieces.filter(p=>p.type==='p').length;
   const terminal=c.isGameOver();
   if(terminal&&ply+1<520){c.undo();continue;}
   if(terminal&&c.isCheckmate()){c.undo();continue;}
   let score=random()*6;
   if(m.captured)score+=12;
   if(pawns<2&&ply<440)score-=40;
   if(m.piece==='p'&&!m.captured)score-=clock<72?18:0;
   if(clock>=72&&(m.piece==='p'||m.captured))score+=70;
   if(ply>435&&m.captured)score+=18;
   if(m.piece!=='k'&&m.piece!=='p'&&king){const distance=Math.max(Math.abs(m.to.charCodeAt(0)-king.square.charCodeAt(0)),Math.abs(Number(m.to[1])-Number(king.square[1])));if(distance===1)score+=8;}
   if(ply>470&&pieces.length>4)score-=pieces.length*5;
   c.undo();if(score>bestScore){bestScore=score;best=m;}
  }
  if(!best)break;
  c.move(best.san);
  if(ply===519&&c.board().flat().filter(Boolean).length<=4)final=c;
 }
}
if(!final)throw Error('Unable to create the requested length');
final.setHeader('Event','260-move Simulation - Generated Continuation');
final.setHeader('Site','Chess Atlas');final.setHeader('Date','2026.10.17');final.setHeader('Round','1');
final.setHeader('White','White Simulation');final.setHeader('Black','Black Simulation');final.setHeader('Result','1/2-1/2');
final.setHeader('PlyCount','520');final.setHeader('Termination','Draw by agreement');
const pgn=final.pgn({maxWidth:88})+'\n';
const check=new Chess();check.loadPgn(pgn);
const replay=new Chess();for(const [i,m] of check.history().entries()){if(replay.isGameOver())throw Error('Premature game end before half-move '+(i+1));replay.move(m);}
const model=parseGame(pgn),survivors=Object.values(model.snapshots.at(-1)).filter(p=>p.alive);
if(check.history().length!==520||survivors.length>4)throw Error('Verification failed');
writeFileSync('../../outputs/legal-260-move-simulation.pgn',pgn);
console.log(JSON.stringify({halfMoves:check.history().length,piecesLeft:survivors.length,finalFEN:check.fen(),finalPieces:check.board().flat().filter(Boolean),earlyTermination:false}));
console.log(pgn);
