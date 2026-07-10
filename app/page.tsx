"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Point = { x: number; y: number };
type Item = { id: string; name: string; glyph: string; kind: "heal" | "gold" | "cure" | "eye" | "weapon" | "armor"; amount: number } & Point;
type Monster = { id: string; name: string; glyph: string; hp: number; maxHp: number; attack: number; xp: number; gold: number } & Point;
type Floor = { tiles: string[][]; monsters: Monster[]; items: Item[]; stairs: Point; up: Point; start: Point };
type Game = {
  floor: number; tiles: string[][]; monsters: Monster[]; items: Item[]; stairs: Point; up: Point;
  player: Point & { hp: number; maxHp: number; attack: number; armor: number; level: number; xp: number; gold: number; bank: number; potions: number; hasEye: boolean; hasCure: boolean; weapon: string; armorName: string };
  turn: number; status: "playing" | "won" | "dead"; log: string[];
};

const W = 41, H = 23, LAST_FLOOR = 13;
const dirs: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
};
const monsterTypes = [
  ["bat", "B", 1, 1, 1, 0], ["gnome", "G", 2, 1, 2, 30], ["hobgoblin", "H", 3, 2, 2, 25],
  ["orc", "O", 4, 2, 2, 40], ["giant ant", "A", 5, 2, 5, 0], ["troll", "T", 50, 5, 300, 80],
  ["white dragon", "D", 55, 4, 1000, 500], ["wraith", "W", 30, 4, 325, 0], ["vampire", "V", 50, 6, 1000, 0],
  ["gnome king", "K", 100, 10, 3000, 2000], ["red dragon", "D", 110, 13, 14000, 800],
  ["type IV demon lord", "4", 200, 20, 125000, 0], ["demon prince", "P", 345, 30, 300000, 0],
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
  const start = { x: rooms[0].cx, y: rooms[0].cy }, up = { ...start }, last = rooms[rooms.length - 1];
  const stairs = { x: last.cx, y: last.cy }; tiles[up.y][up.x] = "<"; tiles[stairs.y][stairs.x] = level === LAST_FLOOR ? "Ω" : ">";
  const occupied = new Set([`${start.x},${start.y}`, `${stairs.x},${stairs.y}`]);
  const spot = () => { let p: Point; do { const q = rooms[1 + Math.floor(r() * (rooms.length - 1))]; p = { x: q.x + Math.floor(r() * q.w), y: q.y + Math.floor(r() * q.h) }; } while (occupied.has(`${p.x},${p.y}`)); occupied.add(`${p.x},${p.y}`); return p; };
  const monsters: Monster[] = [];
  for (let i = 0; i < 4 + level; i++) {
    const p = spot(), tier = Math.min(monsterTypes.length - 1, Math.max(0, level - 1 + (r() > .72 ? 1 : 0))), m = monsterTypes[tier];
    const hp = m[2] + Math.floor(r() * 4);
    monsters.push({ id: `m${level}-${i}-${seed}`, name: m[0], glyph: m[1], hp, maxHp: hp, attack: m[3], xp: m[4], gold: m[5], ...p });
  }
  const items: Item[] = [];
  for (let i = 0; i < 3; i++) items.push({ id: `p${level}-${i}-${seed}`, name: "healing potion", glyph: "!", kind: "heal", amount: 8, ...spot() });
  for (let i = 0; i < 3; i++) items.push({ id: `c${level}-${i}-${seed}`, name: "gold", glyph: "$", kind: "gold", amount: 3 + Math.floor(r() * 10), ...spot() });
  if (level > 1 && r() > .45) items.push({ id:`w${level}-${seed}`, name: level > 6 ? "longsword" : "spear", glyph:")", kind:"weapon", amount: level > 6 ? 3 : 1, ...spot() });
  if (level > 2 && r() > .5) items.push({ id:`a${level}-${seed}`, name: level > 7 ? "plate armor" : "ring mail", glyph:"[", kind:"armor", amount: level > 7 ? 4 : 2, ...spot() });
  if (level === 10) items.push({ id:`eye-${seed}`, name:"The Eye of Larn", glyph:"~", kind:"eye", amount:1, x:stairs.x, y:stairs.y });
  if (level === LAST_FLOOR) items.push({ id: `cure-${seed}`, name: "Potion of Dianthroritis", glyph: "✦", kind: "cure", amount: 1, x: stairs.x, y: stairs.y });
  return { tiles, monsters, items, stairs, up, start };
}

function makeTown(): Floor {
  const tiles=Array.from({length:H},()=>Array(W).fill("."));
  for(let x=0;x<W;x++){tiles[0][x]="#";tiles[H-1][x]="#"} for(let y=0;y<H;y++){tiles[y][0]="#";tiles[y][W-1]="#"}
  const buildings:[number,number,string][]=[[7,5,"H"],[20,4,"S"],[33,5,"C"],[8,16,"B"],[20,17,"T"],[33,16,"R"]];
  buildings.forEach(([x,y,g])=>{for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-3;xx<=x+3;xx++)tiles[yy][xx]="#";tiles[y+2][x]=g});
  const stairs={x:20,y:11};tiles[11][20]=">"; const start={x:20,y:13};
  return {tiles,monsters:[],items:[],stairs,up:start,start};
}

function freshGame(): Game {
  const f = makeTown();
  return { floor: 0, tiles: f.tiles, monsters: f.monsters, items: f.items, stairs: f.stairs, up:f.up,
    player: { ...f.start, hp: 20, maxHp: 20, attack: 2, armor:0, level: 1, xp: 0, gold: 0, bank:0, potions: 1, hasEye:false, hasCure: false, weapon:"none", armorName:"clothes" },
    turn: 0, status: "playing", log: ["Welcome to the town of Larn.", "Your daughter is dying of dianthroritis. Find the cure in the volcanic depths."] };
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
      if (item.kind === "eye") { g.player.hasEye = true; pushLog(g, "You claim the legendary Eye of Larn."); }
      if (item.kind === "weapon" && item.amount > g.player.attack-2) { g.player.attack=2+item.amount; g.player.weapon=item.name; pushLog(g, `You wield the ${item.name}.`); }
      if (item.kind === "armor" && item.amount > g.player.armor) { g.player.armor=item.amount; g.player.armorName=item.name; pushLog(g, `You equip the ${item.name}.`); }
      g.items = g.items.filter(i => i.id !== item.id);
    }
    const need = g.player.level * 22;
    if (g.player.xp >= need) { g.player.level++; g.player.xp -= need; g.player.maxHp += 8; g.player.hp = g.player.maxHp; g.player.attack += 2; pushLog(g, `You rise to level ${g.player.level}!`); }
    const tile=g.tiles[g.player.y][g.player.x];
    if (tile === ">" && g.floor < LAST_FLOOR) {
      const f = makeFloor(g.floor + 1); g.floor++; g.tiles = f.tiles; g.monsters = f.monsters; g.items = f.items; g.stairs = f.stairs; g.up=f.up; Object.assign(g.player, f.start); pushLog(g, `You descend to ${g.floor<=10?`dungeon level ${g.floor}`:`volcanic level V${g.floor-10}`}.`);
    } else if (tile === "<" && g.floor > 0) {
      const next=g.floor-1; const f=next===0?makeTown():makeFloor(next); g.floor=next; g.tiles=f.tiles;g.monsters=f.monsters;g.items=f.items;g.stairs=f.stairs;g.up=f.up;Object.assign(g.player,next===0?f.start:f.stairs);pushLog(g,next===0?"You emerge in the town of Larn.":`You climb to dungeon level ${next}.`);
    } else if(g.floor===0){
      if(tile==="H"){g.player.hp=g.player.maxHp;pushLog(g,g.player.hasCure?"You return home with the cure. Your daughter will live!":"You rest at home and recover your health.");if(g.player.hasCure)g.status="won"}
      if(tile==="S"){if(g.player.gold>=25){g.player.gold-=25;g.player.potions++;pushLog(g,"DND Store: bought a healing potion for 25 gold.")}else pushLog(g,"DND Store: a healing potion costs 25 gold.")}
      if(tile==="C")pushLog(g,"College of Larn: magical instruction will be available soon.");
      if(tile==="B")pushLog(g,`Bank of Larn: balance ${g.player.bank} gold.`);
      if(tile==="T")pushLog(g,"Trading Post: bring equipment here to sell.");
      if(tile==="R")pushLog(g,"Larn Revenue Service: taxes are inevitable.");
    }
    g.monsters.forEach(m => {
      if (distance(m, g.player) === 1) { const dmg = Math.max(1, m.attack + Math.floor(Math.random() * 3) - 1-g.player.armor); g.player.hp -= dmg; pushLog(g, `The ${m.name} hits you for ${dmg}.`); }
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
  const escape = useCallback(() => update(g => { if (g.status !== "playing") return; if (!g.player.hasCure) return pushLog(g, "You cannot finish the quest without the cure."); pushLog(g, "Carry the cure back up through the dungeon to your home in Larn."); }), [update]);
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
        <div className="stat-grid"><span>LEVEL<strong>{game.player.level}</strong></span><span>ARMOR<strong>{game.player.armor}</strong></span><span>GOLD<strong>{game.player.gold}</strong></span><span>LOCATION<strong>{game.floor===0?"TOWN":game.floor<=10?game.floor:`V${game.floor-10}`}</strong></span></div>
        <div className="equipment"><small>WEAPON</small><strong>{game.player.weapon}</strong><small>ARMOR</small><strong>{game.player.armorName}</strong></div>
        <div className="quest"><span>PRIMARY QUEST</span><strong>{game.player.hasCure?"Return home with the cure":game.player.hasEye?"Seek the cure in the volcano":"Find the Eye of Larn"}</strong><small>{game.player.hasCure?"Climb back to the town.":game.player.hasEye?"Three volcanic levels remain.":"The Eye lies on dungeon level 10."}</small></div>
      </aside>
      <section className="map-wrap">
        <div className="map" role="application" aria-label="Dungeon map">
          {game.tiles.flatMap((row,y)=>row.map((tile,x)=>{ const e=entities.get(`${x},${y}`); const townNames:Record<string,string>={H:"Your home",S:"DND Store",C:"College of Larn",B:"Bank of Larn",T:"Trading Post",R:"Larn Revenue Service"}; return <span key={`${x}-${y}`} title={e?.title||townNames[tile]} className={e?.kind || (tile==="#"?"wall":tile===">"||tile==="<"||tile==="Ω"?"stairs":townNames[tile]?"town-place":"floor")}>{e?.glyph || (tile==="#"?"▓":tile)}</span>; }))}
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
