import {Chess} from './dist/vendor/chess.js';
import {parseGame} from './dist/model.js';
import {readFileSync,writeFileSync} from 'node:fs';
const initial=readFileSync('../../outputs/verified-game-through-28-Bg2.pgn','utf8');
const target=200;
const distance=(a,b)=>Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(Number(a[1])-Number(b[1])));
let winner;
for(let attempt=1;attempt<=24&&!winner;attempt++){
 let seed=attempt*7639;
 const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const chess=new Chess();chess.loadPgn(initial);
 for(let ply=55;ply<340;ply++){
  const list=chess.moves({verbose:true});let best,bestScore=-Infinity;
  const board=chess.board().flat().filter(Boolean),enemyKing=board.find(p=>p.type==='k'&&p.color!==chess.turn());
  for(const m of list){
   chess.move(m.san);
   const terminal=chess.isGameOver(),left=chess.board().flat().filter(Boolean).length;
   let score=random()*4;
   if(terminal&&ply+1<target)score-=10000;
   if(terminal&&ply+1>=target)score+=left<=4?10000:-1000;
   const urgency=ply<140?.65:2.4;
   if(m.captured)score+=urgency*(m.captured==='p'?3:5);
   if(m.piece==='p')score+=.9;
   if(m.promotion)score+=m.promotion==='n'?1:0;
   if(ply>140){
    // Both sides trade cooperatively, so the final sculpture loses almost all
    // its pieces. These are legal exhibition moves, not engine-best play.
    if(m.piece==='k'){
     const targets=board.filter(p=>p.color!==m.color&&p.type!=='k');
     if(targets.length)score+=(Math.min(...targets.map(p=>distance(m.from,p.square)))-Math.min(...targets.map(p=>distance(m.to,p.square))))*2;
    }else if(enemyKing){score+=(distance(m.from,enemyKing.square)-distance(m.to,enemyKing.square))*.65;if(distance(m.to,enemyKing.square)===1)score+=4;}
   }
   if(left>4&&chess.isCheckmate())score-=3000;
   chess.undo();
   if(score>bestScore){bestScore=score;best=m;}
  }
  if(!best)break;
  chess.move(best.san);
  if(chess.isGameOver()){
   const count=chess.board().flat().filter(Boolean).length;
   if(ply+1>=target&&count<=4){winner=chess;console.log('Found',attempt,ply+1,count,chess.isCheckmate()?'checkmate':'draw');}
   break;
  }
 }
}
if(!winner)throw Error('No suitable long game generated');
const result=winner.isCheckmate()?(winner.turn()==='w'?'0-1':'1-0'):'1/2-1/2';
winner.setHeader('Event','Long Endgame Visualization — Generated Example');winner.setHeader('White','White');winner.setHeader('Black','Black');winner.setHeader('Result',result);
const pgn=winner.pgn({maxWidth:84})+'\n';
const verified=parseGame(pgn);const alive=Object.values(verified.snapshots.at(-1)).filter(p=>p.alive);
console.log(JSON.stringify({halfMoves:verified.moves.length,fullMoves:Math.ceil(verified.moves.length/2),piecesLeft:alive.length,finalPosition:winner.fen(),result}));
writeFileSync('../../outputs/long-endgame-example.pgn',pgn);
console.log(pgn);
