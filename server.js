"use strict";
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};
function createServer() {
  return http.createServer((req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.includes("\0")) throw new Error("Invalid path");
    } catch {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }
    if (pathname === "/healthz") {
      res.writeHead(200);
      res.end();
      return;
    }
    if (pathname === "/version") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        req.method === "HEAD"
          ? undefined
          : JSON.stringify({
              hostname: os.hostname(),
              release: process.env.WORKFLOW_RELEASE || "local",
              commit: process.env.GIT_SHA || "unknown",
              poweredBy: process.env.POWERED_BY || "Node.js",
            }),
      );
      return;
    }
    let file;
    if (pathname === "/" || pathname === "/index.html")
      file = path.join(__dirname, "index.html");
    else if (pathname.startsWith("/static/")) {
      const root = path.join(__dirname, "static");
      file = path.resolve(root, pathname.slice("/static/".length));
      const relative = path.relative(root, file);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        res.writeHead(404);
        res.end();
        return;
      }
    } else {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          contentTypes[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
}
if (require.main === module) {
  const port = process.env.PORT || 8080;
  createServer().listen(port, process.env.HOST || "0.0.0.0", () =>
    console.log(`Croc Hunter listening on http://localhost:${port}`),
  );
}
module.exports = { createServer };
