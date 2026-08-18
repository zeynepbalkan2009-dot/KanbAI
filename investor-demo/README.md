# KanbAI private investor demo

An interactive, dependency-free investor demo for GitHub-only review.

## Run locally

Open `index.html` directly, or from this folder run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Run privately on GitHub

Open the repository in GitHub Codespaces. The dev container starts the demo on
port `8080` and GitHub keeps forwarded ports private by default.

See `docs/PRIVATE_GITHUB_DEMO.md` for the full flow.

## Before production

- Replace `hello@kanbai.ai` and `investors@kanbai.ai` if needed.
- Replace the current concept visuals with final production assets.
- Add analytics and form handling.
- Add real traction / pilot metrics only when verified.
- Port to Next.js + Tailwind when moving into the main app/repository.
