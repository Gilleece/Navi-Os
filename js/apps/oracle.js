/* ============================================================
   NAVI-OS — ORACLE.EXE
   A small piece of interactive fiction set in the wired. A tiny
   parser (look / go / take / use / examine / inventory) over a
   handful of rooms. Find the cipher key, open the core.
   ============================================================ */
import { $ } from "../utils.js";

const ITEMS = {
  key:      { name:"cipher key",      desc:"A shard of cold light. It hums, as if a lock somewhere above is calling to it." },
  fragment: { name:"memory fragment", desc:"Someone else's memory — a summer you never had. Warm, and not yours." },
};
const ROOMS = {
  jackin: { name:"LAYER 00 · JACK-IN POINT",
    desc:"A white room with no far wall. Your body is elsewhere; only the idea of you is here.\nA corridor of light runs NORTH into the wired.",
    exits:{ north:"hub" } },
  hub: { name:"LAYER 01 · THE HUB",
    desc:"Four corridors meet in a slow-turning column of static. Signs flicker in a language you almost remember.\nThe ARCHIVE lies EAST, a signal TOWER WEST, a chapel NORTH. The jack-in point is back SOUTH.",
    exits:{ south:"jackin", east:"archive", west:"tower", north:"chapel" } },
  archive: { name:"LAYER 02 · DEAD ARCHIVE",
    desc:"Endless shelves of drives, each degaussed to silence. On a reading pedestal a single CIPHER KEY waits, as if left for you.\nThe hub is WEST.",
    exits:{ west:"hub" }, items:["key"] },
  chapel: { name:"LAYER 02 · SILENT CHAPEL",
    desc:"A server hall someone made holy. Cooling fans breathe like a congregation. A MEMORY FRAGMENT glows on the altar.\nThe hub is SOUTH.",
    exits:{ south:"hub" }, items:["fragment"] },
  tower: { name:"LAYER 03 · SIGNAL TOWER",
    desc:"A spire of antennae singing to a dead sky. A sealed gate leads UP, locked behind a cipher.\nThe hub is EAST.",
    exits:{ east:"hub" }, locks:{ up:{ to:"core", needs:"key" } } },
  core: { name:"LAYER 04 · THE CORE",
    desc:"The signal resolves. For one clean second you see the whole wired at once — and it sees you back.",
    exits:{}, win:true },
};
const DIRS = { n:"north", s:"south", e:"east", w:"west", u:"up", d:"down",
  north:"north", south:"south", east:"east", west:"west", up:"up", down:"down" };

let out, input, here, inv, roomItems, unlocked, started, won;

function print(text = "", cls = ""){
  const d = document.createElement("div");
  d.className = "ora-line" + (cls ? " " + cls : "");
  d.textContent = text; out.appendChild(d); out.scrollTop = out.scrollHeight;
}
const itemId = s => { if (!s) return null; if (ITEMS[s]) return s; for (const k in ITEMS) if (ITEMS[k].name.includes(s) || s.includes(k)) return k; return null; };

function look(){
  const r = ROOMS[here];
  print(r.name, "accent");
  r.desc.split("\n").forEach(l => print(l));
  const its = roomItems[here] || [];
  if (its.length) print("you see: " + its.map(i => ITEMS[i].name).join(", "), "item");
  const ex = [...Object.keys(r.exits), ...(r.locks ? Object.keys(r.locks) : [])];
  if (ex.length) print("exits: " + ex.join(", "), "dim");
}
function postMove(){
  print(""); look();
  if (ROOMS[here].win){ won = true; print(""); print("// SIGNAL ACQUIRED — you have reached the core.", "win"); print("type 'reset' to descend again.", "dim"); }
}
function goDir(dir){
  if (!dir) return print("go where?", "err");
  const r = ROOMS[here];
  if (r.locks && r.locks[dir]){
    if (unlocked[here + dir]){ here = r.locks[dir].to; postMove(); }
    else print(`the gate ${dir} is sealed by a cipher lock. something must open it.`, "err");
    return;
  }
  const to = r.exits[dir];
  if (!to) return print("no exit " + dir + ".", "err");
  here = to; postMove();
}
function take(arg){
  const its = roomItems[here] || [];
  const id = itemId(arg) || (its.length === 1 && !arg ? its[0] : null);
  if (!id || !its.includes(id)) return print(`there's no ${arg || "thing"} to take here.`, "err");
  its.splice(its.indexOf(id), 1); inv.push(id); print("taken: " + ITEMS[id].name, "item");
}
function dropItem(arg){
  const id = itemId(arg);
  if (!id || !inv.includes(id)) return print("you aren't carrying that.", "err");
  inv.splice(inv.indexOf(id), 1); (roomItems[here] = roomItems[here] || []).push(id); print("dropped: " + ITEMS[id].name, "dim");
}
function use(arg){
  const id = itemId(arg);
  if (!id || !inv.includes(id)) return print("you aren't carrying that.", "err");
  const r = ROOMS[here];
  if (r.locks) for (const dir in r.locks) if (r.locks[dir].needs === id){
    unlocked[here + dir] = true; return print(`the ${ITEMS[id].name} fits. the gate ${dir} unlocks with a sigh.`, "item");
  }
  print(`nothing here responds to the ${ITEMS[id].name}.`, "dim");
}
function examine(arg){
  const id = itemId(arg);
  if (id && (inv.includes(id) || (roomItems[here] || []).includes(id))) return print(ITEMS[id].desc);
  look();
}
function showInv(){ inv.length ? print("carrying: " + inv.map(i => ITEMS[i].name).join(", "), "item") : print("you carry nothing but yourself.", "dim"); }
function help(){ print("verbs: look · go <dir> (n/s/e/w/u/d) · take · drop · use · examine · inventory · reset", "accent"); }

function reset(){
  here = "jackin"; inv = []; roomItems = {}; unlocked = {}; won = false;
  for (const k in ROOMS) roomItems[k] = [...(ROOMS[k].items || [])];
  out.innerHTML = "";
  print("ORACLE.EXE — interactive fiction protocol", "accent");
  print("a fragment of the wired. type 'help' for verbs.", "dim");
  print(""); look();
}
function run(raw){
  print("> " + raw, "cmd");
  if (won && !/^(reset|restart|help|\?)/i.test(raw)) return print("the core holds you. type 'reset' to jack in again.", "dim");
  const parts = raw.toLowerCase().trim().split(/\s+/);
  let verb = parts[0], arg = parts.slice(1).join(" ");
  if (DIRS[verb]){ arg = DIRS[verb]; verb = "go"; }
  else if ((verb === "go" || verb === "move" || verb === "walk") && DIRS[arg]) arg = DIRS[arg];
  switch (verb){
    case "look": case "l": look(); break;
    case "go": case "move": case "walk": goDir(arg); break;
    case "take": case "get": case "grab": take(arg); break;
    case "drop": dropItem(arg); break;
    case "use": use(arg); break;
    case "examine": case "x": case "inspect": examine(arg); break;
    case "inventory": case "i": case "inv": showInv(); break;
    case "help": case "?": help(); break;
    case "reset": case "restart": reset(); break;
    default: print(`the wired does not understand '${verb}'.`, "err");
  }
}

export function initOracle(){
  const win = $("#win-oracle"); out = $("#oracle-out"); input = $("#oracle-input");
  if (!win || !input) return;
  input.addEventListener("keydown", e => { if (e.key === "Enter"){ const v = input.value.trim(); input.value = ""; if (v) run(v); } });
  const sync = () => { if (win.classList.contains("open")){ if (!started){ started = true; reset(); } input.focus(); } };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
}
