"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DND_STOCK, EXPERIENCE, POTIONS, RANKS, SCROLLS, SPELLS, type ShopItem } from "./larn-data";

type Point = { x: number; y: number };
type Item = { id: string; name: string; glyph: string; kind: "heal" | "gold" | "cure" | "eye" | "weapon" | "armor" | "potion" | "scroll"; amount: number; effect?:string } & Point;
type BagItem = { id:string; name:string; kind:"potion"|"scroll"|"misc"; effect:string; qty:number };
type Monster = { id: string; name: string; glyph: string; hp: number; maxHp: number; attack: number; xp: number; gold: number } & Point;
type Feature = Point & { id:string; kind:"trap"|"fountain"|"altar"; used:boolean };
type Floor = { tiles: string[][]; monsters: Monster[]; items: Item[]; features:Feature[]; stairs: Point; up: Point; start: Point };
type Game = {
  floor: number; tiles: string[][]; monsters: Monster[]; items: Item[]; features:Feature[]; stairs: Point; up: Point;
  player: Point & { hp: number; maxHp: number; mana:number; maxMana:number; attack: number; armor: number; strength:number; intelligence:number; wisdom:number; constitution:number; dexterity:number; charisma:number; level: number; xp: number; gold: number; bank: number; potions: number; hasEye: boolean; hasCure: boolean; weapon: string; armorName: string; spells:string[] };
  turn: number; deadline:number; status: "playing" | "won" | "dead"; log: string[]; shopStock:number[]; bag:BagItem[]; awareness:number; floors:Record<number,Floor>;
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
  for (let i = 0; i < 3; i++) {const effect=POTIONS[Math.floor(r()*Math.min(POTIONS.length,8+level))];items.push({ id: `p${level}-${i}-${seed}`, name: `potion of ${effect}`, glyph: "!", kind: "potion", effect, amount: 1, ...spot() });}
  for (let i = 0; i < 3; i++) {const effect=SCROLLS[Math.floor(r()*Math.min(SCROLLS.length,8+level))];items.push({ id: `s${level}-${i}-${seed}`, name: `scroll of ${effect}`, glyph: "?", kind: "scroll", effect, amount: 1, ...spot() });}
  for (let i = 0; i < 3; i++) items.push({ id: `c${level}-${i}-${seed}`, name: "gold", glyph: "$", kind: "gold", amount: 3 + Math.floor(r() * 10), ...spot() });
  if (level > 1 && r() > .45) items.push({ id:`w${level}-${seed}`, name: level > 6 ? "longsword" : "spear", glyph:")", kind:"weapon", amount: level > 6 ? 3 : 1, ...spot() });
  if (level > 2 && r() > .5) items.push({ id:`a${level}-${seed}`, name: level > 7 ? "plate armor" : "ring mail", glyph:"[", kind:"armor", amount: level > 7 ? 4 : 2, ...spot() });
  if (level === 10) items.push({ id:`eye-${seed}`, name:"The Eye of Larn", glyph:"~", kind:"eye", amount:1, x:stairs.x, y:stairs.y });
  if (level === LAST_FLOOR) items.push({ id: `cure-${seed}`, name: "Potion of Dianthroritis", glyph: "✦", kind: "cure", amount: 1, x: stairs.x, y: stairs.y });
  const features:Feature[]=[];
  for(let i=0;i<Math.min(3,Math.ceil(level/3));i++){const p=spot();features.push({id:`trap-${level}-${i}-${seed}`,kind:"trap",used:false,...p});tiles[p.y][p.x]="^"}
  if(level>1&&r()>.35){const p=spot();features.push({id:`fountain-${level}-${seed}`,kind:"fountain",used:false,...p});tiles[p.y][p.x]="{"}
  if(level>2&&r()>.5){const p=spot();features.push({id:`altar-${level}-${seed}`,kind:"altar",used:false,...p});tiles[p.y][p.x]="_"}
  return { tiles, monsters, items, features, stairs, up, start };
}

function makeTown(): Floor {
  const tiles=Array.from({length:H},()=>Array(W).fill("."));
  for(let x=0;x<W;x++){tiles[0][x]="#";tiles[H-1][x]="#"} for(let y=0;y<H;y++){tiles[y][0]="#";tiles[y][W-1]="#"}
  const buildings:[number,number,string][]=[[7,5,"H"],[20,4,"S"],[33,5,"C"],[8,16,"B"],[20,17,"T"],[33,16,"R"]];
  buildings.forEach(([x,y,g])=>{for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-3;xx<=x+3;xx++)tiles[yy][xx]="#";tiles[y+2][x]=g});
  const stairs={x:20,y:11};tiles[11][20]=">"; const start={x:20,y:13};
  return {tiles,monsters:[],items:[],features:[],stairs,up:start,start};
}

function freshGame(): Game {
  const f = makeTown();
  return { floor: 0, tiles: f.tiles, monsters: f.monsters, items: f.items, features:f.features, stairs: f.stairs, up:f.up,
    player: { ...f.start, hp: 20, maxHp: 20, mana:12,maxMana:12, attack: 2, armor:0, strength:12,intelligence:12,wisdom:12,constitution:12,dexterity:12,charisma:12,level: 1, xp: 0, gold: 250, bank:0, potions: 1, hasEye:false, hasCure: false, weapon:"none", armorName:"clothes",spells:["pro","mle"] },
    turn: 0, deadline:2500,status: "playing", shopStock:DND_STOCK.map(x=>x.stock), bag:[{id:"start-heal",name:"potion of healing",kind:"potion",effect:"healing",qty:1}],awareness:0,floors:{0:f}, log: ["Welcome to the town of Larn.", "Your daughter is dying of dianthroritis. Find the cure in the volcanic depths."] };
}

function pushLog(g: Game, text: string) { g.log = [text, ...g.log].slice(0, 8); }
function addBag(g:Game,item:BagItem){const old=g.bag.find(x=>x.kind===item.kind&&x.effect===item.effect);if(old)old.qty+=item.qty;else g.bag.push(item)}

export default function Home() {
  const [game, setGame] = useState<Game>(() => freshGame());
  const [sound, setSound] = useState(false);
  const [service,setService]=useState<"none"|"college"|"bank"|"trade"|"spells">("none");

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
      if (item.kind === "potion"||item.kind==="scroll") {addBag(g,{id:item.id,name:item.name,kind:item.kind,effect:item.effect||"",qty:1});pushLog(g,`You pick up a ${item.name}.`)}
      if (item.kind === "gold") { g.player.gold += item.amount; pushLog(g, `You collect ${item.amount} gold.`); }
      if (item.kind === "cure") { g.player.hasCure = true; pushLog(g, "You found the Potion of Dianthroritis! Return upward."); }
      if (item.kind === "eye") { g.player.hasEye = true; pushLog(g, "You claim the legendary Eye of Larn."); }
      if (item.kind === "weapon" && item.amount > g.player.attack-2) { g.player.attack=2+item.amount; g.player.weapon=item.name; pushLog(g, `You wield the ${item.name}.`); }
      if (item.kind === "armor" && item.amount > g.player.armor) { g.player.armor=item.amount; g.player.armorName=item.name; pushLog(g, `You equip the ${item.name}.`); }
      g.items = g.items.filter(i => i.id !== item.id);
    }
    const feature=g.features.find(f=>f.x===g.player.x&&f.y===g.player.y&&!f.used);
    if(feature?.kind==="trap"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";
      const roll=Math.random();
      if(roll<.34){const dmg=3+Math.floor(Math.random()*Math.max(4,g.floor));g.player.hp-=dmg;pushLog(g,`A hidden trap wounds you for ${dmg}.`)}
      else if(roll<.67){g.player.gold=Math.max(0,g.player.gold-20-g.floor*5);pushLog(g,"A trap door scatters some of your gold.")}
      else {g.player.dexterity=Math.max(3,g.player.dexterity-1);pushLog(g,"A dart numbs your limbs. Dexterity falls.")}
    } else if(feature?.kind==="fountain"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";
      if(Math.random()<.72){const n=Math.min(g.player.maxHp-g.player.hp,8+g.floor);g.player.hp+=n;g.player.mana=Math.min(g.player.maxMana,g.player.mana+5);pushLog(g,`The fountain restores ${n} health and refreshes your magic.`)}
      else {g.player.hp=Math.max(1,g.player.hp-6);pushLog(g,"The fountain water is foul!")}
    } else if(feature?.kind==="altar"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";
      if(g.player.gold>=50){g.player.gold-=50;g.player.wisdom++;g.player.maxMana+=2;g.player.mana=g.player.maxMana;pushLog(g,"You offer 50 gold. The altar grants wisdom.")}
      else pushLog(g,"The silent altar demands an offering you cannot afford.");
    }
    const need = EXPERIENCE[Math.min(g.player.level,EXPERIENCE.length-1)];
    if (g.player.xp >= need) { g.player.level++; g.player.maxHp += 3+Math.floor(g.player.constitution/5); g.player.hp = g.player.maxHp; pushLog(g, `You become a ${RANKS[Math.min(g.player.level-1,RANKS.length-1)]}!`); }
    const tile=g.tiles[g.player.y][g.player.x];
    if (tile === ">" && g.floor < LAST_FLOOR) {
      g.floors[g.floor]={tiles:g.tiles,monsters:g.monsters,items:g.items,features:g.features,stairs:g.stairs,up:g.up,start:{x:g.player.x,y:g.player.y}};
      const n=g.floor+1,f=g.floors[n]??makeFloor(n);g.floors[n]=f;g.floor=n;g.tiles=f.tiles;g.monsters=f.monsters;g.items=f.items;g.features=f.features??[];g.stairs=f.stairs;g.up=f.up;Object.assign(g.player,f.up);pushLog(g, `You descend to ${g.floor<=10?`dungeon level ${g.floor}`:`volcanic level V${g.floor-10}`}.`);
    } else if (tile === "<" && g.floor > 0) {
      g.floors[g.floor]={tiles:g.tiles,monsters:g.monsters,items:g.items,features:g.features,stairs:g.stairs,up:g.up,start:{x:g.player.x,y:g.player.y}};
      const next=g.floor-1,f=g.floors[next]??(next===0?makeTown():makeFloor(next));g.floors[next]=f;g.floor=next;g.tiles=f.tiles;g.monsters=f.monsters;g.items=f.items;g.features=f.features??[];g.stairs=f.stairs;g.up=f.up;Object.assign(g.player,next===0?f.start:f.stairs);pushLog(g,next===0?"You emerge in the town of Larn.":`You climb to dungeon level ${next}.`);
    } else if(g.floor===0){
      if(tile==="H"){g.player.hp=g.player.maxHp;pushLog(g,g.player.hasCure?"You return home with the cure. Your daughter will live!":"You rest at home and recover your health.");if(g.player.hasCure)g.status="won"}
      if(tile==="S")pushLog(g,"Welcome to the Larn Thrift Shoppe. Select an item to purchase.");
      if(tile==="C"){pushLog(g,"College of Larn: instruction in the mystic arts.");setService("college")}
      if(tile==="B"){pushLog(g,`Bank of Larn: balance ${g.player.bank} gold.`);setService("bank")}
      if(tile==="T"){pushLog(g,"Trading Post: fair prices for used equipment.");setService("trade")}
      if(tile==="R")pushLog(g,"Larn Revenue Service: taxes are inevitable.");
    }
    g.monsters.forEach(m => {
      if (distance(m, g.player) === 1) { const dmg = Math.max(1, m.attack + Math.floor(Math.random() * 3) - 1-g.player.armor); g.player.hp -= dmg; pushLog(g, `The ${m.name} hits you for ${dmg}.`); }
      else if (distance(m, g.player) < 8 && Math.random() < .65) {
        const sx = Math.sign(g.player.x - m.x), sy = Math.sign(g.player.y - m.y); const options = Math.random() > .5 ? [[sx,0],[0,sy]] : [[0,sy],[sx,0]];
        for (const [mx,my] of options) { const tx=m.x+mx, ty=m.y+my; if ((mx||my) && g.tiles[ty]?.[tx] !== "#" && !(tx===g.player.x&&ty===g.player.y) && !g.monsters.some(o=>o.id!==m.id&&o.x===tx&&o.y===ty)) { m.x=tx; m.y=ty; break; } }
      }
    });
    g.turn++;if(g.turn%8===0){g.player.hp=Math.min(g.player.maxHp,g.player.hp+1);g.player.mana=Math.min(g.player.maxMana,g.player.mana+1)}
    if (g.turn >= g.deadline) { g.status = "dead"; pushLog(g, "Time has run out. Your daughter could not be saved."); }
    else if (g.player.hp <= 0) { g.player.hp = 0; g.status = "dead"; pushLog(g, "You have fallen beneath Larn."); }
  }), [update]);

  const consumeItem = useCallback((id:string)=>update(g=>{const item=g.bag.find(x=>x.id===id);if(!item||g.status!=="playing")return;const effect=item.effect;
    if(item.kind==="potion"){
      if(effect==="healing"||effect==="instant healing"){const n=Math.min(effect==="instant healing"?g.player.maxHp:12,g.player.maxHp-g.player.hp);g.player.hp+=n;pushLog(g,`You recover ${n} health.`)}
      else if(effect==="raise level")g.player.xp=EXPERIENCE[Math.min(g.player.level,EXPERIENCE.length-1)];
      else if(effect==="strength"||effect==="giant strength")g.player.strength+=effect==="giant strength"?4:1;
      else if(effect==="wisdom")g.player.wisdom++;
      else if(effect==="raise charisma")g.player.charisma++;
      else if(effect==="increase ability"){g.player.strength++;g.player.dexterity++;g.player.constitution++}
      else if(effect==="poison"){g.player.hp=Math.max(1,g.player.hp-10);pushLog(g,"The potion was poison!")}
      else if(effect==="heroism"){g.player.attack+=2;pushLog(g,"You feel heroic.")}
      else if(effect==="sturdiness"){g.player.maxHp+=5;g.player.hp+=5}
      else if(effect==="object detection"||effect==="monster detection")g.awareness=40;
      else pushLog(g,`You drink the potion of ${effect}.`);
    } else {
      if(effect==="enchant weapon")g.player.attack++;
      else if(effect==="enchant armor")g.player.armor++;
      else if(effect==="enlightenment"||effect==="magic mapping"||effect==="expanded awareness")g.awareness=100;
      else if(effect==="teleportation"){const cells=[] as Point[];for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(g.tiles[y][x]!=="#")cells.push({x,y});Object.assign(g.player,cells[Math.floor(Math.random()*cells.length)])}
      else if(effect==="annihilation"){g.monsters=[];pushLog(g,"Every monster on the level is annihilated.")}
      else if(effect==="hold monsters"){g.awareness=25;pushLog(g,"The monsters are held motionless.")}
      else pushLog(g,`You read the scroll of ${effect}.`);
    }
    item.qty--;if(item.qty<=0)g.bag=g.bag.filter(x=>x.id!==id);g.turn++;
  }),[update]);
  const drink = useCallback(() => {const p=game.bag.find(x=>x.kind==="potion"&&x.effect==="healing");if(p)consumeItem(p.id);else update(g=>pushLog(g,"You have no healing potions."))}, [game.bag,consumeItem,update]);
  const escape = useCallback(() => update(g => { if (g.status !== "playing") return; if (!g.player.hasCure) return pushLog(g, "You cannot finish the quest without the cure."); pushLog(g, "Carry the cure back up through the dungeon to your home in Larn."); }), [update]);
  const save = useCallback(() => { localStorage.setItem("jeremys-larn-save", JSON.stringify(game)); update(g => pushLog(g, "Game saved in this browser.")); }, [game, update]);
  const load = useCallback(() => { const raw=localStorage.getItem("jeremys-larn-save"); if(raw){const old=JSON.parse(raw) as Game,base=freshGame();const floors=old.floors??base.floors;Object.values(floors).forEach(f=>f.features??=[]);setGame({...base,...old,features:old.features??[],deadline:old.deadline??2500,floors,shopStock:old.shopStock??base.shopStock,player:{...base.player,...old.player,spells:old.player.spells??base.player.spells}})} }, []);
  const buy = useCallback((item:ShopItem,index:number)=>update(g=>{
    if(!g.shopStock[index])return pushLog(g,`${item.name} is sold out.`);
    if(g.player.gold<item.price)return pushLog(g,`You need ${item.price-g.player.gold} more gold.`);
    g.player.gold-=item.price;g.shopStock[index]--;
    if(item.kind==="weapon"&&item.power){g.player.weapon=item.name;g.player.attack=2+item.power;}
    if(item.kind==="armor"&&item.power){g.player.armorName=item.name;g.player.armor=item.power;}
    if(item.effect)addBag(g,{id:`shop-${item.effect}`,name:item.name,kind:"potion",effect:item.effect,qty:1});
    pushLog(g,`Purchased ${item.name} for ${item.price} gold.`);
  }),[update]);

  const cast=useCallback((code:string)=>update(g=>{const s=SPELLS.find(x=>x[0]===code);if(!s)return;const tier=Math.floor(SPELLS.findIndex(x=>x[0]===code)/4)+1;if(g.player.mana<tier)return pushLog(g,"You lack the spell points.");g.player.mana-=tier;
    if(code==="hel")g.player.hp=Math.min(g.player.maxHp,g.player.hp+12+g.player.wisdom);
    else if(["mle","ssp","bal","cld","lit","mfi","fgr"].includes(code)){const target=[...g.monsters].sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];if(target){const dmg=tier*6+g.player.intelligence;target.hp-=dmg;pushLog(g,`${s[1]} hits the ${target.name} for ${dmg}.`);if(target.hp<=0){g.player.xp+=target.xp;g.player.gold+=target.gold;g.monsters=g.monsters.filter(m=>m.id!==target.id)}}}
    else if(["hld","stp","sle","web"].includes(code))g.awareness=30;
    else if(code==="gen"||code==="sph")g.monsters=[];
    else if(code==="tel")Object.assign(g.player,g.up);
    else if(code==="pro"||code==="glo")g.player.armor+=tier;
    else if(code==="str")g.player.strength+=2;else if(code==="dex")g.player.dexterity+=2;else if(code==="enl")g.awareness=100;
    pushLog(g,`You cast ${s[1]}.`);g.turn++;
  }),[update]);
  const learn=useCallback((code:string,cost:number)=>update(g=>{if(g.player.spells.includes(code))return;if(g.player.gold<cost)return pushLog(g,"You cannot afford that course.");g.player.gold-=cost;g.player.spells.push(code);pushLog(g,`You learn ${code.toUpperCase()}.`)}),[update]);
  const bankGold=useCallback((deposit:boolean)=>update(g=>{const n=Math.min(100,deposit?g.player.gold:g.player.bank);if(deposit){g.player.gold-=n;g.player.bank+=n}else{g.player.bank-=n;g.player.gold+=n}pushLog(g,`${deposit?"Deposited":"Withdrew"} ${n} gold.`)}),[update]);
  const sell=useCallback(()=>update(g=>{if(g.player.weapon==="none"&&g.player.armorName==="clothes")return pushLog(g,"You have nothing equipped to sell.");const n=Math.max(10,(g.player.attack+g.player.armor)*20);g.player.gold+=n;g.player.weapon="none";g.player.armorName="clothes";g.player.attack=2;g.player.armor=0;pushLog(g,`Equipment sold for ${n} gold.`)}),[update]);

  useEffect(() => { const onKey=(e:KeyboardEvent) => { if (dirs[e.key]) { e.preventDefault();setService("none");act(dirs[e.key].x, dirs[e.key].y); } if (e.key.toLowerCase()==="q") drink();if(e.key.toLowerCase()==="c")setService("spells"); if (e.key.toLowerCase()==="e") escape(); }; window.addEventListener("keydown",onKey); return()=>window.removeEventListener("keydown",onKey); }, [act,drink,escape]);

  const entities = useMemo(() => { const map=new Map<string,{glyph:string;kind:string;title:string}>(); game.items.forEach(i=>map.set(`${i.x},${i.y}`,{glyph:i.glyph,kind:`item ${i.kind}`,title:i.name})); game.monsters.forEach(m=>map.set(`${m.x},${m.y}`,{glyph:m.glyph,kind:"monster",title:`${m.name} (${m.hp}/${m.maxHp})`})); map.set(`${game.player.x},${game.player.y}`,{glyph:"@",kind:"player",title:"You"}); return map; },[game]);
  const nextXp=EXPERIENCE[Math.min(game.player.level,EXPERIENCE.length-1)],hpPct = 100*game.player.hp/game.player.maxHp, xpPct=100*game.player.xp/nextXp;
  const atStore=game.floor===0&&game.tiles[game.player.y]?.[game.player.x]==="S";

  return <main className="game-shell">
    <header><div><span className="eyebrow">A browser roguelike</span><h1>LARN <b>REBORN</b></h1></div><div className="header-actions"><button onClick={save}>Save</button><button onClick={load}>Load</button><button aria-label="Toggle sound" className={sound?"active":""} onClick={()=>setSound(!sound)}>♪</button></div></header>
    <section className="layout">
      <aside className="panel stats">
        <h2>Adventurer</h2><div className="portrait">@</div>
        <Stat label="Health" value={`${game.player.hp}/${game.player.maxHp}`} pct={hpPct} tone="red" />
        <Stat label="Spell points" value={`${game.player.mana}/${game.player.maxMana}`} pct={100*game.player.mana/game.player.maxMana} tone="gold" />
        <Stat label="Experience" value={`${game.player.xp}/${nextXp}`} pct={xpPct} tone="gold" />
        <div className="stat-grid"><span>LEVEL<strong>{game.player.level}</strong></span><span>ARMOR<strong>{game.player.armor}</strong></span><span>GOLD<strong>{game.player.gold}</strong></span><span>LOCATION<strong>{game.floor===0?"TOWN":game.floor<=10?game.floor:`V${game.floor-10}`}</strong></span></div>
        <div className="equipment"><small>WEAPON</small><strong>{game.player.weapon}</strong><small>ARMOR</small><strong>{game.player.armorName}</strong></div>
        <div className="abilities"><span>STR<b>{game.player.strength}</b></span><span>INT<b>{game.player.intelligence}</b></span><span>WIS<b>{game.player.wisdom}</b></span><span>CON<b>{game.player.constitution}</b></span><span>DEX<b>{game.player.dexterity}</b></span><span>CHA<b>{game.player.charisma}</b></span></div>
        <div className="quest"><span>PRIMARY QUEST</span><strong>{game.player.hasCure?"Return home with the cure":game.player.hasEye?"Seek the cure in the volcano":"Find the Eye of Larn"}</strong><small>{game.player.hasCure?"Climb back to the town.":game.player.hasEye?"Three volcanic levels remain.":"The Eye lies on dungeon level 10."}</small></div>
      </aside>
      <section className="map-wrap">
        <div className="map" role="application" aria-label="Dungeon map">
          {game.tiles.flatMap((row,y)=>row.map((tile,x)=>{ const e=entities.get(`${x},${y}`); const townNames:Record<string,string>={H:"Your home",S:"DND Store",C:"College of Larn",B:"Bank of Larn",T:"Trading Post",R:"Larn Revenue Service"};const featureNames:Record<string,string>={"^":"Trap","{":"Fountain","_":"Altar"}; return <span key={`${x}-${y}`} title={e?.title||townNames[tile]||featureNames[tile]} className={e?.kind || (tile==="#"?"wall":tile===">"||tile==="<"||tile==="Ω"?"stairs":featureNames[tile]?"feature":townNames[tile]?"town-place":"floor")}>{e?.glyph || (tile==="#"?"▓":tile)}</span>; }))}
        </div>
        {atStore&&<div className="shop-card"><div className="shop-head"><span>DND STORE · LARN THRIFT SHOPPE</span><strong>{game.player.gold} GP</strong></div><p>Original 12.3 stock and prices. Purchases equip automatically where appropriate.</p><div className="shop-list">{DND_STOCK.map((it,i)=><button key={it.name} disabled={!game.shopStock[i]||game.player.gold<it.price} onClick={()=>buy(it,i)}><span>{it.name}<small>{it.kind}</small></span><b>{it.price} gp</b><em>{game.shopStock[i]}</em></button>)}</div><small className="shop-exit">Move away from the S to leave the store.</small></div>}
        {service!=="none"&&<div className="shop-card"><div className="shop-head"><span>{service==="college"?"COLLEGE OF LARN":service==="bank"?"BANK OF LARN":service==="trade"?"TRADING POST":"SPELL BOOK"}</span><button onClick={()=>setService("none")}>Close</button></div>
          {service==="college"&&<div className="shop-list">{SPELLS.map((s,i)=>{const cost=50+(i+1)*35,known=game.player.spells.includes(s[0]);return <button key={s[0]} disabled={known||game.player.gold<cost} onClick={()=>learn(s[0],cost)}><span>{s[1]}<small>{s[0].toUpperCase()}</small></span><b>{cost} gp</b><em>{known?"✓":""}</em></button>})}</div>}
          {service==="bank"&&<div><p>Balance: {game.player.bank} gold. Cash: {game.player.gold} gold.</p><button onClick={()=>bankGold(true)}>Deposit 100</button> <button onClick={()=>bankGold(false)}>Withdraw 100</button></div>}
          {service==="trade"&&<div><p>Sell your currently equipped weapon and armor.</p><button onClick={sell}>Sell equipment</button></div>}
          {service==="spells"&&<div className="shop-list">{game.player.spells.map(code=>{const s=SPELLS.find(x=>x[0]===code)!;return <button key={code} onClick={()=>cast(code)}><span>{s[1]}<small>{code.toUpperCase()}</small></span><b>cast</b></button>})}</div>}
        </div>}
        {game.status!=="playing"&&<div className="end-card"><span>{game.status==="won"?"VICTORY":"THE DUNGEON CLAIMS YOU"}</span><h2>{game.status==="won"?"Larn is saved.":"Your quest has ended."}</h2><p>{game.status==="won"?`You recovered the cure in ${game.turn} turns with ${game.player.gold} gold.`:"Begin again. The dungeon will be different."}</p><button onClick={()=>setGame(freshGame())}>New adventure</button></div>}
        <div className="mobile-controls"><button onClick={()=>act(0,-1)}>↑</button><div><button onClick={()=>act(-1,0)}>←</button><button onClick={()=>act(0,1)}>↓</button><button onClick={()=>act(1,0)}>→</button></div></div>
      </section>
      <aside className="panel right-panel">
        <h2>Field Log</h2><div className="log">{game.log.map((l,i)=><p key={`${l}-${i}`} className={i===0?"latest":""}><i>›</i>{l}</p>)}</div>
        <div className="inventory"><h2>Inventory</h2><div className="bag-list">{game.bag.map(it=><button key={it.id} onClick={()=>consumeItem(it.id)}><span className="item-icon">{it.kind==="potion"?"!":"?"}</span><span><strong>{it.name}</strong><small>{it.kind==="potion"?"drink":"read"}</small></span><b>{it.qty}</b></button>)}</div>{game.player.hasEye&&<div className="cure"><span>~</span><strong>The Eye of Larn</strong></div>}{game.player.hasCure&&<div className="cure"><span>✦</span><strong>Potion of Dianthroritis</strong></div>}</div>
        <button className="escape" onClick={()=>setService("spells")}>Cast spell <kbd>C</kbd></button><button className="escape" onClick={escape} disabled={!game.player.hasCure}>Return to Larn <kbd>E</kbd></button>
      </aside>
    </section>
    <footer><div><kbd>WASD</kbd><kbd>ARROWS</kbd><span>MOVE / ATTACK</span></div><div><kbd>Q</kbd><span>DRINK POTION</span></div><div className="turns"><span>TIME REMAINING</span><strong>{Math.max(0,game.deadline-game.turn)}</strong></div></footer>
  </main>;
}

function Stat({label,value,pct,tone}:{label:string;value:string;pct:number;tone:string}) { return <div className="meter"><div><span>{label}</span><b>{value}</b></div><i><em className={tone} style={{width:`${Math.max(0,pct)}%`}} /></i></div>; }
