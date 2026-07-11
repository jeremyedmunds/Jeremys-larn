// Values transcribed from the Larn 12.3 source distribution (data.c/store.c).
export const EXPERIENCE = [0,10,20,40,80,160,320,640,1280,2560,5120,10240,20480,40960,100000,200000,400000,700000,1000000];

export const RANKS = [
  "novice explorer","apprentice explorer","practiced explorer","expert explorer",
  "novice adventurer","adventurer","apprentice conjurer","conjurer","master conjurer",
  "apprentice mage","mage","experienced mage","master mage","apprentice warlord",
  "novice warlord","expert warlord","master warlord","apprentice gorgon","gorgon"
];

export type ShopItem = { name:string; price:number; stock:number; kind:"weapon"|"armor"|"potion"|"misc"; power?:number; effect?:string };
export const DND_STOCK: ShopItem[] = [
  {name:"dagger",price:2,stock:3,kind:"weapon",power:1},
  {name:"spear",price:20,stock:3,kind:"weapon",power:2},
  {name:"flail",price:80,stock:2,kind:"weapon",power:3},
  {name:"battle axe",price:150,stock:2,kind:"weapon",power:4},
  {name:"longsword",price:450,stock:2,kind:"weapon",power:5},
  {name:"two handed sword",price:1000,stock:2,kind:"weapon",power:6},
  {name:"sunsword",price:5000,stock:1,kind:"weapon",power:8},
  {name:"lance of death",price:16500,stock:1,kind:"weapon",power:12},
  {name:"leather armor",price:25,stock:3,kind:"armor",power:1},
  {name:"ring mail",price:100,stock:2,kind:"armor",power:2},
  {name:"chain mail",price:200,stock:2,kind:"armor",power:3},
  {name:"plate mail",price:500,stock:1,kind:"armor",power:5},
  {name:"potion of sleep",price:20,stock:6,kind:"potion",effect:"sleep"},
  {name:"potion of healing",price:90,stock:5,kind:"potion",effect:"healing"},
  {name:"potion of raise level",price:520,stock:1,kind:"potion",effect:"raise level"},
  {name:"potion of increase ability",price:100,stock:2,kind:"potion",effect:"increase ability"},
  {name:"potion of wisdom",price:50,stock:2,kind:"potion",effect:"wisdom"},
  {name:"potion of strength",price:150,stock:2,kind:"potion",effect:"strength"},
  {name:"potion of raise charisma",price:70,stock:1,kind:"potion",effect:"charisma"},
  {name:"fortune cookie",price:10,stock:3,kind:"misc"},
];

export const SPELLS = [
  ["pro","protection"],["mle","magic missile"],["dex","dexterity"],["sle","sleep"],
  ["chm","charm monster"],["ssp","sonic spear"],["web","web"],["str","strength"],
  ["enl","enlightenment"],["hel","healing"],["cbl","cure blindness"],["cre","create monster"],
  ["pha","phantasmal forces"],["inv","invisibility"],["bal","fireball"],["cld","cold"],
  ["ply","polymorph"],["can","cancellation"],["has","haste self"],["ckl","cloud kill"],
  ["vpr","vaporize rock"],["dry","dehydration"],["lit","lightning"],["drl","drain life"],
  ["glo","invulnerability"],["flo","flood"],["fgr","finger of death"],["sca","scare monster"],
  ["hld","hold monster"],["stp","time stop"],["tel","teleport away"],["mfi","magic fire"],
  ["sph","sphere of annihilation"],["gen","genocide"],["sum","summon demon"],
  ["wtw","walk through walls"],["alt","alter reality"],["per","permanence"]
] as const;
