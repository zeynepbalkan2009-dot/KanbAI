# Private GitHub Demo

This path is for investor and factory conversations where the KanbAI demo must
be easy to open from GitHub without publishing a public website.

## Recommended path: GitHub Codespaces

1. Open the private repository on GitHub.
2. Select **Code** -> **Codespaces** -> **Create codespace on main**.
3. Wait for the dev container to finish starting.
4. Open the forwarded `8080` port named **KanbAI private investor demo**.

The dev container starts:

```bash
python3 -m http.server 8080 --bind 0.0.0.0 --directory investor-demo
```

Codespaces forwards ports privately by default. Keep the port visibility set to
**Private** unless you intentionally want a public preview.

## Artifact fallback

The `Private investor demo artifact` workflow validates the static demo and
uploads `kanbai-private-investor-demo` as a GitHub Actions artifact. Repository
collaborators can download it from the workflow run and open `index.html`
locally.

## What this demo is

- Static investor-grade product simulation.
- No backend, login session, factory network, or real image processing.
- Safe for GitHub-only review by collaborators.

## What this demo is not

- Not a real factory pilot runtime.
- Not a GitHub Pages deployment.
- Not suitable for real factory data.

Use the local Docker stack and the controlled pilot runbook for real factory
testing.
