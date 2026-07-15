/* ============================================================
   MAZE.EXE — HUD toast
   One centre-screen flash. Three near-identical helpers used to
   own #hud-msg — toast() in dialogue.js, toast() in entities.js
   and hudMsg() in maze.js — each with its own timer. They funnel
   here now, so the shared element and its timing live in one place.
     opts.ms  on-screen time (ms)
     opts.vr  also mirror the line to the head-locked VR banner
              (vrbanner.js; only shows while in VR)
   ============================================================ */
import { $ } from "../../utils.js";
import { showVRBanner } from "./vrbanner.js";

export function toast(msg, { ms = 1600, vr = false } = {}){
  if (vr) showVRBanner(msg, ms);
  const el = $("#hud-msg");
  if (!el) return;
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), ms);
}
