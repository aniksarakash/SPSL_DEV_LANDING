# Cloudflare Tunnel for the landing page

The page is served from this Windows machine through a Cloudflare Tunnel. The
machine opens no inbound ports. `cloudflared` makes an outbound connection to
Cloudflare, and Cloudflare sends visitors down that connection to the local web
server on `http://localhost:4321`.

These steps follow Cloudflare's documentation for a locally-managed tunnel, as
read on 14 November 2026. Check the current documentation before you run them.

## What changes your Cloudflare account

Steps 2, 3 and 6 change the Cloudflare account. Step 7 puts the page on a
public address. Do these only when you intend to.

## Steps

1. Install `cloudflared`. Download the Windows build from Cloudflare, or run:

   ```powershell
   winget install --id Cloudflare.cloudflared
   ```

2. Sign in. This opens a browser. It saves `cert.pem` in
   `C:\Users\<user>\.cloudflared\`.

   ```powershell
   cloudflared tunnel login
   ```

3. Create the tunnel. The command prints the tunnel UUID and writes the
   credentials file `<Tunnel-UUID>.json` in the same `.cloudflared` folder.
   That file is a secret.

   ```powershell
   cloudflared tunnel create spsl-landing
   ```

4. Write the config. Copy `tunnel\config.example.yml` to
   `C:\Users\<user>\.cloudflared\spsl-landing.yml`. Replace `<Tunnel-UUID>`,
   `<user>` and `<hostname>`.

5. Check the config.

   ```powershell
   cloudflared tunnel --config $env:USERPROFILE\.cloudflared\spsl-landing.yml ingress validate
   ```

6. Create the DNS record. This makes a CNAME record that points the hostname
   to `<Tunnel-UUID>.cfargotunnel.com`. The record stays when the tunnel stops.
   Visitors then see Cloudflare error 1016.

   ```powershell
   cloudflared tunnel route dns spsl-landing <hostname>
   ```

7. Start the page and the tunnel.

   ```powershell
   .\scripts\start.ps1 -Tunnel
   ```

8. Confirm that the tunnel is connected.

   ```powershell
   cloudflared tunnel info spsl-landing
   ```

## Run it permanently

Two things must start with Windows: the local web server and `cloudflared`.

### The local web server

Create a scheduled task that starts at boot. Run this in an elevated
PowerShell, with the real path of the project:

```powershell
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument 'server\serve.mjs' -WorkingDirectory 'C:\path\to\spsl-landing'
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'SPSL landing page' -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest
```

### cloudflared as a Windows service

Cloudflare recommends that `cloudflared` runs as a Windows service. The service
runs as the system account, so it reads its files from the system profile and
not from your user profile.

1. In an elevated prompt:

   ```bat
   cloudflared.exe service install
   mkdir C:\Windows\System32\config\systemprofile\.cloudflared
   ```

2. Copy `cert.pem`, `<Tunnel-UUID>.json` and the config file into
   `C:\Windows\System32\config\systemprofile\.cloudflared\`. Name the config
   `config.yml`. In it, set `credentials-file` to the new path of the
   `.json` file.

3. In Registry Editor, open
   `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Cloudflared` and set
   `ImagePath` to the following, with the real path of `cloudflared.exe`:

   ```text
   C:\Cloudflared\bin\cloudflared.exe --config=C:\Windows\System32\config\systemprofile\.cloudflared\config.yml tunnel run
   ```

4. Start the service. Restart it after each change to the config.

   ```bat
   sc start cloudflared
   ```

## Secrets

`cert.pem` and `<Tunnel-UUID>.json` give control of the tunnel. Keep them out of
this folder and out of git. The `.gitignore` of this project refuses the usual
names as a second guard.
