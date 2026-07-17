/* ============================================================
   NAVI-OS — FILES.SYS
   A small explorer over the virtual filesystem (js/fs.js):
   a clickable breadcrumb, a dirs-first listing with a hidden-
   file toggle, and a text viewer/editor with save. new / dir /
   rename / delete drive the same disk the shell and notepad
   share, so the tree stays consistent everywhere.
   ============================================================ */
import { $ } from "../utils.js";
import { notify } from "../notify.js";
import {
  fsList, fsRead, fsWrite, fsMkdir, fsRm, fsRename,
  fsExists, fsIsDir, fsJoin, fsParent, fsBase,
} from "../fs.js";

let cwd = "/home/operator";
let selected = null;          // path of the open file, or null
let showHidden = false;
let listEl, crumbEl, viewEl, nameEl, saveBtn, hiddenBtn;

function fmtSize(n){ return n < 1024 ? n + "b" : (n / 1024).toFixed(1) + "k"; }

/* ----- breadcrumb ------------------------------------------ */
function renderCrumb(){
  crumbEl.textContent = "";
  const seg = (label, path) => {
    const b = document.createElement("button");
    b.className = "files-seg"; b.textContent = label;
    b.addEventListener("click", () => go(path));
    return b;
  };
  crumbEl.appendChild(seg("/", "/"));
  let acc = "";
  for (const s of cwd.split("/").filter(Boolean)){
    acc += "/" + s;
    const sp = document.createElement("span");
    sp.className = "files-sep"; sp.textContent = "/";
    crumbEl.append(sp, seg(s, acc));
  }
}

/* ----- listing --------------------------------------------- */
function row(label, dir, path, meta, isUp){
  const b = document.createElement("button");
  b.className = "files-row" + (dir ? " dir" : "") + (path === selected ? " sel" : "");
  b.setAttribute("role", "option");
  const nm = document.createElement("span");
  nm.className = "files-name"; nm.textContent = dir && !isUp ? label + "/" : label;
  const mt = document.createElement("span");
  mt.className = "files-meta"; mt.textContent = meta;
  b.append(nm, mt);
  b.addEventListener("click", () => { if (dir) go(path); else openFile(path); });
  return b;
}

function renderList(){
  listEl.textContent = "";
  if (cwd !== "/") listEl.appendChild(row("..", true, fsParent(cwd), "UP", true));
  const entries = fsList(cwd, showHidden) || [];
  for (const e of entries){
    const full = fsJoin(cwd, e.name);
    listEl.appendChild(row(e.name, e.dir, full, e.dir ? "DIR" : fmtSize(e.size), false));
  }
}

function render(){ renderCrumb(); renderList(); }

/* ----- navigation + editor --------------------------------- */
function go(path){
  cwd = fsIsDir(path) ? path : fsParent(path);
  clearEditor();
  render();
  listEl.querySelector(".files-row")?.focus();
}

function clearEditor(){
  selected = null;
  viewEl.value = "";
  viewEl.disabled = true;
  saveBtn.disabled = true;
  nameEl.textContent = "no file";
}

function openFile(path){
  const c = fsRead(path);
  if (c === null){ notify("FILES.SYS", "cannot read " + fsBase(path)); return; }
  selected = path;
  viewEl.value = c;
  viewEl.disabled = false;
  saveBtn.disabled = false;
  nameEl.textContent = fsBase(path);
  renderList();          // refresh the .sel highlight
  viewEl.focus();
}

function save(){
  if (!selected) return;
  const err = fsWrite(selected, viewEl.value);
  if (err){ notify("FILES.SYS", err); return; }
  notify("FILES.SYS", "saved " + fsBase(selected));
  renderList();          // size may have changed
}

/* ----- toolbar actions ------------------------------------- */
function newFile(){
  const name = (prompt("new file name:") || "").trim();
  if (!name) return;
  const path = fsJoin(cwd, name);
  if (fsExists(path)){ notify("FILES.SYS", "already exists: " + name); return; }
  const err = fsWrite(path, "");
  if (err){ notify("FILES.SYS", err); return; }
  render();
  openFile(path);
}

function newDir(){
  const name = (prompt("new directory name:") || "").trim();
  if (!name) return;
  const err = fsMkdir(fsJoin(cwd, name));
  if (err){ notify("FILES.SYS", err); return; }
  render();
}

/* rename / delete act on the open file, or on the current
   directory when nothing is open — so folders are reachable too */
function rename(){
  const target = selected || cwd;
  if (target === "/"){ notify("FILES.SYS", "cannot rename root"); return; }
  const cur = fsBase(target);
  const name = (prompt("rename to:", cur) || "").trim();
  if (!name || name === cur) return;
  const err = fsRename(target, name);
  if (err){ notify("FILES.SYS", err); return; }
  const np = fsJoin(fsParent(target), name);
  if (target === cwd){ cwd = np; clearEditor(); render(); }
  else { render(); openFile(np); }
}

function del(){
  const target = selected || cwd;
  if (target === "/"){ notify("FILES.SYS", "cannot remove root"); return; }
  if (!confirm("delete " + target + " — this cannot be undone. proceed?")) return;
  const err = fsRm(target);
  if (err){ notify("FILES.SYS", err); return; }
  if (target === cwd) cwd = fsParent(cwd);
  clearEditor();
  render();
}

function toggleHidden(){
  showHidden = !showHidden;
  hiddenBtn.setAttribute("aria-pressed", String(showHidden));
  hiddenBtn.textContent = showHidden ? "HIDE .*" : "SHOW .*";
  renderList();
}

/* arrow-key movement between rows keeps the list usable */
function onListKey(e){
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const rows = [...listEl.querySelectorAll(".files-row")];
  const i = rows.indexOf(document.activeElement);
  const next = e.key === "ArrowDown" ? i + 1 : i - 1;
  if (rows[next]){ e.preventDefault(); rows[next].focus(); }
}

export function initFiles(){
  listEl = $("#files-list"); crumbEl = $("#files-crumb"); viewEl = $("#files-view");
  nameEl = $("#files-name"); saveBtn = $("#files-save"); hiddenBtn = $("#files-hidden");
  if (!listEl) return;

  $("#files-new").addEventListener("click", newFile);
  $("#files-newdir").addEventListener("click", newDir);
  $("#files-rename").addEventListener("click", rename);
  $("#files-del").addEventListener("click", del);
  hiddenBtn.addEventListener("click", toggleHidden);
  saveBtn.addEventListener("click", save);
  listEl.addEventListener("keydown", onListKey);
  /* ctrl+s saves without reaching for the button */
  viewEl.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s"){ e.preventDefault(); save(); }
  });

  clearEditor();
  render();

  /* re-read the disk whenever the window is (re)opened, so
     edits made in the shell or notepad show up immediately */
  const win = $("#win-files");
  if (win){
    let wasOpen = win.classList.contains("open");
    new MutationObserver(() => {
      const open = win.classList.contains("open");
      if (open && !wasOpen){
        if (selected && !fsExists(selected)) clearEditor();
        else if (selected) viewEl.value = fsRead(selected) ?? "";
        render();
      }
      wasOpen = open;
    }).observe(win, { attributes:true, attributeFilter:["class"] });
  }
}
