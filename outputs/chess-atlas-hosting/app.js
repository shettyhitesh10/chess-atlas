import {parseGame,OPERA,NAMES,SYMBOLS} from './model.js';
import {ChessScene} from './scene.js';
import {advancePlayback,BASE_MOVE_MS,togglePiece} from './playback.js';
const $=id=>document.getElementById(id);
$('smooth').checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let game=parseGame(OPERA),ply=game.moves.length,selected=new Set(['wqd1']);
let board=false,playing=false,direction=-1,frameId=null,lastTime=0,scene;
function toggleSelection(id){selected=togglePiece(selected,id);render();}
try{scene=new ChessScene($('viewport'),toggleSelection);$('loading').remove();}
catch(e){$('loading').textContent='3D rendering is unavailable. Please enable WebGL in your browser.';console.error(e);}
const fullName=p=>(p.color==='w'?'White':'Black')+' '+NAMES[p.originalType].toLowerCase();
const prefix=m=>m.before.split(' ')[5]+(m.color==='w'?'.':'…');
function installGame(next){pause();game=next;ply=game.moves.length;selected=new Set();setup();render({direct:true});scene?.reset(board);}
function setup(){
 $('game-title').textContent=game.headers.Event||'Untitled game';
 $('game-location').textContent=[game.headers.Site,game.headers.Date?.replace(/\.\?\?\.\?\?$/,'')].filter(s=>s&&s!=='?').join(' · ')||'Your imported game';
 $('white-name').textContent=game.headers.White||'White';$('black-name').textContent=game.headers.Black||'Black';
 const score=({'1-0':['1','0'],'0-1':['0','1'],'1/2-1/2':['½','½']})[game.result]||['–','–'];
 $('white-score').textContent=score[0];$('black-score').textContent=score[1];$('timeline').max=game.moves.length;
 $('piece-select').replaceChildren(new Option('Add a piece…',''));
 for(const color of ['w','b']){
  const group=document.createElement('optgroup');group.label=color==='w'?'White pieces':'Black pieces';
  for(const p of game.pieces.filter(p=>p.color===color))group.append(new Option(`${SYMBOLS[color][p.originalType]} ${NAMES[p.originalType]} · ${p.start}`,p.id));
  $('piece-select').append(group);
 }
 $('move-list').replaceChildren();let row,number;
 game.moves.forEach((m,i)=>{
  const n=m.before.split(' ')[5];
  if(n!==number){row=document.createElement('div');row.className='move-row';const label=document.createElement('span');label.textContent=n;row.append(label);if(m.color==='b')row.append(document.createElement('span'));$('move-list').append(row);number=n;}
  const b=document.createElement('button');b.textContent=m.san;b.dataset.ply=i+1;b.setAttribute('aria-label',`${prefix(m)} ${m.san}`);b.onclick=()=>go(i+1);row.append(b);
 });
 $('move-total').textContent=`${game.moves.length} half-moves`;
}
function selectionUI(index){
 $('isolate').disabled=selected.size===0;$('clear').style.visibility=selected.size?'visible':'hidden';
 $('selection-count').textContent=selected.size?`${selected.size} path${selected.size===1?'':'s'} selected`:'All paths in view';
 const chips=[];
 for(const id of selected){
  const p=game.pieces.find(p=>p.id===id),chip=document.createElement('button');
  chip.className='piece-chip '+p.color;chip.textContent=`${SYMBOLS[p.color][p.originalType]} ${p.start} ×`;
  chip.setAttribute('aria-label',`Remove ${fullName(p)} ${p.start}`);chip.onclick=()=>toggleSelection(id);chips.push(chip);
 }
 $('selected-pieces').replaceChildren(...chips);
 const detail=$('piece-detail');detail.replaceChildren();
 const icon=document.createElement('span');icon.className='piece-icon';
 const text=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('p');text.append(title,desc);detail.append(icon,text);
 const id=[...selected].at(-1);
 if(id){
  const p=game.pieces.find(p=>p.id===id),s=game.snapshots[index][id];
  const moves=p.history.filter((h,i,a)=>h.ply<=index&&i>0&&h.square!==a[i-1].square).length;
  icon.textContent=SYMBOLS[p.color][s.type];title.textContent=fullName(p)+' · '+p.start;
  desc.textContent=s.alive?`${s.type!==p.originalType?'Promoted to '+NAMES[s.type].toLowerCase()+' · ':''}On ${s.square} · ${moves} move${moves===1?'':'s'}`:`Captured on ${p.captureSquare} · half-move ${p.capturedAt}`;
 }else{icon.textContent='✧';title.textContent='A whole game in view';desc.textContent='Add pieces to compare their journeys.';}
 for(const option of $('piece-select').options){
  const p=game.pieces.find(p=>p.id===option.value);
  if(p){const dead=p.capturedAt!==null&&p.capturedAt<=index;option.disabled=selected.has(p.id);option.textContent=`${SYMBOLS[p.color][p.originalType]} ${NAMES[p.originalType]} · ${p.start}${selected.has(p.id)?' · selected':dead?' · captured':''}`;}
 }
 $('piece-select').value='';
 for(const [color,id] of [['w','select-white'],['b','select-black']]){
  const all=game.pieces.filter(p=>p.color===color).every(p=>selected.has(p.id));
  $(id).textContent=`${all?'Clear':'Select'} ${color==='w'?'white':'black'}`;
 }
}
function playerUI(){
 $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
 $('playback-status').textContent=playing?`PLAYING ${direction<0?'↓':'↑'} · ${$('speed').value}×`:ply===game.moves.length?'END OF GAME':'READY TO EXPLORE';
 document.querySelector('.playback-state').classList.toggle('is-playing',playing);
}
function render({direct=false,ui=true}={}){
 const index=Math.max(0,Math.min(game.moves.length,Math.floor(ply+1e-8)));
 $('timeline').value=ply;$('ply-count').textContent=`${index} / ${game.moves.length} HALF-MOVES`;playerUI();
 if(ui){
  const m=game.moves[index-1];$('current-san').textContent=m?`${prefix(m)} ${m.san}`:'Starting position';
  $('turn-label').textContent=index===game.moves.length?(game.checkmate?`Checkmate · ${m.color==='w'?'White':'Black'} wins`:game.result==='1/2-1/2'?'Game ended · Draw':game.result==='1-0'?'Game ended · White wins':game.result==='0-1'?'Game ended · Black wins':'End of recorded game'):(m?(m.color==='w'?'Black':'White')+' to move':(game.moves[0]?.color==='b'?'Black':'White')+' to move');
  for(const id of ['first','previous'])$(id).disabled=ply<=0;
  for(const id of ['next','last'])$(id).disabled=ply>=game.moves.length;
  $('play').disabled=game.moves.length===0;
  document.querySelectorAll('[data-ply]').forEach(b=>{
   const active=+b.dataset.ply===index;b.classList.toggle('active',active);b.classList.toggle('future',+b.dataset.ply>index);
   if(active){b.setAttribute('aria-current','step');const list=$('move-list');if(b.offsetTop<list.scrollTop+list.offsetTop||b.offsetTop+b.offsetHeight>list.scrollTop+list.offsetTop+list.clientHeight)list.scrollTop=b.offsetTop-list.offsetTop-list.clientHeight/2;}
   else b.removeAttribute('aria-current');
  });
  selectionUI(index);
  $('space').classList.toggle('active',!board);$('board').classList.toggle('active',board);
  $('space').setAttribute('aria-pressed',String(!board));$('board').setAttribute('aria-pressed',String(board));
  $('height').disabled=board;document.querySelector('.time-caption').hidden=board;
  $('color-key').hidden=!($('path-colors').value==='side');
  document.querySelector('.explorer').classList.toggle('side-colors',($('path-colors').value==='side'));
 }
 const displayed=direct&&!$('smooth').checked?index:ply;
 scene?.update(game,displayed,selected,{direct:direct||playing,board,height:+$('height').value,pieceSize:+$('piece-size').value,smooth:$('smooth').checked,duration:Math.min(700,BASE_MOVE_MS/+$('speed').value*.8),twoColor:($('path-colors').value==='side'),isolate:$('isolate').checked&&selected.size>0,captured:$('captured').checked});
}
function go(n){pause();ply=Math.max(0,Math.min(game.moves.length,n));render();}
function pause(){playing=false;cancelAnimationFrame(frameId);frameId=null;playerUI();}
function tick(now){
 if(!playing)return;
 const elapsed=document.hidden?0:now-lastTime;lastTime=now;
 const previousIndex=Math.floor(ply),previousDirection=direction;
 const next=advancePlayback(ply,direction,elapsed,+$('speed').value,game.moves.length,$('playback-mode').value);
 ply=next.cursor;direction=next.direction;render({direct:true,ui:Math.floor(ply)!==previousIndex||direction!==previousDirection||next.done});
 if(next.done){pause();return;}
 frameId=requestAnimationFrame(tick);
}
function play(){
 if(playing){pause();return;}
 if(!game.moves.length)return;
 ply=scene?.cursor??ply;
 const mode=$('playback-mode').value;
 if(mode==='forward'){direction=1;if(ply>=game.moves.length)ply=0;}
 else if(mode==='reverse'){direction=-1;if(ply<=0)ply=game.moves.length;}
 else if(ply>=game.moves.length)direction=-1;else if(ply<=0)direction=1;
 playing=true;lastTime=performance.now();render({direct:true});frameId=requestAnimationFrame(tick);
}
$('play').onclick=play;
$('previous').onclick=()=>go(Math.ceil(ply)-1);$('next').onclick=()=>go(Math.floor(ply)+1);
$('first').onclick=()=>go(0);$('last').onclick=()=>go(game.moves.length);
$('timeline').oninput=e=>{pause();ply=+e.target.value;render({direct:true});};
$('piece-select').onchange=e=>{if(e.target.value){selected.add(e.target.value);render();}};
$('clear').onclick=()=>{selected=new Set();render();};
for(const [color,id] of [['w','select-white'],['b','select-black']])$(id).onclick=()=>{
 const side=game.pieces.filter(p=>p.color===color),all=side.every(p=>selected.has(p.id));
 for(const p of side)all?selected.delete(p.id):selected.add(p.id);render();
};
for(const id of ['captured','isolate','path-colors','smooth'])$(id).onchange=()=>render({direct:playing});
$('height').oninput=()=>{$('height-value').textContent=(+$('height').value).toFixed(1)+'×';render({direct:true});scene?.reset(board);};
$('piece-size').oninput=()=>{$('piece-size-value').textContent=(+$('piece-size').value).toFixed(2).replace(/0$/,'')+'×';render({direct:playing});};
$('speed').onchange=()=>{lastTime=performance.now();render({direct:playing});};
$('playback-mode').onchange=()=>{const mode=$('playback-mode').value;if(mode!=='bounce')direction=mode==='reverse'?-1:1;lastTime=performance.now();render({direct:playing});};
$('space').onclick=()=>{board=false;render({direct:true});scene?.reset(false);};
$('board').onclick=()=>{board=true;render({direct:true});scene?.reset(true);};$('reset').onclick=()=>scene?.reset(board);
$('fullscreen').onclick=async()=>{
 const explorer=document.querySelector('.explorer');
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(explorer.requestFullscreen)await explorer.requestFullscreen();else explorer.classList.toggle('theater-mode');}
 catch{explorer.classList.toggle('theater-mode');}
 fullscreenLabel();
};
const fullscreenLabel=()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement||document.querySelector('.theater-mode')?'Exit expanded player':'Expand player');};
document.addEventListener('fullscreenchange',fullscreenLabel);
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
$('import').onclick=()=>{pause();$('import-error').textContent='';$('import-dialog').showModal();};
$('help').onclick=()=>{pause();$('help-dialog').showModal();};
$('file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 if(file.size>1000000){$('import-error').textContent='Choose a file smaller than 1 MB.';return;}
 try{$('pgn').value=await file.text();$('file-name').textContent=file.name;$('import-error').textContent='';}
 catch{$('import-error').textContent='The file could not be read. Please try again.';}
};
$('load-game').onclick=()=>{try{installGame(parseGame($('pgn').value));$('import-dialog').close();}catch(e){$('import-error').textContent=e.message;}};
$('demo').onclick=()=>{installGame(parseGame(OPERA));$('import-dialog').close();};
window.addEventListener('keydown',e=>{
 if(document.querySelector('.theater-mode')&&e.key==='Escape'){document.querySelector('.explorer').classList.remove('theater-mode');fullscreenLabel();}
 if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;
 const actions={ArrowLeft:()=>go(Math.ceil(ply)-1),ArrowRight:()=>go(Math.floor(ply)+1),Home:()=>go(0),End:()=>go(game.moves.length),' ':play};
 if(actions[e.key]){e.preventDefault();actions[e.key]();}
});
setup();render({direct:true});
