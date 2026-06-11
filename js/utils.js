/* ============================================================
   NAVI-OS — shared DOM helpers
   ============================================================ */
export const $  = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const isMobile = () => matchMedia("(max-width:760px)").matches;
