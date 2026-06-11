/* ============================================================
   NAVI-OS — CALCULATOR
   ============================================================ */
import { $ } from "../utils.js";

const calc = (a,b,op) => op==="+"?a+b : op==="-"?a-b : op==="*"?a*b : b===0?NaN:a/b;
const fmt = v => {
  if (!isFinite(v) || isNaN(v)) return "ERR";
  let s = String(Math.round(v * 1e10) / 1e10);
  return s.length > 14 ? v.toExponential(6) : s;
};

export function initCalculator(){
  const disp = $("#calc-display");
  let acc = null, pend = null, cur = "0", fresh = true;

  function calcKey(k){
    if (/\d/.test(k)){ cur = (fresh || cur === "0") ? k : cur + k; fresh = false; }
    else if (k === "."){ if (fresh){ cur = "0."; fresh = false; } else if (!cur.includes(".")) cur += "."; }
    else if (k === "C"){ acc = pend = null; cur = "0"; fresh = true; }
    else if (k === "±"){ cur = String(-parseFloat(cur) || 0); }
    else if (k === "%"){ cur = String(parseFloat(cur) / 100); }
    else if (k === "="){
      if (pend !== null && acc !== null){ cur = fmt(calc(acc, parseFloat(cur), pend)); acc = pend = null; fresh = true; }
    } else { // operator
      if (pend !== null && acc !== null && !fresh) acc = calc(acc, parseFloat(cur), pend);
      else if (acc === null) acc = parseFloat(cur);
      pend = k; fresh = true; cur = fmt(acc);
    }
    disp.textContent = cur;
  }
  $("#calc-keys").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) calcKey(b.dataset.k); });
}
