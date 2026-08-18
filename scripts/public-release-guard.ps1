Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($message) {
  Write-Host "FAIL $message" -ForegroundColor Red
  exit 1
}

function Info($message) {
  Write-Host "OK $message" -ForegroundColor Green
}

$tracked = git ls-files
if (-not $tracked) {
  Fail "No tracked files found. Run this script from the repository root."
}

$forbiddenPathPatterns = @(
  '^\.env$',
  '^\.env\.(?!example$).+',
  '(^|/)id_rsa$',
  '(^|/)id_dsa$',
  '(^|/)id_ecdsa$',
  '(^|/)id_ed25519$',
  '\.(pem|p12|pfx|jks)$',
  '^infra/nginx/certs/.*\.(crt|key|cnf)$',
  '^backend/models/.*\.(pt|onnx|engine)$',
  '^mlops/dataset/(raw|processed|versions|yolo)/',
  '^mlops/.*/runs/',
  '^mlops/.*/artifacts/',
  '^mlops/registry/.*\.json$',
  '^outputs/',
  '(^|/)node_modules/',
  '(^|/)\.next/',
  '\.(sqlite|db)$'
)

$forbidden = @()
foreach ($path in $tracked) {
  $normalized = $path -replace '\\', '/'
  foreach ($pattern in $forbiddenPathPatterns) {
    if ($normalized -match $pattern) {
      if ($normalized -ne 'infra/nginx/certs/.gitkeep') {
        $forbidden += $normalized
      }
      break
    }
  }
}

if ($forbidden.Count -gt 0) {
  Write-Host "Forbidden public-release files are tracked:" -ForegroundColor Red
  $forbidden | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
}

$secretPatterns = @(
  '-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----',
  'AKIA[0-9A-Z]{16}',
  'ASIA[0-9A-Z]{16}',
  'ghp_[A-Za-z0-9_]{30,}',
  'github_pat_[A-Za-z0-9_]{20,}',
  'glpat-[A-Za-z0-9_-]{20,}',
  'xox[baprs]-[A-Za-z0-9-]{20,}',
  'sk-[A-Za-z0-9]{20,}',
  'https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+',
  '(?i)(OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|GITHUB_PAT|STRIPE_SECRET_KEY)\s*=\s*["'']?(?!$|\$|change-me|changeme|placeholder|example)[^"''\s]+'
)

$textExtensions = @(
  '.cfg', '.conf', '.css', '.dockerignore', '.env', '.example', '.html',
  '.ini', '.js', '.json', '.md', '.mjs', '.ps1', '.py', '.sh', '.sql',
  '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml'
)

$secretHits = @()
foreach ($path in $tracked) {
  $extension = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($textExtensions -notcontains $extension -and -not $path.EndsWith('.env.example')) {
    continue
  }
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    continue
  }
  $content = Get-Content -Raw -LiteralPath $path
  $content = $content -replace '\$\{[A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?\}', 'placeholder'
  foreach ($pattern in $secretPatterns) {
    if ($content -match $pattern) {
      $secretHits += "$path matches $pattern"
    }
  }
}

if ($secretHits.Count -gt 0) {
  Write-Host "Potential high-risk secrets found:" -ForegroundColor Red
  $secretHits | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
}

Info "Public release guard passed."
Write-Host "Allowed public demo defaults remain intentionally documented in .env.example and demo scripts." -ForegroundColor Yellow
