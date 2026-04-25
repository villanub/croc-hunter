const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const port = process.env.PORT || 8080;

function renderPage(hostname, release, commit, poweredBy) {
        return `
<html>
        <head>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <title>Croc Hunter</title>
                <link rel='stylesheet' href='/static/game.css'/>
                <link rel="icon" type="image/png" href="/static/favicon-16x16.png" sizes="16x16" />
                <link rel="icon" type="image/png" href="/static/favicon-32x32.png" sizes="32x32" />
        </head>
        <body>
                <main class="wrapper">
                        <header class="hero">
                                <div>
                                        <p class="eyebrow">Croc Hunter</p>
                                        <h1>The bayou is back and meaner than ever</h1>
                                        <p class="lede">Dodge, dive and harpoon your way through waves of cranky crocs. Rack up streaks, keep the coast safe, and see how long you can survive the onslaught.</p>
                                </div>
                                <div class="pill" role="status" aria-live="polite">
                                        <strong class="label">Status</strong>
                                        <span id="statusText" class="value">Press ENTER or SPACE to begin</span>
                                </div>
                        </header>
                        <section class="canvas-stack">
                                <canvas id="canvasBg" width="960" height="540"></canvas>
                                <canvas id="canvasEnemy" width="960" height="540"></canvas>
                                <canvas id="canvasJet" width="960" height="540"></canvas>
                                <canvas id="canvasHud" width="960" height="540"></canvas>
                        </section>
                        <section class="touch-controls" aria-label="Touch controls">
                                <button id="btnLeft" type="button">◀ Left</button>
                                <button id="btnFire" type="button">Harpoon</button>
                                <button id="btnRight" type="button">Right ▶</button>
                                <button id="btnPause" type="button">Pause / Resume</button>
                        </section>
                        <section class="details">
                                <div class="card">
                                        <h2>Play controls</h2>
                                        <ul>
                                                <li><strong>Move</strong> with <kbd>A</kbd>/<kbd>D</kbd> or <kbd>Left</kbd>/<kbd>Right</kbd></li>
                                                <li><strong>Harpoon</strong> with <kbd>Space</kbd> or <kbd>Tap Harpoon</kbd></li>
                                                <li><strong>Pause</strong> with <kbd>P</kbd> or <kbd>Pause / Resume</kbd></li>
                                                <li><strong>Restart</strong> with <kbd>R</kbd> after a wipeout</li>
                                        </ul>
                                </div>
                                <div class="card">
                                        <h2>Build details</h2>
                                        <p><strong>Hostname:</strong> ${hostname}</p>
                                        <p><strong>Release:</strong> ${release}</p>
                                        <p><strong>Commit:</strong> ${commit}</p>
                                        <p><strong>Powered By:</strong> ${poweredBy}</p>
                                </div>
                        </section>
                </main>
                <script src='/static/game.js'></script>
        </body>
</html>
`;
}

function serveStatic(staticPath, res) {
        const relativePath = path.normalize(decodeURIComponent(staticPath.slice('/static/'.length)));
        const safeRoot = path.join(__dirname, 'static');
        const filePath = path.join(safeRoot, relativePath);
        const relativeToRoot = path.relative(safeRoot, filePath);

        if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
                res.writeHead(404);
                res.end();
                return;
        }

        fs.stat(filePath, (err, stats) => {
                if (err || !stats.isFile()) {
                        res.writeHead(404);
                        res.end();
                        return;
                }

                const contentTypes = {
                        '.css': 'text/css',
                        '.js': 'application/javascript',
                        '.png': 'image/png',
                        '.ico': 'image/x-icon',
                        '.json': 'application/json',
                        '.txt': 'text/plain',
                        '.html': 'text/html'
                };
                const ext = path.extname(filePath).toLowerCase();
                res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
                fs.createReadStream(filePath).pipe(res);
        });
}

const server = http.createServer((req, res) => {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);

        if (pathname === '/healthz') {
                res.writeHead(200);
                res.end();
                return;
        }

        if (pathname === '/') {
                const hostname = os.hostname();
                const release = process.env.WORKFLOW_RELEASE || 'unknown';
                const commit = process.env.GIT_SHA || 'not present';
                const powered = process.env.POWERED_BY || 'deis';

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(renderPage(hostname, release, commit, powered));
                return;
        }

        if (pathname.startsWith('/static/')) {
                serveStatic(pathname, res);
                return;
        }

        res.writeHead(404);
        res.end();
});

server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Server started. Listening on port ${port}`);
});
