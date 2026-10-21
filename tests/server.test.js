const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createServer } = require("../server");
let server, base;
before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

test("Node serves exactly the same page as static hosting", async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.equal(
    await response.text(),
    await fs.readFile(path.join(__dirname, "../index.html"), "utf8"),
  );
  for (const asset of [
    "game.css",
    "engine.js",
    "game.js",
    "favicon-32x32.png",
  ]) {
    assert.equal((await fetch(`${base}/static/${asset}`)).status, 200);
  }
});
test("health, metadata and HEAD remain available", async () => {
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.equal(
    typeof (await (await fetch(`${base}/version`)).json()).hostname,
    "string",
  );
  assert.equal(await (await fetch(base, { method: "HEAD" })).text(), "");
});
test("invalid URLs, traversal and unsupported methods fail without crashing", async () => {
  assert.equal((await fetch(`${base}/static/%zz`)).status, 400);
  assert.equal((await fetch(`${base}/static/%00`)).status, 400);
  assert.equal((await fetch(`${base}/static/..%5Cpackage.json`)).status, 404);
  assert.equal((await fetch(`${base}/static/missing.png`)).status, 404);
  assert.equal((await fetch(base, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
});
