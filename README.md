# Croc Hunter

A browser arcade game about a small boat and a very busy bayou. Cruise down a scrolling river while crocs approach from both banks and downstream. Steer around them or fire your harpoon, build a streak, and survive increasingly fast waves.

## Play locally

Use Node.js 22 or newer (Node.js 24 is used in CI and Docker):

```sh
npm ci
npm start
```

Open **http://localhost:8080**. The game has no runtime dependencies, remote fonts, asset CDN, account requirement, or paid services. You can also serve `index.html` and `static/` with any static web server.

## Controls

| Action                | Keyboard                       | Touch                    |
| --------------------- | ------------------------------ | ------------------------ |
| Start / retry         | Enter, or Space from the board | Start patrol / Try again |
| Steer                 | Left / Right or A / D          | Hold the arrow buttons   |
| Fire                  | Hold Space                     | Hold Fire Harpoon        |
| Pause / resume        | P or Escape                    | Pause / Resume           |
| Retry after game over | R from the board               | Try again                |

The boat travels downriver automatically; the camera follows as banks and lily pads pass upstream. Crocs commit to your course when they enter, so you can dodge by steering left or right. A croc that misses you costs no hull; four direct hits end your patrol. Every eight catches starts a new wave; golden crocs appear from wave three. Every five consecutive catches raises the score multiplier, up to 4×. A hit to the boat breaks the streak. The harpoon turret automatically leads the nearest incoming croc while you hold Fire; steering remains under your control.

Choose **Easy waters**, **Classic patrol**, or **Croc country** before starting. Personal bests are saved separately for each difficulty on this browser when local storage is available. Sound is off by default; enable it with the Sound button. Switching tabs or leaving the window automatically pauses play. Reduced-motion preferences disable scenery scrolling, decorative movement, splash particles, and damage flashes while keeping the simulation unchanged.

## GitHub Pages

The deployment workflow targets this repository's default branch, **master**. In repository **Settings → Pages**, select **GitHub Actions** as the source, then run **Deploy static game to GitHub Pages**, or push to `master`.

Once configured and deployed, the game will be at **https://villanub.github.io/croc-hunter/**. This address is the deployment destination; merely checking out this source does not publish it. Assets use relative URLs, so the game works under the repository path.

The Node server serves the same `index.html` as Pages. It retains `/healthz` for container probes and exposes optional deployment metadata at `/version` (`WORKFLOW_RELEASE`, `GIT_SHA`, and `POWERED_BY`). Infrastructure details are kept out of the game interface.

## Validation

```sh
npm run lint
npm test
npx playwright install chromium firefox webkit
npm run test:browser
```

The simulation tests cover collisions, scoring, waves, lives, difficulty, pause, resizing, and full resets. HTTP tests verify static-page parity, assets, health, invalid URLs, and path boundaries. Playwright exercises desktop Chromium/Firefox and mobile Chromium/WebKit layouts, scoring, persistence, start/pause/retry, storage denial, and touch controls. Screenshots are generated in `artifacts/screenshots/` (ignored by Git).

`static/engine.js` contains the deterministic simulation; `static/game.js` handles canvas drawing, input, audio, and the interface. Art and sound are generated in the browser. The original sprite assets and `game2.js` are retained as historical assets, but the game does not load them.

## Docker and legacy infrastructure

```sh
docker build -t croc-hunter .
docker run --rm -p 8080:8080 croc-hunter
```

`PORT` defaults to `8080`; `HOST` defaults to `0.0.0.0`. Existing Helm, Flux, Draft, and Azure Pipeline files remain for the historical AKS demo. They are not required for browser play and were not modernized as part of the game update. The separate `villanub/croc-pulumi` infrastructure repository is archived.
