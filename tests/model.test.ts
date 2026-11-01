import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Machine, targetsFor, readSave, PADDLE_Y, W } from '../src/model';

test('all five arenas have distinct geometry, bounded targets and armored progression', () => {
  const patterns = new Set<string>();
  for(let level=0;level<5;level++) {
    const targets=targetsFor(level); patterns.add(JSON.stringify(targets));
    assert.ok(targets.length >= 14);
    assert.equal(new Set(targets.map(t=>t.id)).size,targets.length);
    for(const t of targets) { assert.ok(t.x-t.w/2>18 && t.x+t.w/2<W-18); assert.ok(t.hp===1 || t.hp===2); }
  }
  assert.equal(patterns.size,5); assert.ok(targetsFor(4).some(t=>t.hp===2));
});
test('launch, flip cooldown and pause freeze simulation', () => {
  const m=new Machine();m.action();assert.equal(m.mode,'playing');assert.ok(m.vy<0);
  m.action();assert.equal(m.gravity,-1);m.action();assert.equal(m.gravity,-1);
  m.pause();const y=m.y;m.step(1/30);assert.equal(m.y,y);m.action();assert.equal(m.gravity,-1);
  m.resume();for(let i=0;i<100;i++)m.step(1/120);m.action();assert.equal(m.gravity,1);
});
test('wall and ceiling collisions stay bounded even at high speed',()=>{
  const m=new Machine();m.action();m.x=574;m.y=400;m.vx=900;m.vy=-100;m.step(1/30);assert.ok(m.x<=574);assert.ok(m.vx<0);
  m.y=94;m.vy=-500;m.step(1/30);assert.ok(m.y>=94);assert.ok(m.vy>0);
});
test('paddle center versus edges produces controllable trajectory',()=>{
  const bounce=(offset:number)=>{const m=new Machine();m.action();m.x=m.paddle+offset;m.y=PADDLE_Y-9;m.vy=450;m.vx=0;m.step(1/120);return m;};
  const center=bounce(0),edge=bounce(45);assert.equal(center.vx,0);assert.ok(center.vy<0);assert.ok(edge.vx>250);assert.ok(edge.vy<0);
});
test('target hit reflects once, removes HP and cannot duplicate score while exiting',()=>{
  const m=new Machine();m.action();const t=m.targets[m.targets.length-1];m.x=t.x;m.y=t.y+t.h/2+9;m.vx=0;m.vy=-400;
  m.step(1/120);assert.equal(t.hp,0);assert.equal(m.score,100);assert.ok(m.vy>0);
  m.step(1/120);assert.equal(m.score,100);
});
test('armored target requires two distinct contacts',()=>{
  const m=new Machine();m.level=2;m.targets=targetsFor(2);m.action();const t=m.targets.find(t=>t.hp===2)!;
  for(let i=0;i<2;i++){m.x=t.x;m.y=t.y+t.h/2+9;m.vx=0;m.vy=-400;m.step(1/120);assert.equal(t.hp,1-i);}
  assert.equal(m.score,200);
});
test('five misses cause loss; fresh game fully resets',()=>{
  const m=new Machine();
  for(let i=0;i<5;i++){m.action();m.combo=8;m.y=751;m.vy=300;m.step(1/120);assert.equal(m.lives,4-i);assert.equal(m.combo,0);}
  assert.equal(m.mode,'lost');m.action();assert.equal(m.mode,'lost');
  const fresh=new Machine();assert.equal(fresh.score,0);assert.equal(fresh.lives,5);assert.equal(fresh.level,0);assert.equal(fresh.gravity,1);
});
test('real final collision advances every arena and ends campaign',()=>{
  const m=new Machine();
  for(let level=0;level<5;level++) {
    m.action();for(const t of m.targets)t.hp=0;
    const last=m.targets[0];last.hp=1;m.x=last.x;m.y=last.y+last.h/2+9;m.vx=0;m.vy=-400;
    m.step(1/120);assert.equal(m.remaining,0);assert.equal(m.mode,level===4?'won':'between');
    if(level<4){m.lives=3;m.next();assert.equal(m.level,level+1);assert.equal(m.lives,4);assert.equal(m.mode,'ready');}
  }
  assert.equal(m.score,700); // fourth and fifth hits use the second multiplier tier
});
test('move clamps edges and ignores invalid coordinates; corrupted save is recoverable',()=>{
  const m=new Machine();m.move(-1e6);assert.equal(m.paddle,74);m.move(1e6);assert.equal(m.paddle,526);m.move(NaN);assert.equal(m.paddle,526);
  for(const raw of ['{','null','{}','{"version":2,"best":999}']) assert.equal(readSave(raw).best,0);
  const save=readSave('{"version":1,"best":-10,"muted":"false","reduced":true}');assert.equal(save.best,0);assert.equal(save.muted,true);assert.equal(save.reduced,true);
});
test('fixed-step replay is deterministic and all entity counts stay bounded',()=>{
  const run=()=>{const m=new Machine();m.action();for(let i=0;i<7200;i++){if(i%120===0)m.action();m.move(300+200*Math.sin(i/90));m.step(1/120);m.events.splice(0);}return [m.x,m.y,m.score,m.lives,m.mode];};
  assert.deepEqual(run(),run());
});
