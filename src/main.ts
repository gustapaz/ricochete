import Phaser from 'phaser';
import { Machine, W, H, PADDLE_Y, names, readSave, type Save } from './model';
import './style.css';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const arena = el('arena'), overlay = el('overlay'), primary = el<HTMLButtonElement>('primary'), secondary = el<HTMLButtonElement>('secondary');
let machine = new Machine(), started = false, helpOpen = false, accumulator = 0, oldMode = '', oldLevel = -1;
let save: Save;
try { save = readSave(localStorage.getItem('ricochete.save')); } catch { save = readSave(null); }
const mediaReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
save.reduced ||= mediaReduced;
function persist() { try { localStorage.setItem('ricochete.save', JSON.stringify(save)); } catch { /* Play remains available without storage. */ } }
function announce(message: string) { el('status').textContent = message; }
let audio: AudioContext | undefined;
function tone(freq: number, length = .07, type: OscillatorType = 'sine') {
  if (save.muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const o = audio.createOscillator(), g = audio.createGain(), now = audio.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(freq * .55, now + length);
    g.gain.setValueAtTime(.055, now); g.gain.exponentialRampToValueAtTime(.001, now + length);
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(now + length);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  } catch { /* Audio is optional; visual feedback is always available. */ }
}
function preferences() {
  el('sound').textContent = save.muted ? 'Som: desligado' : 'Som: ligado';
  el('sound').setAttribute('aria-pressed', String(!save.muted));
  el('effects').setAttribute('aria-pressed', String(save.reduced));
  el('effects').textContent = save.reduced ? 'Efeitos: reduzidos' : 'Reduzir efeitos';
  el('best').textContent = String(save.best).padStart(6,'0');
}
el('sound').onclick = () => { save.muted = !save.muted; preferences(); persist(); tone(440); };
el('effects').onclick = () => { save.reduced = !save.reduced; preferences(); persist(); };
preferences();
function panel(label: string, title: string, copy: string, button: string, foot: string, back = false) {
  overlay.hidden = false; overlay.dataset.kind = label === 'MANUAL DA MÁQUINA' ? 'manual' : 'standard'; el('panel-label').textContent = label; el('panel-title').textContent = title;
  el('panel-copy').textContent = copy; primary.textContent = button; el('panel-foot').textContent = foot;
  secondary.hidden = !back;
}
function focusArena() { arena.focus({preventScroll:true}); }
function pause() {
  if (!started || helpOpen) return;
  machine.pause(); left = right = false; accumulator = 0; sync(true);
}
function record() { if (machine.score > save.best) { save.best = machine.score; persist(); preferences(); } }
function sync(force = false) {
  el('score').textContent = String(machine.score).padStart(6,'0');
  el('lives').textContent = '● '.repeat(Math.max(0,machine.lives)).trim() || '—';
  el('combo').textContent = `×${Math.min(5, 1 + Math.floor(machine.combo / 4))}`;
  el('gravity').textContent = `GRAVIDADE ${machine.gravity > 0 ? '↓' : '↑'}${machine.cooldown > 0 ? ' · RECARGA' : ''}`;
  el('level').textContent = `${String(machine.level + 1).padStart(2,'0')} / ${names[machine.level].toUpperCase()}`;
  el<HTMLButtonElement>('action').disabled = !started || !['ready','playing'].includes(machine.mode);
  el('action').textContent = machine.mode === 'ready' ? 'Lançar pulso ↗' : 'Inverter gravidade ⇅';
  el<HTMLButtonElement>('pause').disabled = !started || helpOpen || !['ready','playing','paused'].includes(machine.mode);
  el('pause').textContent = machine.mode === 'paused' ? '▶' : 'Ⅱ';
  el('pause').setAttribute('aria-label',machine.mode === 'paused' ? 'Retomar jogo' : 'Pausar jogo');
  if (!started || helpOpen || (!force && oldMode === machine.mode && oldLevel === machine.level)) return;
  oldMode = machine.mode; oldLevel = machine.level;
  if (machine.mode === 'playing' || machine.mode === 'ready') {
    overlay.hidden = true;
    el('hint').textContent = machine.mode === 'ready' ? 'ESPAÇO OU BOTÃO PARA LANÇAR' : 'ARRASTE / ← → · ESPAÇO INVERTE';
    if (machine.mode === 'ready') announce(`Arena ${machine.level + 1}: ${names[machine.level]}. ${machine.lives} cargas. Lance o pulso.`);
  } else if (machine.mode === 'paused') {
    panel('TEMPO PARA RESPIRAR','O impulso espera.','A máquina está pausada. Seu pulso e suas cargas estão seguros.','Continuar ↗','P / ESC TAMBÉM RETOMA',true); announce('Jogo pausado.'); primary.focus({preventScroll:true});
  } else if (machine.mode === 'between') {
    record(); panel(`ARENA ${machine.level + 1} CONCLUÍDA`,'Belo desvio.',`${machine.score} pontos. Uma carga recuperada na próxima arena. Agora: ${names[machine.level + 1]}.`,'Próxima arena ↗','ALVOS COM MIOLO ESCURO PRECISAM DE 2 IMPACTOS',true); announce('Arena concluída.'); primary.focus({preventScroll:true});
  } else {
    record(); const won = machine.mode === 'won';
    panel(won ? 'CINCO ARENAS. UM FLUXO.' : 'FIM DO IMPULSO', won ? 'Você mudou o caminho.' : 'Todo fim é um rebote.',`${machine.score} pontos · arena ${machine.level + 1} de 5. ${won ? 'Máquina concluída. Consegue uma nova trajetória?' : 'Use as bordas do rebatedor para abrir os ângulos. Tente inverter antes da queda.'}`,'Jogar novamente ↗',`RECORDE LOCAL: ${save.best} PONTOS`,true);
    announce(won ? `Vitória. ${machine.score} pontos.` : `Fim de jogo. ${machine.score} pontos.`); primary.focus({preventScroll:true});
  }
}
function restart() { machine = new Machine(); started = true; helpOpen = false; accumulator = 0; left = right = false; trails = []; sparks = []; sync(true); focusArena(); }
primary.onclick = () => {
  tone(320,.11);
  if (helpOpen) { helpOpen = false; if (started) { sync(true); if (machine.mode === 'paused') primary.focus(); else focusArena(); } else showHome(); return; }
  if (!started || machine.mode === 'lost' || machine.mode === 'won') restart();
  else if (machine.mode === 'paused') { machine.resume(); sync(true); focusArena(); }
  else if (machine.mode === 'between') { machine.next(); trails = []; sync(true); focusArena(); }
};
function showHome() {
  started = false; helpOpen = false; machine = new Machine(); trails = []; sparks = [];
  panel('ARCADE DE PRECISÃO','O próximo impacto é seu.','Uma bola. Cinco arenas. Inverta a gravidade e faça o impossível voltar.','Ligar a máquina ↗','SEM CONTA. SÓ VOCÊ E O REBOTE.'); sync(); primary.focus({preventScroll:true});
}
secondary.onclick = showHome;
el('help').onclick = () => {
  if (started) machine.pause(); left = right = false; helpOpen = true;
  panel('MANUAL DA MÁQUINA','Mude a direção.','1. Mova com ← →, A/D ou arraste na arena. 2. Espaço ou botão lança o pulso e inverte a gravidade (recarga: 0,8 s). 3. Limpe os alvos das cinco arenas. As bordas do rebatedor abrem o ângulo. Alvos com miolo precisam de 2 acertos. Você tem 5 cargas; limpar uma arena devolve 1. P ou Esc pausa.','Entendi ↗','ÁUDIO OPCIONAL · RECORDE APENAS NESTE DISPOSITIVO');
  sync(); el('panel-title').style.fontSize = ''; primary.focus({preventScroll:true});
};
el('pause').onclick = () => { if (machine.mode === 'paused') { machine.resume(); sync(true); focusArena(); } else pause(); };
function action() { if (!started || helpOpen) return; machine.action(); sync(); focusArena(); }
el('action').onclick = action;
let left = false, right = false;
arena.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','a','A','d','D',' ','p','P','Escape'].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') right = true;
  if (!e.repeat && e.key === ' ') action();
  if (!e.repeat && (e.key.toLowerCase() === 'p' || e.key === 'Escape')) pause();
});
window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') left = false; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') right = false; });
arena.addEventListener('blur', () => { left = right = false; });
overlay.addEventListener('keydown', e => {
  if (!helpOpen && machine.mode === 'paused' && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
    e.preventDefault(); machine.resume(); sync(true); focusArena();
  }
});
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
let pointerActive = false;
function pointerMove(e: PointerEvent) { const rect = arena.getBoundingClientRect(); machine.move((e.clientX - rect.left) / rect.width * W); }
arena.addEventListener('pointerdown', e => { if (!started) return; pointerActive = true; arena.setPointerCapture(e.pointerId); pointerMove(e); focusArena(); });
arena.addEventListener('pointermove', e => { if (pointerActive || e.pointerType === 'mouse') pointerMove(e); });
arena.addEventListener('pointerup', () => pointerActive = false);
arena.addEventListener('pointercancel', () => pointerActive = false);

let trails: {x:number;y:number}[] = [];
let sparks: {x:number;y:number;life:number;kind:string;points?:number}[] = [];
const colors = {ink:0x1b2425,paper:0xede9df,red:0xe95033,blue:0x284cc3};
class PlayScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  create() {
    this.g = this.add.graphics();
    this.add.text(300, 385, 'R', {fontFamily:'Arial',fontSize:'210px',fontStyle:'bold',color:'#d7d3c9'}).setOrigin(.5).setAlpha(.8).setDepth(-1);
    this.add.text(300, 525, 'O CAMINHO SE FAZ NO REBOTE', {fontFamily:'monospace',fontSize:'8px',color:'#a19d93'}).setOrigin(.5);
  }
  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000,.05);
    accumulator = Math.min(accumulator + dt,.06);
    while (accumulator >= 1 / 120) {
      if ((machine.mode === 'ready' || machine.mode === 'playing') && !helpOpen) machine.move(machine.paddle + ((right ? 1 : 0) - (left ? 1 : 0)) * 550 / 120);
      machine.step(1/120); accumulator -= 1/120;
    }
    for (const event of machine.events.splice(0)) {
      if (event.kind === 'hit') tone(350 + (machine.combo % 7) * 70);
      if (event.kind === 'paddle') tone(170,.05,'triangle');
      if (event.kind === 'flip') tone(machine.gravity > 0 ? 240 : 480,.12,'triangle');
      if (event.kind === 'life') tone(95,.2,'triangle');
      if (event.kind === 'clear') tone(660,.3);
      if (event.kind !== 'wall') sparks.push({...event,life:1});
    }
    sparks = sparks.map(p => ({...p,life:p.life-dt*2.2})).filter(p => p.life > 0).slice(-24);
    if (machine.mode === 'playing' && !save.reduced) { trails.push({x:machine.x,y:machine.y}); if (trails.length > 15) trails.shift(); }
    else trails = [];
    this.draw(); sync();
  }
  draw() {
    const g = this.g; g.clear();
    g.lineStyle(1,colors.ink,.07);
    for (let x=30;x<W;x+=30) for(let y=110;y<650;y+=30) g.strokeCircle(x,y,.7);
    g.lineStyle(2,colors.ink,.8); g.strokeRect(18,86,W-36,H-131);
    g.lineStyle(1,colors.ink,.3);
    for(let y=100;y<660;y+=20){g.lineBetween(5,y,12,y);g.lineBetween(W-12,y,W-5,y);}
    // Visual gravity field remains informational, not a collision object.
    g.lineStyle(3,colors.blue,.2);
    for(let y=380;y<610;y+=70){ const d=machine.gravity*8; g.lineBetween(42,y-d,42,y+d);g.lineBetween(36,y,42,y+d);g.lineBetween(48,y,42,y+d); }
    for (const t of machine.targets) {
      if (t.hp <= 0) continue;
      g.fillStyle(colors.ink,1);g.fillRect(t.x-t.w/2+3,t.y-t.h/2+4,t.w,t.h);
      g.fillStyle(t.hp > 1 ? colors.blue : colors.red,1);g.fillRect(t.x-t.w/2,t.y-t.h/2,t.w,t.h);
      g.lineStyle(1,colors.ink,1);g.strokeRect(t.x-t.w/2,t.y-t.h/2,t.w,t.h);
      if(t.hp>1){g.fillStyle(colors.paper,.85);g.fillRect(t.x-13,t.y-3,26,6);g.fillStyle(colors.ink);g.fillRect(t.x-7,t.y-3,14,6);}
      if(t.max>1&&t.hp===1){g.lineStyle(2,colors.paper,.9);g.lineBetween(t.x-9,t.y-8,t.x+9,t.y+8);}
    }
    if (!save.reduced) for(let i=0;i<trails.length;i++){g.fillStyle(colors.red,(i/trails.length)*.4);g.fillCircle(trails[i].x,trails[i].y,2+i*.25);}
    for(const p of sparks){
      const radius=(1-p.life)*48;g.lineStyle(save.reduced ? 2 : 3, p.kind==='life'?colors.blue:colors.red,p.life);
      if(!save.reduced)g.strokeCircle(p.x,p.y,radius);
      else {g.lineBetween(p.x-10,p.y,p.x+10,p.y);}
    }
    g.fillStyle(colors.ink);g.fillRoundedRect(machine.paddle-machine.width/2+3,PADDLE_Y+4,machine.width,12,2);
    g.fillStyle(colors.blue);g.fillRoundedRect(machine.paddle-machine.width/2,PADDLE_Y,machine.width,12,2);
    g.fillStyle(colors.paper);g.fillRect(machine.paddle-10,PADDLE_Y+4,20,3);
    g.fillStyle(colors.ink);g.fillCircle(machine.x+2,machine.y+3,9);
    g.fillStyle(colors.paper);g.fillCircle(machine.x,machine.y,8);
    g.lineStyle(2,colors.ink);g.strokeCircle(machine.x,machine.y,8);
    g.fillStyle(colors.red);g.fillCircle(machine.x,machine.y,3);
    if(machine.mode==='ready'){g.lineStyle(1,colors.ink,.5);g.lineBetween(machine.x,machine.y-17,machine.x+27,machine.y-73);g.lineBetween(machine.x+27,machine.y-73,machine.x+14,machine.y-66);}
    if(machine.cooldown>0){g.lineStyle(3,colors.red,.8);g.beginPath();g.arc(machine.x,machine.y,16,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-machine.cooldown/.8));g.strokePath();}
  }
}
try {
  new Phaser.Game({type:Phaser.CANVAS,parent:'arena',width:W,height:H,backgroundColor:'#e7e3d9',scene:PlayScene,
    render:{antialias:true,pixelArt:false},audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},fps:{target:60},banner:false});
} catch {
  panel('NÃO FOI POSSÍVEL LIGAR','Vamos tentar de novo?','Seu navegador não conseguiu iniciar a área de desenho. Tente atualizar a página ou abrir em um navegador atual.','Recarregar ↗','NENHUM PROGRESSO LOCAL FOI APAGADO');
  primary.onclick=()=>location.reload();
}
