param(
  [string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform",
  [string]$DnsName = "kanbai.local",
  [string]$IpAddress = "",
  [int]$Days = 365
)

$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $ProjectRoot

$openssl = Get-Command openssl -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $IpAddress) {
  $candidate = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
    Select-Object -First 1

  if (-not $candidate) {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notlike "vEthernet*" } |
      Select-Object -First 1 -ExpandProperty IPAddress
  }

  $IpAddress = $candidate
}

if (-not $IpAddress) {
  $IpAddress = "127.0.0.1"
}

$certDir = Join-Path $ProjectRoot "infra\nginx\certs"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$keyPath = Join-Path $certDir "kanbai.local.key"
$crtPath = Join-Path $certDir "kanbai.local.crt"
$cnfPath = Join-Path $certDir "kanbai.local.cnf"

$config = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = $DnsName

[v3_req]
subjectAltName = @alt_names
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = $DnsName
DNS.2 = localhost
IP.1 = 127.0.0.1
IP.2 = $IpAddress
"@

if ($openssl) {
  Set-Content -LiteralPath $cnfPath -Value $config -Encoding ASCII
  & $openssl.Source req `
    -x509 `
    -nodes `
    -days $Days `
    -newkey rsa:2048 `
    -keyout $keyPath `
    -out $crtPath `
    -config $cnfPath
  if ($LASTEXITCODE -ne 0) {
    throw "OpenSSL failed to create the local HTTPS certificate."
  }
} else {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if (-not $python) {
    Write-Host "Neither OpenSSL nor Python was found in PATH." -ForegroundColor Yellow
    Write-Host "Install OpenSSL or Python, then run this script again." -ForegroundColor Yellow
    exit 2
  }
  & $python.Source ".\scripts\generate_local_cert.py" `
    --cert-dir $certDir `
    --dns-name $DnsName `
    --ip-address $IpAddress `
    --days $Days
  if ($LASTEXITCODE -ne 0) {
    throw "Python certificate generator failed to create the local HTTPS certificate."
  }
}

Write-Host "PASS Local HTTPS certificate created" -ForegroundColor Green
Write-Host "Certificate: $crtPath" -ForegroundColor Gray
Write-Host "Key:         $keyPath" -ForegroundColor Gray
Write-Host "Operator URL: https://$IpAddress/operator/capture" -ForegroundColor White
Write-Host ""
Write-Host "Note: Browsers will warn because this is self-signed. For factory pilots, trust this certificate on the tablet or use a trusted tunnel/certificate." -ForegroundColor Yellow
