# Croc Hunter

Croc Hunter is a simple arcade-style web game and demo application.

## Running locally

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Start the server (defaults to port 8080):

   ```bash
   npm start
   ```

3. Open http://localhost:8080 to play the game.

## Play on GitHub Pages

This repo includes a static entry page (`index.html`) and a GitHub Actions workflow that deploys to GitHub Pages on every push to `main`.

1. In your GitHub repository settings, open **Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or manually run the **Deploy static game to GitHub Pages** workflow).
4. Open the generated Pages URL to play the game.

The hosted Pages build includes mobile-friendly on-screen controls as well as keyboard controls.

The server honors the following environment variables when rendering the landing page:

- `WORKFLOW_RELEASE` – Release identifier to display.
- `GIT_SHA` – Commit hash to display.
- `POWERED_BY` – Platform or team name to display (defaults to `deis`).

A `/healthz` endpoint is also available for liveness checks.

## Docker

Build a container image using the provided Dockerfile:

```bash
make docker_build
```

Push the tagged image:

```bash
make docker_push
```
