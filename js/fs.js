/* ============================================================
   NAVI-OS — virtual filesystem
   A tiny JSON tree of directories and UTF-8 text files, held
   in memory and mirrored to store (key "fs"). It is a single
   ES-module instance, so FILES.SYS, TERM.EXE and NOTEPAD all
   share the same live tree — no app can corrupt another's view.
   The whole API degrades to error strings and never throws;
   individual files are capped so a runaway write can't blow
   the localStorage quota on its own.
   ============================================================ */
import { store } from "./store.js";

const MAX_FILE = 64 * 1024;   // ~64KB per file, keeps quota sane

/* ----- tree shape -----------------------------------------
   dir  = { type:"dir",  children:{ name: node, ... } }
   file = { type:"file", content:"<utf-8 text>" }          */

/* first-run disk image — welcome, notes stub, ascii art,
   a system motd and a hidden easter egg for the curious. */
function seedTree(){
  const file = content => ({ type:"file", content });
  const dir  = children => ({ type:"dir", children });
  return dir({
    home: dir({
      operator: dir({
        "readme.txt": file(
`welcome, operator.

this is your slice of the wired — a small disk that
survives reload. it lives in this browser, nowhere else.

  /home/operator       your files
  /home/operator/art   ascii, for the eyes
  /sys/motd            message of the day

open FILES.SYS to browse, or press \` for a shell:
  ls · cd · cat · touch · mkdir · rm · tree
  echo <text> > file   writes · >> appends

nothing here is backed up. close the world, open the next.
`),
        "notes.txt": file(""),
        art: dir({
          "sigil.txt": file(
`        /\\
       /  \\
      / /\\ \\
     / /  \\ \\
    / /    \\ \\
   / /______\\ \\
  /____________\\

     navi // atlas
`),
          "lain.txt": file(
`  .------------------.
  |  present  day    |
  |  present  time   |
  '--------.  .------'
           \\/
    let's all love lain
`),
        }),
        ".secret": file(
`you found the layer under the layer.

present day. present time.
if no one remembers you, were you ever online?

the walls of the maze remember. so does this file.
  lain was here / lain is here / lain will be here
`),
      }),
    }),
    sys: dir({
      motd: file("the wired does not forget. neither should you.\n"),
    }),
  });
}

/* load once; a bad/absent record re-seeds a fresh disk */
let tree = load();
function load(){
  const saved = store.get("fs", null);
  if (saved && saved.type === "dir" && saved.children) return saved;
  const fresh = seedTree();
  store.set("fs", fresh);
  return fresh;
}

/* mirror the in-memory tree back to storage; store swallows
   quota errors, so a failed persist quietly degrades to
   session-only rather than throwing. */
function persist(){
  try{ store.set("fs", tree); return true; }
  catch(e){ return false; }
}

/* ----- path helpers ---------------------------------------- */
/* collapse ., .., // and return an absolute, tidy path */
export function fsNormalize(path){
  const stack = [];
  for (const seg of String(path).split("/")){
    if (seg === "" || seg === ".") continue;
    if (seg === ".."){ stack.pop(); continue; }
    stack.push(seg);
  }
  return "/" + stack.join("/");
}
/* resolve rel against base (rel may itself be absolute) */
export function fsJoin(base, rel){
  const r = String(rel == null ? "" : rel);
  return r.startsWith("/") ? fsNormalize(r) : fsNormalize(base + "/" + r);
}
export function fsParent(path){
  const n = fsNormalize(path);
  const i = n.lastIndexOf("/");
  return i <= 0 ? "/" : n.slice(0, i);
}
export function fsBase(path){
  const n = fsNormalize(path);
  return n === "/" ? "/" : n.slice(n.lastIndexOf("/") + 1);
}

/* ----- traversal ------------------------------------------- */
function getNode(path){
  const norm = fsNormalize(path);
  if (norm === "/") return tree;
  let node = tree;
  for (const seg of norm.slice(1).split("/")){
    if (!node || node.type !== "dir") return null;
    node = node.children[seg];
    if (!node) return null;
  }
  return node || null;
}
function byteLen(str){ return new TextEncoder().encode(str).length; }

/* ----- queries --------------------------------------------- */
export function fsExists(path){ return getNode(path) !== null; }
export function fsIsDir(path){ const n = getNode(path); return !!n && n.type === "dir"; }

/* read a text file — content string, or null if missing/dir */
export function fsRead(path){
  const n = getNode(path);
  if (n && n.type === "file" && fsNormalize(path) === "/home/operator/.secret") dispatchEvent(new CustomEvent("navi-secret-read"));
  return n && n.type === "file" ? n.content : null;
}

/* list a directory — dirs first, then files, both A→Z.
   dotfiles are omitted unless showHidden. returns an array of
   { name, dir, size } (size = bytes for files, child count for
   dirs), or null if the path is not a directory. */
export function fsList(path, showHidden = false){
  const n = getNode(path);
  if (!n || n.type !== "dir") return null;
  const rows = [];
  for (const [name, child] of Object.entries(n.children)){
    if (!showHidden && name.startsWith(".")) continue;
    const dir = child.type === "dir";
    rows.push({ name, dir, size: dir ? Object.keys(child.children).length : byteLen(child.content) });
  }
  rows.sort((a, b) => (a.dir === b.dir) ? a.name.localeCompare(b.name) : (a.dir ? -1 : 1));
  return rows;
}

/* ----- mutations (return null on success, else an error) --- */
export function fsWrite(path, text){
  const norm = fsNormalize(path);
  if (norm === "/") return "cannot write to root";
  const str = String(text == null ? "" : text);
  if (byteLen(str) > MAX_FILE) return "file too large (max 64KB)";
  const existing = getNode(norm);
  if (existing && existing.type === "dir") return "is a directory: " + norm;
  const parent = getNode(fsParent(norm));
  if (!parent || parent.type !== "dir") return "no such directory: " + fsParent(norm);
  const name = fsBase(norm);
  const prev = parent.children[name];
  parent.children[name] = { type:"file", content: str };
  if (!persist()){
    if (prev) parent.children[name] = prev; else delete parent.children[name];
    return "write failed: storage full";
  }
  return null;
}

export function fsMkdir(path){
  const norm = fsNormalize(path);
  if (norm === "/") return "cannot create root";
  if (getNode(norm)) return "already exists: " + norm;
  const parent = getNode(fsParent(norm));
  if (!parent || parent.type !== "dir") return "no such directory: " + fsParent(norm);
  const name = fsBase(norm);
  parent.children[name] = { type:"dir", children:{} };
  if (!persist()){ delete parent.children[name]; return "mkdir failed: storage full"; }
  return null;
}

export function fsRm(path){
  const norm = fsNormalize(path);
  if (norm === "/") return "cannot remove root";
  const parent = getNode(fsParent(norm));
  const name = fsBase(norm);
  if (!parent || parent.type !== "dir" || !parent.children[name]) return "no such path: " + norm;
  const prev = parent.children[name];
  delete parent.children[name];
  if (!persist()){ parent.children[name] = prev; return "rm failed: storage full"; }
  return null;
}

/* rename an entry in place (newName is a bare name, no slash) */
export function fsRename(path, newName){
  const norm = fsNormalize(path);
  if (norm === "/") return "cannot rename root";
  const name = String(newName || "").trim();
  if (!name || name.includes("/")) return "invalid name: " + newName;
  const parent = getNode(fsParent(norm));
  const old = fsBase(norm);
  if (!parent || parent.type !== "dir" || !parent.children[old]) return "no such path: " + norm;
  if (name === old) return null;
  if (parent.children[name]) return "already exists: " + name;
  parent.children[name] = parent.children[old];
  delete parent.children[old];
  if (!persist()){
    parent.children[old] = parent.children[name];
    delete parent.children[name];
    return "rename failed: storage full";
  }
  return null;
}
