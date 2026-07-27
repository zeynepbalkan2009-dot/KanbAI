from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json


MODELS = [
    {
        "name": "kanbai-defect-detector",
        "version": "v1.8",
        "stage": "production",
        "map": 0.914,
        "precision": 0.927,
        "recall": 0.901,
        "trained_at": "2026-07-24T18:30:00Z",
    },
    {
        "name": "kanbai-defect-detector",
        "version": "v1.9-candidate",
        "stage": "candidate",
        "map": 0.936,
        "precision": 0.941,
        "recall": 0.928,
        "trained_at": "2026-07-26T08:15:00Z",
    },
]


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, body: dict, status: int = 200) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_html(self) -> None:
        html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>KanbAI MLOps Registry</title>
  <style>
    body{margin:0;background:#090b10;color:#f7f8fb;font-family:Inter,Arial,sans-serif}
    main{max-width:920px;margin:64px auto;padding:0 28px}
    .eyebrow{color:#ff7a00;text-transform:uppercase;letter-spacing:.12em;font-size:12px}
    h1{font-size:44px;margin:12px 0 8px}
    p{color:#a9b0bf;font-size:17px;line-height:1.6}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:28px}
    .card{border:1px solid #202633;background:#111620;border-radius:18px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.28)}
    .metric{font-size:30px;font-weight:700;color:#00c2ff}
    .label{color:#a9b0bf;font-size:13px;margin-top:6px}
    code{background:#171d28;border:1px solid #283040;border-radius:8px;padding:3px 7px;color:#f7f8fb}
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">KanbAI MLOps</div>
    <h1>Continuous Learning Registry</h1>
    <p>Factory inspections feed HITL validation, dataset growth, retraining and controlled model promotion.</p>
    <div class="grid">
      <section class="card"><div class="metric">v1.8</div><div class="label">Production model</div></section>
      <section class="card"><div class="metric">v1.9</div><div class="label">Candidate model</div></section>
      <section class="card"><div class="metric">+2.2%</div><div class="label">mAP improvement</div></section>
      <section class="card"><div class="metric">12,840</div><div class="label">Curated dataset images</div></section>
    </div>
    <p>Health: <code>/health</code> · Registry: <code>/api/2.0/mlflow/registered-models/search</code></p>
  </main>
</body>
</html>""".encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)

    def do_GET(self) -> None:
        if self.path in {"/health", "/ready"}:
            self._send_json({"status": "ok", "service": "kanbai-mlops-demo"})
            return
        if self.path.startswith("/api/2.0/mlflow/registered-models/search"):
            self._send_json({"registered_models": MODELS})
            return
        if self.path.startswith("/api/2.0/mlflow/model-versions/search"):
            self._send_json({"model_versions": MODELS})
            return
        self._send_html()

    def log_message(self, format: str, *args) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 5000), Handler)
    print("KanbAI MLOps demo registry listening on :5000", flush=True)
    server.serve_forever()
