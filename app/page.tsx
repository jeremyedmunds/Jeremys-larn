"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Point = { x: number; y: number };
type Item = { id: string; name: string; glyph: string; kind: "heal" | "gold" | "cure"; amount: number } & Point;
type Monster = { id: string; name: string; glyph: string; hp: number; maxHp: number; attack: number; xp: number; gold: number } & Point;
type Floor = { tiles: string[][]; monsters: Monster[]; items: Item[]; stairs: Point; start: Point };
type Game = {
  floor: number; tiles: string[][]; monsters: Monster[]; items: Item[]; stairs: Point;
  player: Point & { hp: number; maxHp: number; attack: number; level: number; xp: number; gold: number; potions: number; hasCure: boolean };
  turn: number; status: "playing" | "won" | "dead"; log: string[];
};

const W = 41, H = 23, LAST_FLOOR = 5;
const dirs: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
};
const monsterTypes = [
  ["goblin", "g", 6, 2, 6, 3], ["orc", "o", 10, 3, 10, 6], ["troll", "T", 16, 4, 16, 10],
  ["wraith", "W", 20, 5, 22, 15], ["demon", "D", 28, 7, 35, 24],
] as const;

function rng(seed: number) { let n = seed >>> 0; return () => ((n = Math.imul(n ^ (n >>> 15), 1 | n), n ^= n + Math.imul(n ^ (n >>> 7), 61 | n), ((n ^ (n >>> 14)) >>> 0) / 4294967296)); }
function distance(a: Point, b: Point) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

function makeFloor(level: number, seed = Date.now()): Floor {
  const r = rng(seed + level * 9973);
  const tiles = Array.from({ length: H }, () => Array(W).fill("#"));
  const rooms: { x: number; y: number; w: number; h: number; cx: number; cy: number }[] = [];
  for (let tries = 0; tries < 140 && rooms.length < 10; tries++) {
    const w = 5 + Math.floor(r() * 7), h = 4 + Math.floor(r() * 5);
    const x = 1 + Math.floor(r() * (W - w - 2)), y = 1 + Math.floor(r() * (H - h - 2));
    if (rooms.some(q => x < q.x + q.w + 1 && x + w + 1 > q.x && y < q.y + q.h + 1 && y + h + 1 > q.y)) continue;
    const room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = ".";
    if (rooms.length) {
      const p = rooms[rooms.length - 1];
      const firstHorizontal = r() > .5;
      const carveH = (ax: number, bx: number, yy: number) => { for (let xx = Math.min(ax, bx); xx <= Math.max(ax, bx); xx++) tiles[yy][xx] = "."; };
      const carveV = (ay: number, by: number, xx: number) => { for (let yy = Math.min(ay, by); yy <= Math.max(ay, by); yy++) tiles[yy][xx] = "."; };
      if (firstHorizontal) { carveH(p.cx, room.cx, p.cy); carveV(p.cy, room.cy, room.cx); }
      else { carveV(p.cy, room.cy, p.cx); carveH(p.cx, room.cx, room.cy); }
    }
    rooms.push(room);
  }
  const start = { x: rooms[0].cx, y: rooms[0].cy }, last = rooms[rooms.length - 1];
  const stairs = { x: last.cx, y: last.cy }; tiles[stairs.y][stairs.x] = level === LAST_FLOOR ? "Ω" : ">";
  const occupied = new Set([`${start.x},${start.y}`, `${stairs.x},${stairs.y}`]);
  const spot = () => { let p: Point; do { const q = rooms[1 + Math.floor(r() * (rooms.length - 1))]; p = { x: q.x + Math.floor(r() * q.w), y: q.y + Math.floor(r() * q.h) }; } while (occupied.has(`${p.x},${p.y}`)); occupied.add(`${p.x},${p.y}`); return p; };
  const monsters: Monster[] = [];
  for (let i = 0; i < 5 + level * 2; i++) {
    const p = spot(), tier = Math.min(monsterTypes.length - 1, Math.max(0, level - 1 + (r() > .72 ? 1 : 0))), m = monsterTypes[tier];
    const hp = m[2] + Math.floor(r() * 4);
    monsters.push({ id: `m${level}-${i}-${seed}`, name: m[0], glyph: m[1], hp, maxHp: hp, attack: m[3], xp: m[4], gold: m[5], ...p });
  }
  const items: Item[] = [];
  for (let i = 0; i < 3; i++) items.push({ id: `p${level}-${i}-${seed}`, name: "healing potion", glyph: "!", kind: "heal", amount: 8, ...spot() });
  for (let i = 0; i < 3; i++) items.push({ id: `c${level}-${i}-${seed}`, name: "gold", glyph: "$", kind: "gold", amount: 3 + Math.floor(r() * 10), ...spot() });
  if (level === LAST_FLOOR) items.push({ id: `cure-${seed}`, name: "Potion of Dianthroritis", glyph: "✦", kind: "cure", amount: 1, x: stairs.x, y: stairs.y });
  return { tiles, monsters, items, stairs, start };
}

function freshGame(): Game {
  const f = makeFloor(1);
  return { floor: 1, tiles: f.tiles, monsters: f.monsters, items: f.items, stairs: f.stairs,
    player: { ...f.start, hp: 30, maxHp: 30, attack: 5, level: 1, xp: 0, gold: 0, potions: 1, hasCure: false },
    turn: 0, status: "playing", log: ["You enter the caverns beneath Larn.", "Find the cure. Return before time runs out."] };
}

function pushLog(g: Game, text: string) { g.log = [text, ...g.log].slice(0, 8); }

export default function Home() {
  const [game, setGame] = useState<Game>(() => freshGame());
  const [sound, setSound] = useState(false);

  const update = useCallback((fn: (g: Game) => void) => setGame(prev => { const g = structuredClone(prev); fn(g); return g; }), []);

  const act = useCallback((dx: number, dy: number) => update(g => {
    if (g.status !== "playing") return;
    const nx = g.player.x + dx, ny = g.player.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || g.tiles[ny][nx] === "#") { pushLog(g, "Stone blocks your path."); return; }
    const target = g.monsters.find(m => m.x === nx && m.y === ny);
    if (target) {
      const damage = g.player.attack + Math.floor(Math.random() * 4); target.hp -= damage; pushLog(g, `You strike the ${target.name} for ${damage}.`);
      if (target.hp <= 0) { g.monsters = g.monsters.filter(m => m.id !== target.id); g.player.xp += target.xp; g.player.gold += target.gold; pushLog(g, `The ${target.name} falls. +${target.xp} XP, +${target.gold} gold.`); }
    } else { g.player.x = nx; g.player.y = ny; }
    const item = g.items.find(i => i.x === g.player.x && i.y === g.player.y);
    if (item) {
      if (item.kind === "heal") { g.player.potions++; pushLog(g, "You pick up a healing potion."); }
      if (item.kind === "gold") { g.player.gold += item.amount; pushLog(g, `You collect ${item.amount} gold.`); }
      if (item.kind === "cure") { g.player.hasCure = true; pushLog(g, "You found the Potion of Dianthroritis! Return upward."); }
      g.items = g.items.filter(i => i.id !== item.id);
    }
    const need = g.player.level * 22;
    if (g.player.xp >= need) { g.player.level++; g.player.xp -= need; g.player.maxHp += 8; g.player.hp = g.player.maxHp; g.player.attack += 2; pushLog(g, `You rise to level ${g.player.level}!`); }
    if (g.player.x === g.stairs.x && g.player.y === g.stairs.y && g.floor < LAST_FLOOR) {
      const f = makeFloor(g.floor + 1); g.floor++; g.tiles = f.tiles; g.monsters = f.monsters; g.items = f.items; g.stairs = f.stairs; Object.assign(g.player, f.start); pushLog(g, `You descend to dungeon level ${g.floor}.`);
    }
    g.monsters.forEach(m => {
      if (distance(m, g.player) === 1) { const dmg = Math.max(1, m.attack + Math.floor(Math.random() * 3) - 1); g.player.hp -= dmg; pushLog(g, `The ${m.name} hits you for ${dmg}.`); }
      else if (distance(m, g.player) < 8 && Math.random() < .65) {
        const sx = Math.sign(g.player.x - m.x), sy = Math.sign(g.player.y - m.y); const options = Math.random() > .5 ? [[sx,0],[0,sy]] : [[0,sy],[sx,0]];
        for (const [mx,my] of options) { const tx=m.x+mx, ty=m.y+my; if ((mx||my) && g.tiles[ty]?.[tx] !== "#" && !(tx===g.player.x&&ty===g.player.y) && !g.monsters.some(o=>o.id!==m.id&&o.x===tx&&o.y===ty)) { m.x=tx; m.y=ty; break; } }
      }
    });
    g.turn++;
    if (g.turn >= 300) { g.status = "dead"; pushLog(g, "Time has run out. Your daughter could not be saved."); }
    else if (g.player.hp <= 0) { g.player.hp = 0; g.status = "dead"; pushLog(g, "You have fallen beneath Larn."); }
  }), [update]);

  const drink = useCallback(() => update(g => { if (g.status !== "playing") return; if (!g.player.potions) return pushLog(g, "You have no healing potions."); if (g.player.hp === g.player.maxHp) return pushLog(g, "You are already at full health."); const n=Math.min(12,g.player.maxHp-g.player.hp); g.player.hp+=n; g.player.potions--; g.turn++; pushLog(g, `You recover ${n} health.`); }), [update]);
  const escape = useCallback(() => update(g => { if (g.status !== "playing") return; if (!g.player.hasCure) return pushLog(g, "You cannot leave without the cure."); if (g.floor !== LAST_FLOOR || distance(g.player,g.stairs)>1) return pushLog(g, "Return to the portal where you found the cure."); g.status="won"; pushLog(g, "You return to Larn and save your daughter!"); }), [update]);
  const save = useCallback(() => { localStorage.setItem("jeremys-larn-save", JSON.stringify(game)); update(g => pushLog(g, "Game saved in this browser.")); }, [game, update]);
  const load = useCallback(() => { const raw=localStorage.getItem("jeremys-larn-save"); if (raw) setGame(JSON.parse(raw)); }, []);

  useEffect(() => { const onKey=(e:KeyboardEvent) => { if (dirs[e.key]) { e.preventDefault(); act(dirs[e.key].x, dirs[e.key].y); } if (e.key.toLowerCase()==="q") drink(); if (e.key.toLowerCase()==="e") escape(); }; window.addEventListener("keydown",onKey); return()=>window.removeEventListener("keydown",onKey); }, [act,drink,escape]);

  const entities = useMemo(() => { const map=new Map<string,{glyph:string;kind:string;title:string}>(); game.items.forEach(i=>map.set(`${i.x},${i.y}`,{glyph:i.glyph,kind:`item ${i.kind}`,title:i.name})); game.monsters.forEach(m=>map.set(`${m.x},${m.y}`,{glyph:m.glyph,kind:"monster",title:`${m.name} (${m.hp}/${m.maxHp})`})); map.set(`${game.player.x},${game.player.y}`,{glyph:"@",kind:"player",title:"You"}); return map; },[game]);
  const hpPct = 100*game.player.hp/game.player.maxHp, xpPct=100*game.player.xp/(game.player.level*22);

  return <main className="game-shell">
    <header><div><span className="eyebrow">A browser roguelike</span><h1>LARN <b>REBORN</b></h1></div><div className="header-actions"><button onClick={save}>Save</button><button onClick={load}>Load</button><button aria-label="Toggle sound" className={sound?"active":""} onClick={()=>setSound(!sound)}>♪</button></div></header>
    <section className="layout">
      <aside className="panel stats">
        <h2>Adventurer</h2><div className="portrait">@</div>
        <Stat label="Health" value={`${game.player.hp}/${game.player.maxHp}`} pct={hpPct} tone="red" />
        <Stat label="Experience" value={`${game.player.xp}/${game.player.level*22}`} pct={xpPct} tone="gold" />
        <div className="stat-grid"><span>LEVEL<strong>{game.player.level}</strong></span><span>ATTACK<strong>{game.player.attack}</strong></span><span>GOLD<strong>{game.player.gold}</strong></span><span>DEPTH<strong>{game.floor}/{LAST_FLOOR}</strong></span></div>
        <div className="quest"><span>PRIMARY QUEST</span><strong>{game.player.hasCure?"Return with the cure":"Find the ancient cure"}</strong><small>{game.player.hasCure?"The portal is waiting.":"Deepest dungeon level"}</small></div>
      </aside>
      <section className="map-wrap">
        <div className="map" role="application" aria-label="Dungeon map">
          {game.tiles.flatMap((row,y)=>row.map((tile,x)=>{ const e=entities.get(`${x},${y}`); return <span key={`${x}-${y}`} title={e?.title} className={e?.kind || (tile==="#"?"wall":tile===">"||tile==="Ω"?"stairs":"floor")}>{e?.glyph || (tile==="#"?"▓":tile)}</span>; }))}
        </div>
        {game.status!=="playing"&&<div className="end-card"><span>{game.status==="won"?"VICTORY":"THE DUNGEON CLAIMS YOU"}</span><h2>{game.status==="won"?"Larn is saved.":"Your quest has ended."}</h2><p>{game.status==="won"?`You recovered the cure in ${game.turn} turns with ${game.player.gold} gold.`:"Begin again. The dungeon will be different."}</p><button onClick={()=>setGame(freshGame())}>New adventure</button></div>}
        <div className="mobile-controls"><button onClick={()=>act(0,-1)}>↑</button><div><button onClick={()=>act(-1,0)}>←</button><button onClick={()=>act(0,1)}>↓</button><button onClick={()=>act(1,0)}>→</button></div></div>
      </section>
      <aside className="panel right-panel">
        <h2>Field Log</h2><div className="log">{game.log.map((l,i)=><p key={`${l}-${i}`} className={i===0?"latest":""}><i>›</i>{l}</p>)}</div>
        <div className="inventory"><h2>Inventory</h2><button onClick={drink}><span className="item-icon">!</span><span><strong>Healing potion</strong><small>Q · restores 12 HP</small></span><b>{game.player.potions}</b></button>{game.player.hasCure&&<div className="cure"><span>✦</span><strong>Potion of Dianthroritis</strong></div>}</div>
        <button className="escape" onClick={escape} disabled={!game.player.hasCure}>Return to Larn <kbd>E</kbd></button>
      </aside>
    </section>
    <footer><div><kbd>WASD</kbd><kbd>ARROWS</kbd><span>MOVE / ATTACK</span></div><div><kbd>Q</kbd><span>DRINK POTION</span></div><div className="turns"><span>TIME REMAINING</span><strong>{Math.max(0,300-game.turn)}</strong></div></footer>
  </main>;
}

function Stat({label,value,pct,tone}:{label:string;value:string;pct:number;tone:string}) { return <div className="meter"><div><span>{label}</span><b>{value}</b></div><i><em className={tone} style={{width:`${Math.max(0,pct)}%`}} /></i></div>; }
