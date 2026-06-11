# NAVI-OS

A retro OS inspired website designed to mimic a desktop running in ther browser with a boot sequence,
draggable/minimisable windows, taskbar, clock, and a first-person Three.js maze with WebXR support. The site is intended to be as a showcase/hub for personal projects and overall just a fun way of messing with interesting frontend. Currently it's pure html/js, considering moving in future to a framework but that depends on how much it expands.

## Project structure

```
.
├── index.html            # markup only: boot, desktop, taskbar, maze overlay
├── css/
│   └── styles.css        # all styling (CRT overlay, windows, taskbar, maze HUD)
└── js/
    ├── main.js           # entry point — imports and initialises every module
    ├── utils.js          # shared DOM helpers ($, $$, isMobile)
    ├── boot.js           # boot sequence + "jack in" to the desktop
    ├── clock.js          # live taskbar clock
    ├── windows.js        # window manager: open/close/focus/drag + taskbar tasks
    └── apps/
        ├── calendar.js   # month grid + date selection
        ├── notepad.js    # session-only scratch text
        ├── calculator.js # 4-function calculator
        └── maze.js       # MAZE.EXE — Three.js labyrinth (desktop / touch / VR)
```

The JavaScript is split into native **ES modules** (`<script type="module">`), so the
site must be served over `http(s)://` — for example GitHub Pages or any static
server. Opening `index.html` directly from the file system (`file://`) will not work
because browsers block module loading over that protocol.

## Running locally

From the project root, start any static server, e.g.:

```sh
python -m http.server 8000
```

then open <http://localhost:8000>.

## Where to edit things

- **Your details** — `index.html`, the `#win-about` and `#win-projects` sections.
- **Look & feel** — `css/styles.css` (the colour palette lives in `:root` at the top).
- **A specific program** — its file under `js/apps/`.
- **Boot text** — the `BOOT_LINES` array in `js/boot.js`.

Three.js is loaded on demand from a CDN the first time the maze launches.

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license. You are free to use, modify, and share this work for non-commercial purposes. Attribution is appreciated but not required.

See the [LICENSE](./LICENSE) file for full details. 
