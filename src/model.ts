export const W = 600, H = 740, PADDLE_Y = 673, R = 8;
export type Mode = 'ready' | 'playing' | 'paused' | 'between' | 'lost' | 'won';
export type Target = { x: number; y: number; w: number; h: number; hp: number; max: number; id: number };
export const names = ['Sinal', 'Desvio', 'Colmeia', 'Contrapeso', 'Ressonância'];
export function targetsFor(level: number): Target[] {
  const items: Target[] = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
    const patterns = [true, (row + col) % 3 !== 0, row % 2 === 0 || col % 2 === 0,
      Math.abs(col - 3) + row < 6, (row + col) % 2 === 0 || row === 3];
    if (!patterns[level]) continue;
    const hp = level > 1 && (row + col) % 3 === 0 ? 2 : 1;
    items.push({ x: 66 + col * 77, y: 142 + row * 48 + (level === 2 ? (col % 2) * 14 : 0),
      w: 64, h: 29, hp, max: hp, id: row * 7 + col });
  }
  return items;
}
export type Event = { kind: 'hit' | 'wall' | 'paddle' | 'flip' | 'life' | 'clear'; x: number; y: number; points?: number };
export class Machine {
  mode: Mode = 'ready'; previous: 'ready' | 'playing' = 'ready';
  level = 0; score = 0; lives = 5; combo = 0; gravity = 1; cooldown = 0;
  x = 300; y = PADDLE_Y - 21; vx = 0; vy = 0; paddle = 300; width = 112;
  targets = targetsFor(0); events: Event[] = []; elapsed = 0;
  get remaining() { return this.targets.filter(t => t.hp > 0).length; }
  move(x: number) { if (Number.isFinite(x)) this.paddle = Math.max(18 + this.width / 2, Math.min(W - 18 - this.width / 2, x)); }
  action() {
    if (this.mode === 'ready') {
      this.mode = 'playing'; this.vx = 155; this.vy = -390; this.gravity = 1;
    } else if (this.mode === 'playing' && this.cooldown <= 0) {
      this.gravity *= -1; this.cooldown = .8;
      this.events.push({kind:'flip',x:this.x,y:this.y});
    }
  }
  pause() { if (this.mode === 'playing' || this.mode === 'ready') { this.previous = this.mode; this.mode = 'paused'; } }
  resume() { if (this.mode === 'paused') this.mode = this.previous; }
  next() {
    if (this.mode !== 'between') return;
    this.level++; this.targets = targetsFor(this.level); this.width = 112 - this.level * 5;
    this.lives = Math.min(5, this.lives + 1); this.resetBall();
  }
  resetBall() { this.mode = 'ready'; this.x = this.paddle; this.y = PADDLE_Y - 21; this.vx = 0; this.vy = 0; this.gravity = 1; this.cooldown = 0; }
  step(dt: number) {
    if (this.mode === 'ready') { this.x = this.paddle; return; }
    if (this.mode !== 'playing') return;
    // Bound catch-up and substep high-speed motion; scene calls at 120 Hz.
    dt = Math.max(0, Math.min(dt, 1 / 30));
    this.elapsed += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / 4));
    for (let s = 0; s < steps && this.mode === 'playing'; s++) this.integrate(dt / steps);
  }
  private integrate(dt: number) {
    const oldX = this.x, oldY = this.y;
    this.vy += this.gravity * 135 * dt;
    // Keep useful vertical motion without allowing indefinite horizontal stalls.
    if (Math.abs(this.vy) < 42) this.vy = (this.vy < 0 ? -1 : 1) * 42;
    const speed = Math.hypot(this.vx, this.vy), cap = 560 + this.level * 24;
    if (speed > cap) { this.vx *= cap / speed; this.vy *= cap / speed; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.x < 18 + R) { this.x = 18 + R; this.vx = Math.abs(this.vx); this.event('wall'); }
    if (this.x > W - 18 - R) { this.x = W - 18 - R; this.vx = -Math.abs(this.vx); this.event('wall'); }
    if (this.y < 86 + R) { this.y = 86 + R; this.vy = Math.abs(this.vy); this.event('wall'); }
    if (this.vy > 0 && oldY + R <= PADDLE_Y && this.y + R >= PADDLE_Y && Math.abs(this.x - this.paddle) <= this.width / 2 + R) {
      const offset = Math.max(-1, Math.min(1, (this.x - this.paddle) / (this.width / 2)));
      this.vx = offset * 360; this.vy = -Math.sqrt((430 + this.level * 20) ** 2 - this.vx ** 2);
      this.y = PADDLE_Y - R; this.event('paddle');
    }
    for (const t of this.targets) {
      if (t.hp <= 0 || this.x + R <= t.x - t.w / 2 || this.x - R >= t.x + t.w / 2 || this.y + R <= t.y - t.h / 2 || this.y - R >= t.y + t.h / 2) continue;
      if (oldY + R <= t.y - t.h / 2) { this.y = t.y - t.h / 2 - R; this.vy = -Math.abs(this.vy); }
      else if (oldY - R >= t.y + t.h / 2) { this.y = t.y + t.h / 2 + R; this.vy = Math.abs(this.vy); }
      else if (oldX < t.x) { this.x = t.x - t.w / 2 - R; this.vx = -Math.abs(this.vx); }
      else { this.x = t.x + t.w / 2 + R; this.vx = Math.abs(this.vx); }
      t.hp--; this.combo++; const points = 100 * Math.min(5, 1 + Math.floor(this.combo / 4)); this.score += points;
      this.events.push({kind:'hit', x:t.x,y:t.y,points});
      if (!this.remaining) { this.mode = this.level === 4 ? 'won' : 'between'; this.event('clear'); }
      break;
    }
    if (this.y > H + R) {
      this.lives--; this.combo = 0; this.event('life');
      if (this.lives <= 0) this.mode = 'lost'; else this.resetBall();
    }
  }
  private event(kind: Event['kind']) { this.events.push({ kind, x:this.x, y:this.y }); }
}
export type Save = { version: 1; best: number; muted: boolean; reduced: boolean };
export function readSave(raw: string | null): Save {
  const fallback: Save = {version:1,best:0,muted:true,reduced:false};
  try { const v = JSON.parse(raw || 'null');
    if (v?.version !== 1) return fallback;
    return {version:1,best:Number.isSafeInteger(v.best) && v.best >= 0 ? Math.min(v.best, 99999999) : 0,
      muted:typeof v.muted === 'boolean' ? v.muted : true,reduced:typeof v.reduced === 'boolean' ? v.reduced : false};
  } catch { return fallback; }
}
