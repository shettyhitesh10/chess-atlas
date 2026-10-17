import {Chess} from './vendor/chess.js';
export const OPERA = `[Event "The Opera Game"]
[Site "Paris, France"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke of Brunswick & Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5
6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5
11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6
15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
export const NAMES={p:'Pawn',n:'Knight',b:'Bishop',r:'Rook',q:'Queen',k:'King'};
export const SYMBOLS={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};
export function parseGame(pgn){
 if(!pgn.trim())throw Error('Paste a PGN game to begin.');
 if(pgn.length>1000000)throw Error('Please import one game under 1 MB.');
 if((pgn.match(/\[Event\s/g)||[]).length>1)throw Error('Please import one game at a time.');
 const chess=new Chess();
 try{chess.loadPgn(pgn);}catch(error){
  const invalid=/^Invalid move in PGN: (.+)/.exec(error.message||'');
  if(invalid){
   const fields=chess.fen().split(' '),number=fields[5],side=fields[1]==='w'?'.':'...';
   const token=invalid[1].slice(0,60);
   throw Error(`Cannot read ${number}${side} ${token}: this is not a legal move from the preceding position. Check this move and earlier notation. Put written comments inside {braces}.`);
  }
  throw Error('This PGN could not be read. Check the headers and starting position. '+String(error.message||'').slice(0,180));
 }
 const moves=chess.history({verbose:true}), headers=chess.getHeaders();
 const initial=new Chess(moves[0]?.before||chess.fen());
 const pieces=[], squares={};
 for(const row of initial.board())for(const p of row)if(p){const piece={id:p.color+p.type+p.square,color:p.color,originalType:p.type,start:p.square,history:[{ply:0,square:p.square,type:p.type}],capturedAt:null,captureSquare:null};pieces.push(piece);squares[p.square]=piece;}
 const snapshots=[Object.fromEntries(pieces.map(p=>[p.id,{square:p.start,type:p.originalType,alive:true}]))];
 moves.forEach((move,i)=>{
  const ply=i+1,piece=squares[move.from];
  if(!piece)throw Error('The game contains an inconsistent position.');
  if(move.captured){const captureSquare=move.flags.includes('e')?move.to[0]+move.from[1]:move.to;const victim=squares[captureSquare];if(!victim)throw Error('The game contains an inconsistent capture.');victim.capturedAt=ply;victim.captureSquare=captureSquare;delete squares[captureSquare];}
  delete squares[move.from];squares[move.to]=piece;
  if(move.flags.includes('k')||move.flags.includes('q')){const rank=move.from[1],from=(move.flags.includes('k')?'h':'a')+rank,to=(move.flags.includes('k')?'f':'d')+rank;const rook=squares[from];delete squares[from];squares[to]=rook;}
  const state={};
  for(const p of pieces){const square=Object.keys(squares).find(s=>squares[s]===p);const prev=p.history.at(-1);if(square){const type=p===piece?(move.promotion||prev.type):prev.type;p.history.push({ply,square,type});state[p.id]={square,type,alive:true};}else{if(p.capturedAt===ply)p.history.push({ply,square:p.captureSquare,type:prev.type});state[p.id]={square:p.captureSquare,type:prev.type,alive:false};}}
  move.pieceId=piece.id;snapshots.push(state);
 });
 return{headers,moves,pieces,snapshots,pgn,result:headers.Result||'*',checkmate:chess.isCheckmate()};
}
