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
