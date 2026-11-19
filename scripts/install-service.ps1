<#
  Puts the SPSL landing page on its public hostname, and keeps it there.

    .\scripts\install-service.ps1 -Hostname <hostname>

  Run it in an elevated PowerShell, after "cloudflared tunnel login".
  The script is safe to run again. It does these things:

    1. Creates the Cloudflare Tunnel (or uses the one that exists).
    2. Creates the DNS record that points the hostname to the tunnel.
    3. Writes the tunnel config for the Windows service.
    4. Installs cloudflared as a Windows service that starts with Windows
       and restarts when it fails.
    5. Installs a scheduled task that starts the local web server with
       Windows, and starts it again within five minutes if it stops.
    6. Installs a scheduled task that starts the cloudflared service again
       within five minutes if it stops.

  After a power loss or a restart of the machine, both come back with no
  sign-in. Steps 1 and 2 change the Cloudflare account.
#>
param(
  [Parameter(Mandatory)][string]$Hostname,
  [string]$TunnelName = 'spsl-landing',
  [int]$Port = 4321,
  [string]$TaskName = 'SPSL landing page',
  [string]$CheckTaskName = 'SPSL landing tunnel check'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$elevated = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $elevated) { throw 'Run this script in an elevated PowerShell.' }

# Programs such as cloudflared write their normal log lines to the error
# stream. With "Stop", PowerShell treats such a line as a failure. This helper
# runs a program, shows its lines, and leaves the exit code in $LASTEXITCODE.
# -Quiet drops the log lines, for calls whose output is parsed.
function Invoke-Native {
  param([Parameter(Mandatory)][string]$Exe, [string[]]$Arguments = @(), [switch]$Quiet)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($Quiet) { & $Exe @Arguments 2>$null }
    else { & $Exe @Arguments 2>&1 | ForEach-Object { Write-Host "$_" } }
  }
  finally { $ErrorActionPreference = $previous }
}

# --- Tools -------------------------------------------------------------------
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $cloudflared = @("${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe", "$env:ProgramFiles\cloudflared\cloudflared.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $cloudflared) { throw 'cloudflared is not installed. See tunnel\README.md.' }
$node = (Get-Command node -ErrorAction Stop).Source

$userDir = Join-Path $env:USERPROFILE '.cloudflared'
$systemDir = 'C:\Windows\System32\config\systemprofile\.cloudflared'
if (-not (Test-Path (Join-Path $userDir 'cert.pem'))) {
  throw 'Not signed in to Cloudflare. Run "cloudflared tunnel login" first.'
}
if (-not (Test-Path (Join-Path $root 'dist\index.html'))) {
  Push-Location $root
  try {
    Invoke-Native -Exe 'npm.cmd' -Arguments 'run', 'build'
    if ($LASTEXITCODE -ne 0) { throw 'The build failed.' }
  }
  finally { Pop-Location }
}

# --- 1. Tunnel ---------------------------------------------------------------
function Get-Tunnel {
  $json = Invoke-Native -Exe $cloudflared -Arguments 'tunnel', 'list', '--output', 'json', '--name', $TunnelName -Quiet
  if (-not $json) { return $null }
  ($json | Out-String | ConvertFrom-Json) | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1
}
$tunnel = Get-Tunnel
if (-not $tunnel) {
  Invoke-Native -Exe $cloudflared -Arguments 'tunnel', 'create', $TunnelName
  if ($LASTEXITCODE -ne 0) { throw 'The tunnel was not created.' }
  $tunnel = Get-Tunnel
}
if (-not $tunnel) { throw "The tunnel '$TunnelName' was not found." }
$id = $tunnel.id
$credentials = Join-Path $userDir "$id.json"
if (-not (Test-Path $credentials)) {
  throw "The tunnel '$TunnelName' exists, but its credentials file is not on this machine: $credentials"
}
Write-Host "Tunnel: $TunnelName"

# --- 2. DNS record -----------------------------------------------------------
Invoke-Native -Exe $cloudflared -Arguments 'tunnel', 'route', 'dns', $TunnelName, $Hostname
if ($LASTEXITCODE -ne 0) { throw "The DNS record for $Hostname was not created." }

# --- 3. Config ---------------------------------------------------------------
# The service runs as the system account, so its files are in the system profile.
New-Item -ItemType Directory -Force $systemDir | Out-Null
Copy-Item $credentials (Join-Path $systemDir "$id.json") -Force
function New-TunnelConfig {
  param([string]$CredentialsPath)
  @(
    "tunnel: $id"
    "credentials-file: $CredentialsPath"
    ''
    'ingress:'
    "  - hostname: $Hostname"
    "    service: http://127.0.0.1:$Port"
    '  - service: http_status:404'
  ) -join "`r`n"
}
$systemConfig = Join-Path $systemDir 'config.yml'
Set-Content -Path $systemConfig -Value (New-TunnelConfig (Join-Path $systemDir "$id.json")) -Encoding ascii
# A copy for "scripts\start.ps1 -Tunnel", which runs as the signed-in user.
Set-Content -Path (Join-Path $userDir 'spsl-landing.yml') -Value (New-TunnelConfig $credentials) -Encoding ascii
Invoke-Native -Exe $cloudflared -Arguments 'tunnel', '--config', $systemConfig, 'ingress', 'validate'
if ($LASTEXITCODE -ne 0) { throw 'The tunnel config is not valid.' }

# --- 4. cloudflared as a Windows service ---------------------------------------
if (-not (Get-Service cloudflared -ErrorAction SilentlyContinue)) {
  Invoke-Native -Exe $cloudflared -Arguments 'service', 'install'
  if ($LASTEXITCODE -ne 0) { throw 'The cloudflared service was not installed.' }
}
Stop-Service cloudflared -Force -ErrorAction SilentlyContinue
$imagePath = "`"$cloudflared`" --config=$systemConfig tunnel run"
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Cloudflared' -Name ImagePath -Value $imagePath
# Start with Windows, as soon as the network stack and the DNS client run.
# "Delayed start" made the tunnel wait about three minutes after a boot.
Invoke-Native -Exe 'sc.exe' -Arguments 'config', 'cloudflared', 'start=', 'auto', 'depend=', 'Tcpip/Dnscache' -Quiet | Out-Null
# Recovery: restart after 5 s, 5 s, then every 30 s. Count failures again after one day.
Invoke-Native -Exe 'sc.exe' -Arguments 'failure', 'cloudflared', 'reset=', '86400', 'actions=', 'restart/5000/restart/5000/restart/30000' -Quiet | Out-Null
# Also recover when the service stops with an error but does not crash.
Invoke-Native -Exe 'sc.exe' -Arguments 'failureflag', 'cloudflared', '1' -Quiet | Out-Null

# --- 5. The local web server as a scheduled task -------------------------------
$action = New-ScheduledTaskAction -Execute $node -Argument 'server\serve.mjs' -WorkingDirectory $root
$atStartup = New-ScheduledTaskTrigger -AtStartup
# The second trigger fires every five minutes. If the server is running, the
# task does nothing (IgnoreNew). If the server stopped, this starts it again.
$keepAlive = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $atStartup, $keepAlive `
  -Settings $settings -Principal $principal -Force | Out-Null

# --- 6. A check on the tunnel service ------------------------------------------
# Windows restarts the service when it stops with an error. This task covers a
# stop with no error: every five minutes it asks Windows to start the service.
# If the service is running, the request does nothing.
$checkAction = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\sc.exe" -Argument 'start cloudflared'
$checkEvery = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5)
$checkSettings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $CheckTaskName -Action $checkAction -Trigger $checkEvery `
  -Settings $checkSettings -Principal $principal -Force | Out-Null

# --- Start -------------------------------------------------------------------
if (-not (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
  Start-ScheduledTask -TaskName $TaskName
}
Start-Service cloudflared
Start-Sleep -Seconds 8

$listening = [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
Write-Host ''
Write-Host "cloudflared service : $((Get-Service cloudflared).Status), start type $((Get-Service cloudflared).StartType)"
Write-Host "web server task     : $((Get-ScheduledTask -TaskName $TaskName).State)"
Write-Host "tunnel check task   : $((Get-ScheduledTask -TaskName $CheckTaskName).State)"
Write-Host "local server        : $(if ($listening) { "listening on port $Port" } else { 'NOT listening' })"
Invoke-Native -Exe $cloudflared -Arguments 'tunnel', 'info', $TunnelName
