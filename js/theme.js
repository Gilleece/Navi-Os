/* ============================================================
   NAVI-OS — colour themes
   Each theme repaints the phosphor by overriding CSS vars.
   Persisted per session only (in keeping with the notepad).
   ============================================================ */
export const THEMES = {
  atlas: {            // default — green phosphor
    "--green": "#46ff8e", "--green-dim": "#1f7a4a", "--green-ink": "#0c2b1a",
    "--orange": "#ff7a1a", "--grid": "#11271c", "--bg": "#04080a",
    "--panel": "#08120f", "--panel-2": "#0c1a14",
    glow: "70,255,142",
  },
  amber: {            // vintage amber CRT
    "--green": "#ffb642", "--green-dim": "#8a5a13", "--green-ink": "#2b1c05",
    "--orange": "#ff5a1a", "--grid": "#2a1e08", "--bg": "#0a0602",
    "--panel": "#120c04", "--panel-2": "#1a1206",
    glow: "255,182,66",
  },
  ice: {              // cold blue terminal
    "--green": "#5ad4ff", "--green-dim": "#1f6a8a", "--green-ink": "#082330",
    "--orange": "#ff7a1a", "--grid": "#0c2330", "--bg": "#02060a",
    "--panel": "#04121a", "--panel-2": "#08202c",
    glow: "90,212,255",
  },
  blood: {            // red alert
    "--green": "#ff5a6a", "--green-dim": "#8a2130", "--green-ink": "#2b0810",
    "--orange": "#ffb020", "--grid": "#2a0c12", "--bg": "#0a0204",
    "--panel": "#14060a", "--panel-2": "#1e0a10",
    glow: "255,90,106",
  },
  mono: {             // ghost-white monochrome
    "--green": "#d8f0e4", "--green-dim": "#5f7068", "--green-ink": "#1c2420",
    "--orange": "#ffffff", "--grid": "#1a201d", "--bg": "#050807",
    "--panel": "#0a0f0d", "--panel-2": "#121816",
    glow: "216,240,228",
  },
};

export function setTheme(name){
  const t = THEMES[name];
  if (!t) return false;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(t)) if (k.startsWith("--")) root.setProperty(k, v);
  document.body.style.textShadow = `0 0 6px rgba(${t.glow},.35)`;
  document.documentElement.dataset.theme = name;
  return true;
}
