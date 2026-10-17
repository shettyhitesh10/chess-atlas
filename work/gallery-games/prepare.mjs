import fs from 'node:fs';
import {parseGame, OPERA} from '../chess-atlas/dist/model.js';
const base='work/gallery-games/',out='outputs/reddit-gallery/games/';
const split=f=>fs.readFileSync(base+f,'utf8').replace(/\r/g,'').split(/(?=\[Event )/).filter(x=>x.trim());
const games={
 'carlsen-nepomniachtchi-2021-g6':split('world2021.pgn').find(x=>x.includes('[Round "6"]')),
 'kasparov-topalov-1999':split('wijk1999.pgn').find(x=>x.includes('[White "Kasparov, Gary"]')&&x.includes('[Black "Topalov, Veselin"]')),
 'short-timman-1991':split('tilburg1991.pgn').find(x=>x.includes('[White "Short, Nigel D"]')&&x.includes('[Black "Timman, Jan H"]')&&x.includes('Kg5')),
 'lasker-thomas-1912':fs.readFileSync(base+'lasker-thomas.pgn','utf8'),
 'opera-game-1858':OPERA
};
for(const [name,pgn]of Object.entries(games)){
 if(!pgn)throw Error('Not found '+name);
 const g=parseGame(pgn); fs.writeFileSync(out+name+'.pgn',pgn.trim()+'\n');
 const alive=g.pieces.filter(p=>!p.capturedAt).length;
 console.log(name,g.moves.length,'plies',alive,'pieces remaining',g.headers.White,g.headers.Black);
 console.log('Kings:',g.pieces.filter(p=>p.originalType==='k').map(p=>({id:p.id,squares:[...new Set(p.history.map(h=>h.square))]})));
}
