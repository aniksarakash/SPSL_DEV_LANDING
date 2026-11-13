<#
  Starts the SPSL landing page on this machine.

    .\scripts\start.ps1              Serve the built page on http://localhost:4321
    .\scripts\start.ps1 -Build       Build first, then serve
    .\scripts\start.ps1 -Tunnel      Serve, and run the Cloudflare Tunnel

  -Tunnel puts the page on its public hostname. It needs cloudflared and a
  filled-in tunnel config. See tunnel\README.md.
#>
param(
  [switch]$Build,
  [switch]$Tunnel,
  [int]$Port = 4321,
  [string]$Config = (Join-Path $env:USERPROFILE '.cloudflared\spsl-landing.yml')
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Build -or -not (Test-Path (Join-Path $root 'dist\index.html'))) {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'The build failed. The page was not started.' }
}

$env:PORT = "$Port"

if (-not $Tunnel) {
  node server/serve.mjs
  exit $LASTEXITCODE
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  throw 'cloudflared is not installed or is not on PATH. See tunnel\README.md.'
}
if (-not (Test-Path $Config)) {
  throw "Tunnel config not found: $Config. Copy tunnel\config.example.yml to that path and fill it in."
}

cloudflared tunnel --config $Config ingress validate
if ($LASTEXITCODE -ne 0) { throw 'The tunnel config is not valid. The tunnel was not started.' }

$server = Start-Process node -ArgumentList 'server/serve.mjs' -WorkingDirectory $root -PassThru -NoNewWindow
try {
  cloudflared tunnel --config $Config run
}
finally {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id }
}
