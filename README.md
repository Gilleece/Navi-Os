# NAVI-OS

A retro OS inspired website designed to mimic a desktop running in the browser with a boot sequence,
draggable/resizable/minimisable windows, a taskbar with a start menu, deep-linkable programs, and a
first-person Three.js maze with WebXR support. The site is intended to be a showcase/hub for personal
projects and overall just a fun way of messing with interesting frontend. Currently it's pure html/js,
considering moving in future to a framework but that depends on how much it expands.

## Project structure

```
.
├── index.html            # markup only: boot, desktop, taskbar, start menu, maze overlay
├── .github/workflows/
│   └── deploy.yml        # GitHub Pages deploy on push to master
├── backend/              # optional Cloudflare Worker that makes BBS.SYS a shared board
├── css/
│   └── styles.css        # all styling (CRT overlay, windows, taskbar, start menu, maze HUD)
└── js/
    ├── main.js           # entry point — imports and initialises every module
    ├── utils.js          # shared DOM helpers ($, $$, isMobile)
    ├── store.js          # localStorage wrapper (theme, scores, patterns, drawings)
    ├── boot.js           # boot sequence + "jack in"; #hash deep links skip the boot
    ├── clock.js          # live taskbar clock
    ├── theme.js          # colour themes (persisted)
    ├── system.js         # fake process table, SIGKILL, kernel panic
    ├── notify.js         # toasts + ambient transmissions
    ├── screensaver.js    # idle digital rain
    ├── windows.js        # window manager + APPS registry + #hash routing
    ├── startmenu.js      # ROOT button start menu (programs, themes, reboot)
    ├── sound.js          # taskbar SND toggle (global mute)
    └── apps/
        ├── _fx.js        # shared palette cache + master audio bus + beep()
        ├── ...           # one file per program (terminal, tracker, games, bbs, …)
        └── maze/         # MAZE.EXE — Three.js labyrinth (desktop / touch / VR)
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

## Deploying

Pushes to `master` deploy automatically via `.github/workflows/deploy.yml`.
One-time setup: repo **Settings → Pages → Source → GitHub Actions**.

## Deep links

Every program has a shareable URL: `/#projects`, `/#term`, `/#tracker`, … A hash
link skips the boot sequence and opens that window directly. The address bar
follows whichever window is focused.

## Making BBS.SYS a real shared board

By default the bulletin board is local to each visitor. To make it a genuine
shared feed, deploy the Cloudflare Worker in [`backend/`](./backend/README.md)
(free tier) and set the `API` constant at the top of `js/apps/bbs.js`.

## Where to edit things

- **Your details** — `index.html`, the `#win-about` and `#win-projects` sections.
- **Look & feel** — `css/styles.css` (the colour palette lives in `:root` at the top).
- **A specific program** — its file under `js/apps/`; register windows in `APPS` in `js/windows.js`.
- **Boot text** — the `BOOT_LINES` array in `js/boot.js`.
- **Social/link previews** — the meta tags in `index.html` and `assets/og.png`.

Three.js is loaded on demand from a CDN the first time the maze launches.

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license. You are free to use, modify, and share this work for non-commercial purposes. Attribution is appreciated but not required.

See the [LICENSE](./LICENSE) file for full details.
