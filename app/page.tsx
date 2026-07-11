"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DND_STOCK, EXPERIENCE, POTIONS, RANKS, SCROLLS, SPELLS, type ShopItem } from "./larn-data";

type Point = { x: number; y: number };
type Item = { id: string; name: string; glyph: string; kind: "heal" | "gold" | "gem" | "cure" | "eye" | "weapon" | "armor" | "ring" | "amulet" | "artifact" | "potion" | "scroll" | "spellbook"; amount: number; effect?:string; cursed?:boolean; weight?:number } & Point;
type BagItem = { id:string; name:string; kind:"potion"|"scroll"|"misc"|"weapon"|"armor"|"ring"|"amulet"|"artifact"; effect:string; qty:number; bonus?:number; cursed?:boolean; weight?:number; active?:boolean };
type SavedGame = { id:string; name:string; savedAt:string; game:Game };
type Monster = { id: string; name: string; glyph: string; hp: number; maxHp: number; attack: number; xp: number; gold: number; sleep?:number; fear?:number; confused?:number; charmed?:boolean } & Point;
type Feature = Point & { id:string; kind:"trap"|"fountain"|"altar"|"door"|"chest"|"statue"|"throne"|"pit"|"mirror"; used:boolean };
type Floor = { tiles: string[][]; monsters: Monster[]; items: Item[]; features:Feature[]; stairs: Point; up: Point; start: Point; explored?:boolean[][] };
type Game = {
  floor: number; tiles: string[][]; monsters: Monster[]; items: Item[]; features:Feature[]; stairs: Point; up: Point;
  player: Point & { hp: number; maxHp: number; mana:number; maxMana:number; attack: number; armor: number; strength:number; intelligence:number; wisdom:number; constitution:number; dexterity:number; charisma:number; level: number; xp: number; gold: number; bank: number; potions: number; hasEye: boolean; hasCure: boolean; weapon: string; armorName: string; spells:string[] };
  turn: number; deadline:number; status: "playing" | "won" | "dead"; log: string[]; shopStock:number[]; bag:BagItem[]; awareness:number; objectDetection:number; monsterDetection:number; explored:boolean[][]; gems:number; gemValue:number; monsterHold:number; haste:number; fireResist:number; stealth:number; lifeProtection:number; spiritProtection:number; undeadProtection:number; cursed:boolean; floors:Record<number,Floor>;
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
function blankExplored(){return Array.from({length:H},()=>Array(W).fill(false))}
function revealAround(explored:boolean[][],p:Point,radius=4){for(let y=Math.max(0,p.y-radius);y<=Math.min(H-1,p.y+radius);y++)for(let x=Math.max(0,p.x-radius);x<=Math.min(W-1,p.x+radius);x++)if(Math.hypot(x-p.x,y-p.y)<=radius+.35)explored[y][x]=true}
function doorwayCandidates(tiles:string[][]){const out:Point[]=[];for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){if(tiles[y][x]!==".")continue;const n=tiles[y-1][x]!=="#",s=tiles[y+1][x]!=="#",e=tiles[y][x+1]!=="#",w=tiles[y][x-1]!=="#";if((n&&s&&!e&&!w)||(e&&w&&!n&&!s))out.push({x,y})}return out}
function diversifyPotions(items:Item[],seed:number){const pots=items.filter(i=>i.kind==="potion");if(pots.length<2)return;const allowed=[...POTIONS.slice(0,Math.min(POTIONS.length,12))];for(let i=0;i<pots.length;i++){const j=(Math.abs(seed)+i*7)%allowed.length;const effect=allowed.splice(j,1)[0]??POTIONS[(i+3)%POTIONS.length];pots[i].effect=effect;pots[i].name=`potion of ${effect}`}}

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
  const recentTiers:number[]=[];
  for (let i = 0; i < 4 + level; i++) {
    const p = spot();let tier=0;
    for(let pick=0;pick<8;pick++){const swing=Math.floor(r()*5)-2;const candidate=Math.min(monsterTypes.length-1,Math.max(0,level-1+swing));if(recentTiers.filter(x=>x===candidate).length<2||pick===7){tier=candidate;break}}
    recentTiers.push(tier);if(recentTiers.length>5)recentTiers.shift();const m = monsterTypes[tier];
    const hp = m[2] + Math.floor(r() * 4);
    monsters.push({ id: `m${level}-${i}-${seed}`, name: m[0], glyph: m[1], hp, maxHp: hp, attack: m[3], xp: m[4], gold: m[5], ...p });
  }
  const items: Item[] = [];
  const potionPool=[...POTIONS.slice(0,Math.min(POTIONS.length,8+level))];
  for (let i = 0; i < 3; i++) {const pick=Math.floor(r()*potionPool.length),effect=potionPool.splice(pick,1)[0];items.push({ id: `p${level}-${i}-${seed}`, name: `potion of ${effect}`, glyph: "!", kind: "potion", effect, amount: 1, ...spot() });}
  const scrollPool=[...SCROLLS.slice(0,Math.min(SCROLLS.length,8+level))];
  for (let i = 0; i < 3; i++) {const pick=Math.floor(r()*scrollPool.length),effect=scrollPool.splice(pick,1)[0];items.push({ id: `s${level}-${i}-${seed}`, name: `scroll of ${effect}`, glyph: "?", kind: "scroll", effect, amount: 1, ...spot() });}
  for (let i = 0; i < 3; i++) items.push({ id: `c${level}-${i}-${seed}`, name: "gold", glyph: "$", kind: "gold", amount: 3 + Math.floor(r() * 10), ...spot() });
  for (let i = 0; i < 1+Math.floor(level/4); i++) {const value=25+level*10+Math.floor(r()*40);items.push({id:`gem-${level}-${i}-${seed}`,name:["sapphire","ruby","emerald","diamond"][Math.floor(r()*4)],glyph:"*",kind:"gem",amount:value,...spot()})}
  if(r()<.38){const choices=SPELLS.slice(2,Math.min(SPELLS.length,8+level*2));const spell=choices[Math.floor(r()*choices.length)];items.push({id:`book-${level}-${seed}`,name:`spellbook: ${spell[1]}`,glyph:"+",kind:"spellbook",effect:spell[0],amount:1,...spot()})}
  if (level > 1 && r() > .45) items.push({ id:`w${level}-${seed}`, name: level > 6 ? "longsword" : "spear", glyph:")", kind:"weapon", amount: level > 6 ? 3 : 1, ...spot() });
  if (level > 2 && r() > .5) items.push({ id:`a${level}-${seed}`, name: level > 7 ? "plate armor" : "ring mail", glyph:"[", kind:"armor", amount: level > 7 ? 4 : 2, ...spot() });
  const enchant=Math.max(-1,Math.min(4,Math.floor(level/3)+(r()<.22?-2:Math.floor(r()*2))));
  if(r()<.72){const cursed=enchant<0||r()<.12,bonus=cursed?-1:Math.max(1,enchant);items.push({id:`gear-${level}-${seed}`,name:`${cursed?"cursed ":""}${level>6?"longsword":"spear"} ${bonus>=0?"+":""}${bonus}`,glyph:")",kind:"weapon",amount:bonus,effect:"weapon",cursed,weight:3,...spot()})}
  if(r()<.62){const effects=["strength","dexterity","cleverness","protection"],effect=effects[Math.floor(r()*effects.length)],cursed=r()<.14,bonus=cursed?-1:1+Math.floor(level/5);items.push({id:`ring-${level}-${seed}`,name:`${cursed?"cursed ":""}ring of ${effect} ${bonus>=0?"+":""}${bonus}`,glyph:"=",kind:"ring",amount:bonus,effect,cursed,weight:1,...spot()})}
  if(level>3&&r()<.35){const life=r()<.5;items.push({id:`amulet-${level}-${seed}`,name:life?"amulet of life preservation":"amulet of spell power",glyph:'"',kind:"amulet",amount:1,effect:life?"life":"mana",weight:1,...spot()})}
  if(level>6&&r()<.18){const arts=[{name:"Bessman's Flailing Hammer",effect:"hammer",bonus:6},{name:"Slayer",effect:"slayer",bonus:7},{name:"Vorpal Blade",effect:"vorpal",bonus:8}],a=arts[Math.floor(r()*arts.length)];items.push({id:`artifact-${level}-${seed}`,name:a.name,glyph:")",kind:"artifact",amount:a.bonus,effect:a.effect,weight:4,...spot()})}
  if (level === 10) items.push({ id:`eye-${seed}`, name:"The Eye of Larn", glyph:"~", kind:"eye", amount:1, x:stairs.x, y:stairs.y });
  if (level === LAST_FLOOR) items.push({ id: `cure-${seed}`, name: "Potion of Dianthroritis", glyph: "✦", kind: "cure", amount: 1, x: stairs.x, y: stairs.y });
  const features:Feature[]=[];
  for(let i=0;i<Math.min(3,Math.ceil(level/3));i++){const p=spot();features.push({id:`trap-${level}-${i}-${seed}`,kind:"trap",used:false,...p});tiles[p.y][p.x]="^"}
  if(level>1&&r()>.35){const p=spot();features.push({id:`fountain-${level}-${seed}`,kind:"fountain",used:false,...p});tiles[p.y][p.x]="{"}
  if(level>2&&r()>.5){const p=spot();features.push({id:`altar-${level}-${seed}`,kind:"altar",used:false,...p});tiles[p.y][p.x]="_"}
  const specialKinds=["chest","statue","throne","pit","mirror"] as const;
  for(let i=0;i<2+Math.floor(level/3);i++){const kind=specialKinds[Math.floor(r()*specialKinds.length)],p=spot();features.push({id:`${kind}-${level}-${i}-${seed}`,kind,used:false,...p});tiles[p.y][p.x]=kind==="chest"?"C":kind==="statue"?"&":kind==="throne"?"T":kind==="pit"?"P":"M"}
  const doorways=doorwayCandidates(tiles).filter(p=>!occupied.has(`${p.x},${p.y}`));
  for(let i=0;i<Math.min(3,doorways.length);i++){if(r()<.65){const p=doorways.splice(Math.floor(r()*doorways.length),1)[0];occupied.add(`${p.x},${p.y}`);features.push({id:`door-${level}-${i}-${seed}`,kind:"door",used:false,...p});tiles[p.y][p.x]="+"}}
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
  const explored=Array.from({length:H},()=>Array(W).fill(true));f.explored=explored;
  return { floor: 0, tiles: f.tiles, monsters: f.monsters, items: f.items, features:f.features, stairs: f.stairs, up:f.up,
    player: { ...f.start, hp: 20, maxHp: 20, mana:12,maxMana:12, attack: 2, armor:0, strength:12,intelligence:12,wisdom:12,constitution:12,dexterity:12,charisma:12,level: 1, xp: 0, gold: 250, bank:0, potions: 1, hasEye:false, hasCure: false, weapon:"none", armorName:"clothes",spells:["pro","mle"] },
    turn: 0, deadline:2500,status: "playing", shopStock:DND_STOCK.map(x=>x.stock), bag:[{id:"start-heal",name:"potion of healing",kind:"potion",effect:"healing",qty:1}],awareness:0,objectDetection:0,monsterDetection:0,explored,gems:0,gemValue:0,monsterHold:0,haste:0,fireResist:0,stealth:0,lifeProtection:0,spiritProtection:0,undeadProtection:0,cursed:false,floors:{0:f}, log: ["Welcome to the town of Larn.", "Your daughter is dying of dianthroritis. Find the cure in the volcanic depths."] };
}

function pushLog(g: Game, text: string) { g.log = [text, ...g.log].slice(0, 8); }
function addBag(g:Game,item:BagItem){const stackable=item.kind==="potion"||item.kind==="scroll";const old=stackable?g.bag.find(x=>x.kind===item.kind&&x.effect===item.effect):undefined;if(old)old.qty+=item.qty;else g.bag.push(item)}
function carriedWeight(g:Game){return g.bag.reduce((n,i)=>n+(i.weight??(i.kind==="misc"?8:1))*i.qty,n)}
function carryCapacity(g:Game){return 12+Math.floor(g.player.strength/2)}

export default function Home() {
  const [game, setGame] = useState<Game>(() => freshGame());
  const [sound, setSound] = useState(false);
  const [service,setService]=useState<"none"|"college"|"bank"|"trade"|"spells"|"inventory"|"saves"|"chest">("none");
  const [savedGames,setSavedGames]=useState<SavedGame[]>([]);
  const [saveName,setSaveName]=useState("");

  const update = useCallback((fn: (g: Game) => void) => setGame(prev => { const g = structuredClone(prev); fn(g); return g; }), []);

  const act = useCallback((dx: number, dy: number) => update(g => {
    if (g.status !== "playing") return;
    const nx = g.player.x + dx, ny = g.player.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || g.tiles[ny][nx] === "#") { pushLog(g, "Stone blocks your path."); return; }
    const target = g.monsters.find(m => m.x === nx && m.y === ny);
    if (target) {
      const damage = g.player.attack + Math.floor(Math.random() * 4); target.hp -= damage; pushLog(g, `You strike the ${target.name} for ${damage}.`);
      if (target.hp <= 0) { g.monsters = g.monsters.filter(m => m.id !== target.id); g.player.xp += target.xp;const drops:string[]=[];if(target.gold>0){g.items.push({id:`drop-gold-${target.id}`,name:"monster gold",glyph:"$",kind:"gold",amount:target.gold,x:target.x,y:target.y});drops.push(`${target.gold} gold`)}if(Math.random()<Math.min(.5,.12+g.floor*.025)){const value=30+g.floor*15+Math.floor(Math.random()*60);const name=["sapphire","ruby","emerald","diamond"][Math.floor(Math.random()*4)];g.items.push({id:`drop-gem-${target.id}`,name,glyph:"*",kind:"gem",amount:value,x:target.x,y:target.y});drops.push(`${name} gem`)}pushLog(g, `The ${target.name} falls. +${target.xp} XP${drops.length?`; it drops ${drops.join(" and ")}.`:"; it carried no treasure."}`); }
    } else { g.player.x = nx; g.player.y = ny; }
    const item = g.items.find(i => i.x === g.player.x && i.y === g.player.y);
    if (item) {
      let picked=true;const portable=["potion","scroll","weapon","armor","ring","amulet","artifact"].includes(item.kind),weight=item.weight??(["weapon","armor","artifact"].includes(item.kind)?3:1);
      if(portable&&carriedWeight(g)+weight>carryCapacity(g)){picked=false;pushLog(g,`The ${item.name} is too heavy. Drop something first.`)}
      if (item.kind === "heal") { g.player.potions++; pushLog(g, "You pick up a healing potion."); }
      if (picked&&(item.kind === "potion"||item.kind==="scroll")) {addBag(g,{id:item.id,name:item.name,kind:item.kind,effect:item.effect||"",qty:1,weight});pushLog(g,`You pick up a ${item.name}.`)}
      if (item.kind === "gold") { g.player.gold += item.amount; pushLog(g, `You collect ${item.amount} gold.`); }
      if (item.kind === "gem") { g.gems++;g.gemValue+=item.amount;pushLog(g, `You collect a ${item.name} worth ${item.amount} gold.`); }
      if (item.kind === "cure") { g.player.hasCure = true; pushLog(g, "You found the Potion of Dianthroritis! Return upward."); }
      if (item.kind === "eye") { g.player.hasEye = true; pushLog(g, "You claim the legendary Eye of Larn."); }
      if(picked&&["weapon","armor","ring","amulet","artifact"].includes(item.kind)){addBag(g,{id:item.id,name:item.name,kind:item.kind as BagItem["kind"],effect:item.effect||item.kind,qty:1,bonus:item.amount,cursed:item.cursed,weight});pushLog(g,`You add ${item.name} to your pack${item.cursed?". It radiates an uneasy aura.":"."}`)}
      if(item.kind==="spellbook"&&item.effect){if(g.player.spells.includes(item.effect))pushLog(g,`The ${item.name} contains nothing new.`);else {g.player.spells.push(item.effect);pushLog(g,`You study the ${item.name} and learn a new spell!`)}}
      if(picked)g.items = g.items.filter(i => i.id !== item.id);
    }
    const feature=g.features.find(f=>f.x===g.player.x&&f.y===g.player.y&&!f.used);
    if(feature?.kind==="trap"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";
      const roll=Math.random();
      if(roll<.34){const dmg=3+Math.floor(Math.random()*Math.max(4,g.floor));g.player.hp-=dmg;pushLog(g,`A hidden trap wounds you for ${dmg}.`)}
      else if(roll<.67){g.player.gold=Math.max(0,g.player.gold-20-g.floor*5);pushLog(g,"A trap door scatters some of your gold.")}
      else {g.player.dexterity=Math.max(3,g.player.dexterity-1);pushLog(g,"A dart numbs your limbs. Dexterity falls.")}
    } else if(feature?.kind==="fountain"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";const roll=Math.random();
      if(roll<.18){g.player.strength++;pushLog(g,"The fountain grants supernatural strength.")}else if(roll<.34){g.player.wisdom++;g.player.maxMana+=2;pushLog(g,"The water sharpens your wisdom.")}else if(roll<.5){const n=Math.min(g.player.maxHp-g.player.hp,12+g.floor);g.player.hp+=n;pushLog(g,`The fountain restores ${n} health.`)}else if(roll<.62){g.cursed=false;pushLog(g,"The water washes away a curse.")}else if(roll<.74){g.player.hp=Math.max(1,g.player.hp-8);pushLog(g,"The fountain is poisoned!")}else if(roll<.86){g.player.strength=Math.max(3,g.player.strength-1);pushLog(g,"The water leaves you weakened.")}else {const hp=35+g.floor*3;g.monsters.push({id:`waterlord-${g.turn}`,name:"water lord",glyph:"W",hp,maxHp:hp,attack:7,xp:500,gold:120,x:feature.x,y:Math.max(1,feature.y-1)});pushLog(g,"A water lord rises from the fountain!")}
    } else if(feature?.kind==="altar"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";
      if(g.player.gold>=100){const gift=Math.min(g.player.gold,100+g.floor*20);g.player.gold-=gift;const roll=Math.random();if(roll<.55){g.player.wisdom++;g.player.maxMana+=2;g.player.mana=g.player.maxMana;pushLog(g,`You offer ${gift} gold. The altar grants wisdom.`)}else if(roll<.78){g.lifeProtection=100;pushLog(g,"The altar grants life protection.")}else if(roll<.9){g.cursed=true;g.player.armor=Math.max(0,g.player.armor-1);pushLog(g,"Your offering displeases the altar. You are cursed.")}else{const hp=150;g.monsters.push({id:`demon-${g.turn}`,name:"demon prince",glyph:"P",hp,maxHp:hp,attack:18,xp:25000,gold:0,x:feature.x,y:Math.max(1,feature.y-1)});pushLog(g,"A demon prince answers your prayer!")}}
      else pushLog(g,"The silent altar demands an offering of at least 100 gold.");
    } else if(feature?.kind==="door"){
      feature.used=true;g.tiles[feature.y][feature.x]=".";pushLog(g,"You open the heavy dungeon door.");
    } else if(feature?.kind==="chest"){
      pushLog(g,"A treasure chest is here. Open it or carry it away?");setService("chest");
    } else if(feature?.kind==="statue"){
      pushLog(g,"A stone statue blocks the way. Pulverization or powerful projectile magic may shatter it.");
    } else if(feature?.kind==="throne"){
      feature.used=true;const roll=Math.random();if(roll<.25){const n=1+Math.floor(Math.random()*3),value=n*(60+g.floor*15);g.gems+=n;g.gemValue+=value;pushLog(g,`You pry ${n} gems from the throne, worth ${value} gold.`)}else if(roll<.4){const hp=90+g.floor*4;g.monsters.push({id:`king-${g.turn}`,name:"gnome king",glyph:"K",hp,maxHp:hp,attack:10,xp:3000,gold:2000,x:feature.x,y:Math.max(1,feature.y-1)});pushLog(g,"A gnome king appears to defend the throne!")}else pushLog(g,"The throne yields nothing.");
    } else if(feature?.kind==="pit"){
      feature.used=true;if(Math.random()*20>g.player.dexterity&&g.floor<LAST_FLOOR){const dmg=3+g.floor;g.player.hp-=dmg;g.floors[g.floor]={tiles:g.tiles,monsters:g.monsters,items:g.items,features:g.features,stairs:g.stairs,up:g.up,start:{x:g.player.x,y:g.player.y},explored:g.explored};const n=g.floor+1,f=g.floors[n]??makeFloor(n);g.floors[n]=f;g.floor=n;g.tiles=f.tiles;g.monsters=f.monsters;g.items=f.items;g.features=f.features;g.stairs=f.stairs;g.up=f.up;g.explored=f.explored??blankExplored();g.awareness=0;Object.assign(g.player,f.up);revealAround(g.explored,g.player);pushLog(g,`You fall through to level ${n} and take ${dmg} damage!`)}else pushLog(g,"You balance at the edge of the pit and escape.");
    } else if(feature?.kind==="mirror"){
      pushLog(g,"A dark mirror shimmers. Projectile magic may reflect here.");
    }
    const need = EXPERIENCE[Math.min(g.player.level,EXPERIENCE.length-1)];
    if (g.player.xp >= need) { g.player.level++; g.player.maxHp += 3+Math.floor(g.player.constitution/5); g.player.hp = g.player.maxHp; pushLog(g, `You become a ${RANKS[Math.min(g.player.level-1,RANKS.length-1)]}!`); }
    const tile=g.tiles[g.player.y][g.player.x];
    if (tile === ">" && g.floor < LAST_FLOOR) {
      g.floors[g.floor]={tiles:g.tiles,monsters:g.monsters,items:g.items,features:g.features,stairs:g.stairs,up:g.up,start:{x:g.player.x,y:g.player.y},explored:g.explored};
      const n=g.floor+1,f=g.floors[n]??makeFloor(n);g.floors[n]=f;g.floor=n;g.tiles=f.tiles;g.monsters=f.monsters;g.items=f.items;g.features=f.features??[];g.stairs=f.stairs;g.up=f.up;g.explored=f.explored??blankExplored();g.awareness=0;Object.assign(g.player,f.up);revealAround(g.explored,g.player);pushLog(g, `You descend to ${g.floor<=10?`dungeon level ${g.floor}`:`volcanic level V${g.floor-10}`}.`);
    } else if (tile === "<" && g.floor > 0) {
      g.floors[g.floor]={tiles:g.tiles,monsters:g.monsters,items:g.items,features:g.features,stairs:g.stairs,up:g.up,start:{x:g.player.x,y:g.player.y},explored:g.explored};
      const next=g.floor-1,f=g.floors[next]??(next===0?makeTown():makeFloor(next));g.floors[next]=f;g.floor=next;g.tiles=f.tiles;g.monsters=f.monsters;g.items=f.items;g.features=f.features??[];g.stairs=f.stairs;g.up=f.up;g.explored=f.explored??(next===0?Array.from({length:H},()=>Array(W).fill(true)):blankExplored());g.awareness=0;Object.assign(g.player,next===0?f.start:f.stairs);revealAround(g.explored,g.player);pushLog(g,next===0?"You emerge in the town of Larn.":`You climb to dungeon level ${next}.`);
    } else if(g.floor===0){
      if(tile==="H"){g.player.hp=g.player.maxHp;pushLog(g,g.player.hasCure?"You return home with the cure. Your daughter will live!":"You rest at home and recover your health.");if(g.player.hasCure)g.status="won"}
      if(tile==="S")pushLog(g,"Welcome to the Larn Thrift Shoppe. Select an item to purchase.");
      if(tile==="C"){pushLog(g,"College of Larn: instruction in the mystic arts.");setService("college")}
      if(tile==="B"){pushLog(g,`Bank of Larn: balance ${g.player.bank} gold.`);setService("bank")}
      if(tile==="T"){pushLog(g,"Trading Post: fair prices for used equipment.");setService("trade")}
      if(tile==="R")pushLog(g,"Larn Revenue Service: taxes are inevitable.");
    }
    if(g.monsterHold<=0)g.monsters.forEach(m => {if(m.charmed)return;if((m.sleep??0)>0){m.sleep!--;return}if((m.fear??0)>0){m.fear!--;const sx=Math.sign(m.x-g.player.x),sy=Math.sign(m.y-g.player.y);const tx=m.x+sx,ty=m.y+sy;if(g.tiles[ty]?.[tx]!=="#"){m.x=tx;m.y=ty}return}if((m.confused??0)>0){m.confused!--;const q=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(Math.random()*4)],tx=m.x+q[0],ty=m.y+q[1];if(g.tiles[ty]?.[tx]!=="#"){m.x=tx;m.y=ty}return}
      if (distance(m, g.player) === 1) {const undead=/wraith|vampire/i.test(m.name),spirit=/demon|dragon|water lord/i.test(m.name);const ward=(undead&&g.undeadProtection>0)||(spirit&&g.spiritProtection>0)?4:0; const dmg = Math.max(1, m.attack + Math.floor(Math.random() * 3) - 1-g.player.armor-ward); g.player.hp -= dmg; pushLog(g, `The ${m.name} hits you for ${dmg}${ward?" through your protective ward":""}.`); }
      else if (distance(m, g.player) < 8 && !(g.stealth>0&&distance(m,g.player)>2) && Math.random() < .65) {
        const sx = Math.sign(g.player.x - m.x), sy = Math.sign(g.player.y - m.y); const options = Math.random() > .5 ? [[sx,0],[0,sy]] : [[0,sy],[sx,0]];
        for (const [mx,my] of options) { const tx=m.x+mx, ty=m.y+my; if ((mx||my) && g.tiles[ty]?.[tx] !== "#" && !(tx===g.player.x&&ty===g.player.y) && !g.monsters.some(o=>o.id!==m.id&&o.x===tx&&o.y===ty)) { m.x=tx; m.y=ty; break; } }
      }
    });
    revealAround(g.explored,g.player);if(g.awareness>0)g.awareness--;if(g.objectDetection>0)g.objectDetection--;if(g.monsterDetection>0)g.monsterDetection--;if(g.monsterHold>0)g.monsterHold--;if(g.haste>0)g.haste--;if(g.fireResist>0)g.fireResist--;if(g.stealth>0)g.stealth--;if(g.lifeProtection>0)g.lifeProtection--;if(g.spiritProtection>0)g.spiritProtection--;if(g.undeadProtection>0)g.undeadProtection--;g.turn+=g.haste>0?.5:1;if(Math.floor(g.turn)%8===0){g.player.hp=Math.min(g.player.maxHp,g.player.hp+1);g.player.mana=Math.min(g.player.maxMana,g.player.mana+1)}
    if (g.turn >= g.deadline) { g.status = "dead"; pushLog(g, "Time has run out. Your daughter could not be saved."); }
    else if (g.player.hp <= 0&&g.lifeProtection>0){g.player.hp=1;g.lifeProtection=0;pushLog(g,"Your life-protection ward shatters and saves you from death!")}
    else if (g.player.hp <= 0) { g.player.hp = 0; g.status = "dead"; pushLog(g, "You have fallen beneath Larn."); }
  }), [update]);

  const consumeItem = useCallback((id:string)=>update(g=>{const item=g.bag.find(x=>x.id===id);if(!item||g.status!=="playing")return;const effect=item.effect;
    if(item.kind==="misc"){pushLog(g,"The chest remains sealed. Take it to the Trading Post, or drop it before opening another.");return}
    if(["weapon","armor","ring","amulet","artifact"].includes(item.kind)){if(item.active)return pushLog(g,`${item.name} is already active.`);item.active=true;const b=item.bonus??1;if(item.kind==="weapon"||item.kind==="artifact"){g.player.weapon=item.name;g.player.attack=2+b}else if(item.kind==="armor"){g.player.armorName=item.name;g.player.armor=Math.max(0,b)}else if(item.kind==="ring"){if(effect==="strength")g.player.strength+=b;else if(effect==="dexterity")g.player.dexterity+=b;else if(effect==="cleverness")g.player.intelligence+=b;else if(effect==="protection")g.player.armor=Math.max(0,g.player.armor+b)}else if(item.kind==="amulet"){if(effect==="life")g.lifeProtection=Math.max(g.lifeProtection,250);else {g.player.maxMana+=4;g.player.mana+=4}}if(item.cursed)g.cursed=true;pushLog(g,`${item.name} is now active${item.cursed?"—and it is cursed!":"."}`);return}
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
      else if(effect==="object detection"||effect==="treasure finding"){g.objectDetection=60;pushLog(g,"Objects glow through the darkness.")}
      else if(effect==="monster detection"){g.monsterDetection=60;pushLog(g,"You sense every monster on this level.")}
      else if(effect==="fire resistance"){g.fireResist=80;pushLog(g,"Flames can scarcely touch you.")}
      else if(effect==="learning"){g.player.intelligence+=2;g.player.maxMana+=3}
      else if(effect==="blindness"){g.awareness=0;g.explored=blankExplored();revealAround(g.explored,g.player,1)}
      else if(effect==="confusion"||effect==="dizziness"){g.player.dexterity=Math.max(3,g.player.dexterity-1);pushLog(g,"The world reels around you.")}
      else if(effect==="forgetfulness"){g.player.spells=g.player.spells.slice(0,Math.max(2,g.player.spells.length-1))}
      else if(effect==="see invisible"){g.awareness=80;pushLog(g,"Invisible things become clear.")}
      else pushLog(g,`You drink the potion of ${effect}.`);
    } else {
      if(effect==="enchant weapon")g.player.attack++;
      else if(effect==="enchant armor")g.player.armor++;
      else if(effect==="enlightenment"||effect==="magic mapping"||effect==="expanded awareness"){g.explored=Array.from({length:H},()=>Array(W).fill(true));g.awareness=0;pushLog(g,`${effect} reveals this entire level.`)}
      else if(effect==="teleportation"){const cells=[] as Point[];for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(g.tiles[y][x]!=="#")cells.push({x,y});Object.assign(g.player,cells[Math.floor(Math.random()*cells.length)])}
      else if(effect==="annihilation"){g.monsters=[];pushLog(g,"Every monster on the level is annihilated.")}
      else if(effect==="hold monsters"){g.monsterHold=25;pushLog(g,"The monsters are held motionless.")}
      else if(effect==="create monster"){const p={x:Math.min(W-2,g.player.x+1),y:g.player.y};g.monsters.push({id:`created-${g.turn}`,name:"hobgoblin",glyph:"H",hp:8,maxHp:8,attack:3,xp:10,gold:15,...p});pushLog(g,"A monster materializes!")}
      else if(effect==="gem perfection"){g.gemValue=Math.ceil(g.gemValue*1.5);pushLog(g,"Every carried gem becomes flawless.")}
      else if(effect==="haste monsters"){g.monsterHold=0;g.player.hp=Math.max(1,g.player.hp-2);pushLog(g,"The monsters surge with unnatural speed.")}
      else if(effect==="monster healing"){g.monsters.forEach(m=>m.hp=m.maxHp);pushLog(g,"Every monster is fully healed.")}
      else if(effect==="stealth"){g.stealth=80;pushLog(g,"Your footsteps become silent.")}
      else if(effect==="life protection"){g.lifeProtection=100;pushLog(g,"A ward protects your life force.")}
      else if(effect==="spirit protection"){g.spiritProtection=100;pushLog(g,"A ward shields you from demons, dragons, and spirits.")}
      else if(effect==="undead protection"){g.undeadProtection=100;pushLog(g,"A ward shields you from the undead.")}
      else if(effect==="time warp"){g.turn=Math.max(0,g.turn-100);pushLog(g,"Time bends backward by 100 turns.")}
      else if(effect==="spell extension"){g.monsterHold*=2;g.fireResist*=2;g.stealth*=2}
      else if(effect==="identify"){g.objectDetection=100;pushLog(g,`You identify every carried item${g.cursed?" and discover a curse":""}.`)}
      else if(effect==="remove curse"){g.cursed=false;g.bag.forEach(i=>i.cursed=false);pushLog(g,"The curse dissolves from your equipment.")}
      else if(effect==="pulverization"){g.features.filter(f=>["statue","door","mirror"].includes(f.kind)&&!f.used).forEach(f=>{f.used=true;g.tiles[f.y][f.x]=".";if(f.kind==="statue"&&Math.random()<.6){const choices=SPELLS.filter(s=>!g.player.spells.includes(s[0]));const spell=choices[Math.floor(Math.random()*choices.length)];if(spell)g.items.push({id:`statue-book-${f.id}`,name:`spellbook: ${spell[1]}`,glyph:"+",kind:"spellbook",effect:spell[0],amount:1,x:f.x,y:f.y})}});pushLog(g,"Stone, doors, and mirrors shatter; concealed books may be exposed.")}
      else if(effect==="create artifact"){if(carriedWeight(g)+4>carryCapacity(g))pushLog(g,"An artifact begins to form, but your overloaded pack cannot hold it.");else{addBag(g,{id:`created-artifact-${g.turn}`,name:"conjured artifact blade",kind:"artifact",effect:"conjured",qty:1,bonus:5,weight:4});pushLog(g,"A powerful artifact blade forms in your pack.")}}
      else pushLog(g,`You read the scroll of ${effect}.`);
    }
    item.qty--;if(item.qty<=0)g.bag=g.bag.filter(x=>x.id!==id);g.turn++;
  }),[update]);
  const drink = useCallback(() => {const p=game.bag.find(x=>x.kind==="potion"&&x.effect==="healing");if(p)consumeItem(p.id);else update(g=>pushLog(g,"You have no healing potions."))}, [game.bag,consumeItem,update]);
  const escape = useCallback(() => update(g => { if (g.status !== "playing") return; if (!g.player.hasCure) return pushLog(g, "You cannot finish the quest without the cure."); pushLog(g, "Carry the cure back up through the dungeon to your home in Larn."); }), [update]);
  const restoreGame=useCallback((old:Game)=>{const base=freshGame();const floors=old.floors??base.floors;Object.entries(floors).forEach(([key,f])=>{f.features??=[];diversifyPotions(f.items,Number(key)*97);const bad=f.features.filter(x=>x.kind==="door"&&!x.used);bad.forEach(d=>f.tiles[d.y][d.x]=".");f.features=f.features.filter(x=>x.kind!=="door"||x.used);const candidates=doorwayCandidates(f.tiles).filter(p=>!f.items.some(i=>i.x===p.x&&i.y===p.y)&&!f.monsters.some(m=>m.x===p.x&&m.y===p.y));bad.slice(0,Math.min(3,candidates.length)).forEach((d,i)=>{const p=candidates[i];d.x=p.x;d.y=p.y;f.features.push(d);f.tiles[p.y][p.x]="+"})});const explored=old.explored??(old.floor===0?Array.from({length:H},()=>Array(W).fill(true)):blankExplored());revealAround(explored,old.player);const current=floors[old.floor];setGame({...base,...old,tiles:current?.tiles??old.tiles,items:current?.items??old.items,features:current?.features??old.features,deadline:old.deadline??2500,floors,explored,gems:old.gems??0,gemValue:old.gemValue??0,shopStock:old.shopStock??base.shopStock,player:{...base.player,...old.player,spells:old.player.spells??base.player.spells}})},[]);
  useEffect(()=>{const raw=localStorage.getItem("jeremys-larn-saves");let saves:SavedGame[]=raw?JSON.parse(raw):[];const legacy=localStorage.getItem("jeremys-larn-save");if(legacy&&!localStorage.getItem("jeremys-larn-legacy-migrated")){saves.unshift({id:`legacy-${Date.now()}`,name:"Original save",savedAt:new Date().toISOString(),game:JSON.parse(legacy)});localStorage.setItem("jeremys-larn-legacy-migrated","1");localStorage.setItem("jeremys-larn-saves",JSON.stringify(saves))}setSavedGames(saves)},[]);
  const save = useCallback(() => {const name=saveName.trim()||`Adventure ${savedGames.length+1}`;const entry:SavedGame={id:`save-${Date.now()}`,name,savedAt:new Date().toISOString(),game};const next=[entry,...savedGames];localStorage.setItem("jeremys-larn-saves",JSON.stringify(next));setSavedGames(next);setSaveName("");update(g=>pushLog(g,`Saved as “${name}”.`));},[game,saveName,savedGames,update]);
  const load = useCallback((entry:SavedGame) => {restoreGame(entry.game);setService("none")},[restoreGame]);
  const removeSave=useCallback((id:string)=>{const next=savedGames.filter(s=>s.id!==id);localStorage.setItem("jeremys-larn-saves",JSON.stringify(next));setSavedGames(next)},[savedGames]);
  const openChest=useCallback(()=>update(g=>{const chest=g.features.find(f=>f.kind==="chest"&&!f.used&&f.x===g.player.x&&f.y===g.player.y);if(!chest)return;chest.used=true;g.tiles[chest.y][chest.x]=".";const roll=Math.random();if(roll<.16){const dmg=5+g.floor+Math.floor(Math.random()*7);g.player.hp-=dmg;pushLog(g,`The chest explodes! You take ${dmg} damage.`)}else if(roll<.28){g.player.dexterity=Math.max(3,g.player.dexterity-1);pushLog(g,"A cursed needle causes loss of coordination. Dexterity falls.")}else{const found:string[]=[];const count=2+Math.floor(Math.random()*4);for(let i=0;i<count;i++){const kind=Math.random();if(kind<.25){const gold=20+g.floor*12+Math.floor(Math.random()*80);g.player.gold+=gold;found.push(`${gold} gold`)}else if(kind<.43){const value=35+g.floor*18+Math.floor(Math.random()*70);g.gems++;g.gemValue+=value;found.push(`a gem worth ${value}`)}else if(kind<.65){const effect=POTIONS[Math.floor(Math.random()*Math.min(POTIONS.length,9+g.floor))];addBag(g,{id:`chest-p-${g.turn}-${i}`,name:`potion of ${effect}`,kind:"potion",effect,qty:1});found.push(`potion of ${effect}`)}else if(kind<.84){const effect=SCROLLS[Math.floor(Math.random()*Math.min(SCROLLS.length,9+g.floor))];addBag(g,{id:`chest-s-${g.turn}-${i}`,name:`scroll of ${effect}`,kind:"scroll",effect,qty:1});found.push(`scroll of ${effect}`)}else if(kind<.94){const bonus=1+Math.floor(g.floor/4);if(2+bonus>g.player.attack){g.player.attack=2+bonus;g.player.weapon=bonus>2?"enchanted longsword":"enchanted spear"}found.push(g.player.weapon)}else{const choices=SPELLS.filter(s=>!g.player.spells.includes(s[0]));const spell=choices[Math.floor(Math.random()*choices.length)];if(spell){g.player.spells.push(spell[0]);found.push(`book of ${spell[1]}`)}}}pushLog(g,`Inside: ${found.join(", ")}.`)}setService("none")}),[update]);
  const carryChest=useCallback(()=>update(g=>{const chest=g.features.find(f=>f.kind==="chest"&&!f.used&&f.x===g.player.x&&f.y===g.player.y);if(!chest)return;if(carriedWeight(g)+8>carryCapacity(g))return pushLog(g,"The sealed chest is too heavy. Drop something first.");chest.used=true;g.tiles[chest.y][chest.x]=".";addBag(g,{id:`carried-chest-${g.turn}`,name:"sealed treasure chest",kind:"misc",effect:`chest:${g.floor}`,qty:1,weight:8});pushLog(g,"You pick up the sealed chest. It can be sold at the Trading Post.");setService("none")}),[update]);
  const dropItem=useCallback((id:string)=>update(g=>{const it=g.bag.find(x=>x.id===id);if(!it)return;if(g.items.some(x=>x.x===g.player.x&&x.y===g.player.y)||g.features.some(f=>!f.used&&f.x===g.player.x&&f.y===g.player.y))return pushLog(g,"There is no room to drop that here.");if(it.active&&it.cursed)return pushLog(g,"The cursed item will not leave you!");if(it.active){const b=it.bonus??1;if(it.kind==="ring"){if(it.effect==="strength")g.player.strength-=b;else if(it.effect==="dexterity")g.player.dexterity-=b;else if(it.effect==="cleverness")g.player.intelligence-=b;else if(it.effect==="protection")g.player.armor=Math.max(0,g.player.armor-b)}else if(it.kind==="amulet"&&it.effect==="mana"){g.player.maxMana=Math.max(1,g.player.maxMana-4);g.player.mana=Math.min(g.player.mana,g.player.maxMana)}else if(it.kind==="weapon"||it.kind==="artifact"){g.player.weapon="none";g.player.attack=2}else if(it.kind==="armor"){g.player.armorName="clothes";g.player.armor=0}}if(it.kind==="misc"&&it.effect.startsWith("chest")){g.features.push({id:`dropped-chest-${g.turn}`,kind:"chest",used:false,x:g.player.x,y:g.player.y});g.tiles[g.player.y][g.player.x]="C"}else{const glyph=it.kind==="potion"?"!":it.kind==="scroll"?"?":it.kind==="armor"?"[":it.kind==="ring"?"=":it.kind==="amulet"?'"':")";g.items.push({id:`drop-${it.id}-${g.turn}`,name:it.name,glyph,kind:it.kind as Item["kind"],amount:it.bonus??1,effect:it.effect,cursed:it.cursed,weight:it.weight,x:g.player.x,y:g.player.y})}it.qty--;if(it.qty<=0)g.bag=g.bag.filter(x=>x.id!==id);pushLog(g,`You drop ${it.name}.`)}),[update]);
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
    else if(["mle","ssp","bal","cld","lit","mfi","fgr"].includes(code)){const mirror=g.features.some(f=>f.kind==="mirror"&&!f.used);if(mirror&&Math.random()<.3){const reflected=Math.max(1,tier*4-Math.floor(g.player.armor/2));g.player.hp-=reflected;pushLog(g,`A mirror reflects ${s[1]} back for ${reflected} damage!`)}else{const target=[...g.monsters].sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];if(target){let dmg=tier*6+g.player.intelligence;if(code==="mfi"&&g.fireResist>0)dmg=Math.ceil(dmg*.8);target.hp-=dmg;pushLog(g,`${s[1]} hits the ${target.name} for ${dmg}.`);if(target.hp<=0){g.player.xp+=target.xp;g.monsters=g.monsters.filter(m=>m.id!==target.id);if(target.gold)g.items.push({id:`spell-drop-${target.id}`,name:"monster gold",glyph:"$",kind:"gold",amount:target.gold,x:target.x,y:target.y});pushLog(g,`The ${target.name} dies${target.gold?` and drops ${target.gold} gold.`:"."}`)}}}}
    else if(["hld","stp","web"].includes(code)){g.monsterHold=20+tier*5;pushLog(g,"The monsters freeze in place.")}
    else if(code==="sle"){g.monsters.filter(m=>distance(m,g.player)<9).forEach(m=>m.sleep=18+tier*3);pushLog(g,"Nearby monsters fall asleep.")}
    else if(code==="gen"){const p={x:Math.min(W-2,g.player.x+1),y:g.player.y};g.monsters.push({id:`gen-${g.turn}`,name:"summoned orc",glyph:"O",hp:12,maxHp:12,attack:4,xp:30,gold:25,...p})}
    else if(code==="sph")g.monsters=[];
    else if(code==="tel")Object.assign(g.player,g.up);
    else if(code==="pro"||code==="glo")g.player.armor+=tier;
    else if(code==="str")g.player.strength+=2;else if(code==="dex")g.player.dexterity+=2;else if(code==="enl"){g.explored=Array.from({length:H},()=>Array(W).fill(true));g.awareness=0}else if(code==="cbl"){g.awareness=30;revealAround(g.explored,g.player)}else if(code==="chm"){const m=g.monsters.sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];if(m){m.charmed=true;pushLog(g,`The ${m.name} is charmed and will no longer attack.`)}}else if(code==="sca"){g.monsters.filter(m=>distance(m,g.player)<10).forEach(m=>m.fear=20);pushLog(g,"Nearby monsters flee in terror.")}else if(code==="cnf"){g.monsters.filter(m=>distance(m,g.player)<9).forEach(m=>m.confused=20);pushLog(g,"Nearby monsters stumble in confusion.")}
    pushLog(g,`You cast ${s[1]}.`);g.turn++;
  }),[update]);
  const learn=useCallback((code:string,cost:number)=>update(g=>{if(g.player.spells.includes(code))return;if(g.player.gold<cost)return pushLog(g,"You cannot afford that course.");g.player.gold-=cost;g.player.spells.push(code);pushLog(g,`You learn ${code.toUpperCase()}.`)}),[update]);
  const bankGold=useCallback((deposit:boolean)=>update(g=>{const n=Math.min(100,deposit?g.player.gold:g.player.bank);if(deposit){g.player.gold-=n;g.player.bank+=n}else{g.player.bank-=n;g.player.gold+=n}pushLog(g,`${deposit?"Deposited":"Withdrew"} ${n} gold.`)}),[update]);
  const sell=useCallback(()=>update(g=>{const chest=g.bag.find(x=>x.kind==="misc"&&x.effect.startsWith("chest"));if(chest){const depth=Number(chest.effect.split(":")[1]||1),n=450+depth*175+Math.floor(Math.random()*250);g.player.gold+=n;chest.qty--;if(chest.qty<=0)g.bag=g.bag.filter(x=>x.id!==chest.id);pushLog(g,`The sealed chest sells for ${n} gold.`);return}if(g.player.weapon==="none"&&g.player.armorName==="clothes")return pushLog(g,"You have nothing equipped to sell.");const n=Math.max(10,(g.player.attack+g.player.armor)*20);g.player.gold+=n;g.player.weapon="none";g.player.armorName="clothes";g.player.attack=2;g.player.armor=0;pushLog(g,`Equipment sold for ${n} gold.`)}),[update]);

  useEffect(() => { const onKey=(e:KeyboardEvent) => { if (dirs[e.key]) { e.preventDefault();setService("none");act(dirs[e.key].x, dirs[e.key].y); } if (e.key.toLowerCase()==="q") drink();if(e.key.toLowerCase()==="c")setService("spells");if(e.key.toLowerCase()==="i")setService("inventory"); if (e.key.toLowerCase()==="e") escape(); }; window.addEventListener("keydown",onKey); return()=>window.removeEventListener("keydown",onKey); }, [act,drink,escape]);

  const entities = useMemo(() => { const map=new Map<string,{glyph:string;kind:string;title:string}>(); game.items.forEach(i=>map.set(`${i.x},${i.y}`,{glyph:i.glyph,kind:`item ${i.kind}`,title:i.name})); game.monsters.forEach(m=>map.set(`${m.x},${m.y}`,{glyph:m.glyph,kind:"monster",title:`${m.name} (${m.hp}/${m.maxHp})`})); map.set(`${game.player.x},${game.player.y}`,{glyph:"@",kind:"player",title:"You"}); return map; },[game]);
  const nextXp=EXPERIENCE[Math.min(game.player.level,EXPERIENCE.length-1)],hpPct = 100*game.player.hp/game.player.maxHp, xpPct=100*game.player.xp/nextXp;
  const atStore=game.floor===0&&game.tiles[game.player.y]?.[game.player.x]==="S";

  return <main className="game-shell">
    <header><div><span className="eyebrow">A browser roguelike</span><h1>LARN <b>REBORN</b></h1></div><div className="header-actions"><button onClick={()=>setService("saves")}>Saved games</button><button aria-label="Toggle sound" className={sound?"active":""} onClick={()=>setSound(!sound)}>♪</button></div></header>
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
          {game.tiles.flatMap((row,y)=>row.map((tile,x)=>{const e=entities.get(`${x},${y}`),visible=game.floor===0||game.explored[y]?.[x];if(!visible){const detected=e&&((e.kind==="monster"&&game.monsterDetection>0)||(e.kind.startsWith("item")&&game.objectDetection>0));return <span key={`${x}-${y}`} title={detected?e.title:"Unexplored"} className={detected?`${e.kind} detected`:"unseen"}>{detected?e.glyph:" "}</span>} const townNames:Record<string,string>={H:"Your home",S:"DND Store",C:"College of Larn",B:"Bank of Larn",T:"Trading Post",R:"Larn Revenue Service"};const featureNames:Record<string,string>={"^":"Trap","{":"Fountain","_":"Altar","+":"Door","C":"Chest","&":"Statue","T":"Throne","P":"Pit","M":"Mirror"}; return <span key={`${x}-${y}`} title={e?.title||townNames[tile]||featureNames[tile]} className={e?.kind || (tile==="#"?"wall":tile===">"||tile==="<"||tile==="Ω"?"stairs":featureNames[tile]?"feature":townNames[tile]?"town-place":"floor")}>{e?.glyph || (tile==="#"?"▓":tile)}</span>; }))}
        </div>
        {atStore&&<div className="shop-card"><div className="shop-head"><span>DND STORE · LARN THRIFT SHOPPE</span><strong>{game.player.gold} GP</strong></div><p>Original 12.3 stock and prices. Purchases equip automatically where appropriate.</p><div className="shop-list">{DND_STOCK.map((it,i)=><button key={it.name} disabled={!game.shopStock[i]||game.player.gold<it.price} onClick={()=>buy(it,i)}><span>{it.name}<small>{it.kind}</small></span><b>{it.price} gp</b><em>{game.shopStock[i]}</em></button>)}</div><small className="shop-exit">Move away from the S to leave the store.</small></div>}
        {service!=="none"&&<div className="shop-card"><div className="shop-head"><span>{service==="college"?"COLLEGE OF LARN":service==="bank"?"BANK OF LARN":service==="trade"?"TRADING POST":service==="inventory"?"YOUR INVENTORY":service==="saves"?"SAVED GAMES":service==="chest"?"TREASURE CHEST":"SPELL BOOK"}</span><button onClick={()=>setService("none")}>Close</button></div>
          {service==="chest"&&<div className="inventory-review"><h3>A sealed dungeon chest</h3><p>Opening it may reveal several treasures—or trigger a trap. Carrying it keeps it sealed so it can be sold later.</p><button onClick={openChest}>Open the chest</button><button onClick={carryChest}>Pick up the chest</button></div>}
          {service==="college"&&<div className="shop-list">{SPELLS.map((s,i)=>{const cost=50+(i+1)*35,known=game.player.spells.includes(s[0]);return <button key={s[0]} disabled={known||game.player.gold<cost} onClick={()=>learn(s[0],cost)}><span>{s[1]}<small>{s[0].toUpperCase()}</small></span><b>{cost} gp</b><em>{known?"✓":""}</em></button>})}</div>}
          {service==="bank"&&<div><p>Balance: {game.player.bank} gold. Cash: {game.player.gold} gold.</p><button onClick={()=>bankGold(true)}>Deposit 100</button> <button onClick={()=>bankGold(false)}>Withdraw 100</button></div>}
          {service==="trade"&&<div><p>Sell your currently equipped weapon and armor.</p><button onClick={sell}>Sell equipment</button></div>}
          {service==="spells"&&<div className="shop-list">{game.player.spells.map(code=>{const s=SPELLS.find(x=>x[0]===code)!;return <button key={code} onClick={()=>cast(code)}><span>{s[1]}<small>{code.toUpperCase()}</small></span><b>cast</b></button>})}</div>}
          {service==="inventory"&&<div className="inventory-review"><p><b>Weapon:</b> {game.player.weapon} · attack {game.player.attack}</p><p><b>Armor:</b> {game.player.armorName} · protection {game.player.armor}</p><p><b>Carry weight:</b> {carriedWeight(game)}/{carryCapacity(game)}</p><p><b>Gems:</b> {game.gems} · appraised value {game.gemValue} gold</p><p><b>Quest items:</b> {game.player.hasEye?"Eye of Larn":"—"}{game.player.hasCure?", Potion of Dianthroritis":""}</p><h3>Pack</h3>{game.bag.length?game.bag.map(it=><div className="inventory-item-row" key={it.id}><span>{it.name} × {it.qty}{it.active?" · active":""}{it.cursed?" · cursed":""}</span><button onClick={()=>consumeItem(it.id)}>{it.kind==="potion"?"Drink":it.kind==="scroll"?"Read":["weapon","armor","ring","amulet","artifact"].includes(it.kind)?"Equip":"Inspect"}</button><button onClick={()=>dropItem(it.id)}>Drop</button></div>):<p>Your pack is empty.</p>}<h3>Known spells ({game.player.spells.length})</h3><p>{game.player.spells.map(code=>SPELLS.find(s=>s[0]===code)?.[1]).join(", ")}</p></div>}
          {service==="saves"&&<div className="save-manager"><div className="new-save"><input value={saveName} onChange={e=>setSaveName(e.target.value)} maxLength={32} placeholder={`Adventure ${savedGames.length+1}`} aria-label="Save name"/><button onClick={save}>Save current game</button></div>{savedGames.length===0?<p>No saved games yet.</p>:savedGames.map(s=><div className="save-row" key={s.id}><div><strong>{s.name}</strong><small>{new Date(s.savedAt).toLocaleString()} · Level {s.game.player.level} · {s.game.floor===0?"Town":s.game.floor<=10?`Dungeon ${s.game.floor}`:`Volcano V${s.game.floor-10}`} · {s.game.turn} turns</small></div><button onClick={()=>load(s)}>Load</button><button className="delete-save" onClick={()=>removeSave(s.id)}>Delete</button></div>)}</div>}
        </div>}
        {game.status!=="playing"&&<div className="end-card"><span>{game.status==="won"?"VICTORY":"THE DUNGEON CLAIMS YOU"}</span><h2>{game.status==="won"?"Larn is saved.":"Your quest has ended."}</h2><p>{game.status==="won"?`You recovered the cure in ${game.turn} turns with ${game.player.gold} gold.`:"Begin again. The dungeon will be different."}</p><button onClick={()=>setGame(freshGame())}>New adventure</button></div>}
        <div className="mobile-controls"><button onClick={()=>act(0,-1)}>↑</button><div><button onClick={()=>act(-1,0)}>←</button><button onClick={()=>act(0,1)}>↓</button><button onClick={()=>act(1,0)}>→</button></div></div>
      </section>
      <aside className="panel right-panel">
        <h2>Field Log</h2><div className="log">{game.log.map((l,i)=><p key={`${l}-${i}`} className={i===0?"latest":""}><i>›</i>{l}</p>)}</div>
        <div className="inventory"><h2>Inventory</h2><div className="bag-list">{game.bag.map(it=><button key={it.id} onClick={()=>consumeItem(it.id)}><span className="item-icon">{it.kind==="potion"?"!":"?"}</span><span><strong>{it.name}</strong><small>{it.kind==="potion"?"drink":"read"}</small></span><b>{it.qty}</b></button>)}</div>{game.player.hasEye&&<div className="cure"><span>~</span><strong>The Eye of Larn</strong></div>}{game.player.hasCure&&<div className="cure"><span>✦</span><strong>Potion of Dianthroritis</strong></div>}</div>
        <button className="escape" onClick={()=>setService("inventory")}>Review inventory <kbd>I</kbd></button><button className="escape" onClick={()=>setService("spells")}>Cast spell <kbd>C</kbd></button><button className="escape" onClick={escape} disabled={!game.player.hasCure}>Return to Larn <kbd>E</kbd></button>
      </aside>
    </section>
    <footer><div><kbd>WASD</kbd><kbd>ARROWS</kbd><span>MOVE / ATTACK</span></div><div><kbd>I</kbd><span>INVENTORY</span></div><div><kbd>C</kbd><span>SPELLS</span></div><div><kbd>Q</kbd><span>DRINK POTION</span></div><div className="turns"><span>TIME REMAINING</span><strong>{Math.max(0,game.deadline-game.turn)}</strong></div></footer>
  </main>;
}

function Stat({label,value,pct,tone}:{label:string;value:string;pct:number;tone:string}) { return <div className="meter"><div><span>{label}</span><b>{value}</b></div><i><em className={tone} style={{width:`${Math.max(0,pct)}%`}} /></i></div>; }
