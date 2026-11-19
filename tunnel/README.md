# Cloudflare Tunnel for the landing page

The page is served from this Windows machine through a Cloudflare Tunnel. The
machine opens no inbound ports. `cloudflared` makes an outbound connection to
Cloudflare, and Cloudflare sends visitors down that connection to the local web
server on `http://127.0.0.1:4321`.

These steps follow Cloudflare's documentation for a locally-managed tunnel, as
read on 14 November 2026. Check the current documentation before you run them.

## The short way

Two steps set up everything. Run them in an elevated PowerShell, from the
project folder.

1. Install `cloudflared` and sign in. The sign-in opens a browser. It saves
   `cert.pem` in `C:\Users\<user>\.cloudflared\`.

   ```powershell
   winget install --id Cloudflare.cloudflared
   cloudflared tunnel login
   ```

2. Create the tunnel, the DNS record and the two services.

   ```powershell
   .\scripts\install-service.ps1 -Hostname <hostname>
   ```

The script changes the Cloudflare account: it creates a tunnel named
`spsl-landing` and a CNAME record that points the hostname to
`<Tunnel-UUID>.cfargotunnel.com`. It also puts the page on that public address.
The script is safe to run again, for example after the project folder moves.

## What keeps the page up

| Part | How it starts | How it recovers |
| --- | --- | --- |
| `cloudflared` | A Windows service with start type "Automatic". It starts when the network stack and the DNS client run. | When it stops with an error, Windows restarts it after 5 s, 5 s, then every 30 s. `cloudflared` itself connects again when the network comes back. |
| Tunnel check | A scheduled task named "SPSL landing tunnel check" that fires every minute as the system account | It asks Windows to start the `cloudflared` service. If the service is running, nothing happens. This covers a stop with no error. |
| Local web server | A scheduled task named "SPSL landing page" that runs at startup as the system account | The task fires again every five minutes. If the server is running, nothing happens. If the server stopped, the task starts it. |

After a power loss or a restart, both start with Windows. Nobody has to sign in
to Windows or to Cloudflare. One thing is outside this machine: if it is a
virtual machine, set the host to start the virtual machine automatically.

The service does not use "Automatic (Delayed Start)". With that start type,
Windows waited about three minutes after a boot before it started the tunnel.

To stop the tunnel for more than one minute, disable the check task first.
If you do not, the task starts the service again:

```powershell
Disable-ScheduledTask -TaskName 'SPSL landing tunnel check'
Stop-Service cloudflared
```

The service runs as the system account. Its config and credentials are in
`C:\Windows\System32\config\systemprofile\.cloudflared\`.

Check the state at any time:

```powershell
Get-Service cloudflared
Get-ScheduledTask -TaskName 'SPSL landing page', 'SPSL landing tunnel check'
cloudflared tunnel info spsl-landing
```

After a change to the page, build it. The server reads the new files at once:

```powershell
npm run build
```

After a change to `server\serve.mjs`, restart the server:

```powershell
Stop-ScheduledTask -TaskName 'SPSL landing page'
Start-ScheduledTask -TaskName 'SPSL landing page'
```

## HTTPS

The local server sends a visitor who came over plain HTTP to HTTPS, and sets a
`Strict-Transport-Security` header. No Cloudflare setting is needed for this.

## The steps by hand

Use these to run the tunnel in a console without the services, or to see what
the script does. Steps 2 and 5 change the Cloudflare account. Step 6 puts the
page on a public address.

1. Sign in.

   ```powershell
   cloudflared tunnel login
   ```

2. Create the tunnel. The command prints the tunnel UUID and writes the
   credentials file `<Tunnel-UUID>.json` in the `.cloudflared` folder of your
   user profile. That file is a secret.

   ```powershell
   cloudflared tunnel create spsl-landing
   ```

3. Write the config. Copy `tunnel\config.example.yml` to
   `C:\Users\<user>\.cloudflared\spsl-landing.yml`. Replace `<Tunnel-UUID>`,
   `<user>` and `<hostname>`.

4. Check the config.

   ```powershell
   cloudflared tunnel --config $env:USERPROFILE\.cloudflared\spsl-landing.yml ingress validate
   ```

5. Create the DNS record. The record stays when the tunnel stops. Visitors
   then see Cloudflare error 1016.

   ```powershell
   cloudflared tunnel route dns spsl-landing <hostname>
   ```

6. Start the page and the tunnel in this console.

   ```powershell
   .\scripts\start.ps1 -Tunnel
   ```

7. Confirm that the tunnel is connected.

   ```powershell
   cloudflared tunnel info spsl-landing
   ```

## To remove it

```powershell
Unregister-ScheduledTask -TaskName 'SPSL landing tunnel check' -Confirm:$false
Stop-Service cloudflared
cloudflared service uninstall
Unregister-ScheduledTask -TaskName 'SPSL landing page' -Confirm:$false
```

The tunnel and the DNS record stay in the Cloudflare account until you delete
them there.

## Secrets

`cert.pem` and `<Tunnel-UUID>.json` give control of the tunnel. Keep them out of
this folder and out of git. The `.gitignore` of this project refuses the usual
names as a second guard.
