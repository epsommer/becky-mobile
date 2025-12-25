# Mobile Development Access Guide

Instructions for using Claude Code from mobile devices to make repository changes on the go.

---

## Option 1: GitHub Codespaces

A cloud-based VS Code environment that runs in your browser.

### Cost
- **Free tier**: 120 core-hours/month (personal accounts), 180 hours (GitHub Pro)
- Roughly 60 hours on a 2-core machine
- Beyond free tier: ~$0.18-0.36/hour

### Initial Setup (One-Time)

1. **Navigate to your repository on GitHub.com**

2. **Create a Codespace**
   - Click the green **Code** button
   - Select the **Codespaces** tab
   - Click **Create codespace on master** (or your branch)

3. **Wait for environment to load** (1-2 minutes first time)

4. **Install Claude Code in the Codespace terminal**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

5. **Authenticate Claude Code**
   ```bash
   claude
   ```
   Follow the prompts to log in via browser auth or API key.

### Using from Mobile

1. Open **github.com** in mobile browser (Safari/Chrome)
2. Navigate to your repo
3. Tap **Code** → **Codespaces** → Select your existing codespace
4. VS Code loads in browser - use the terminal for Claude Code
5. Make changes, commit, push
6. On Mac: `git pull`

### Tips for Mobile
- Request desktop site in browser for better experience
- Use a Bluetooth keyboard for heavy work
- Codespaces auto-stop after 30 min idle (preserves free hours)

---

## Option 2: SSH to Mac from Mobile

Connect directly to your Mac and run Claude Code in your home terminal.

### Cost
- **Free** - uses existing hardware

### Part A: Configure Your Mac (One-Time)

#### 1. Enable Remote Login
```
System Preferences → Sharing → Enable "Remote Login"
```
Note your Mac's username shown in the Sharing pane.

#### 2. Find your Mac's local IP address
```bash
ipconfig getifaddr en0
```
Or check: System Preferences → Network

#### 3. Set up port forwarding (for access outside home network)
- Log into your router (usually 192.168.1.1 or 192.168.0.1)
- Forward external port 22 (or custom port) → Mac's local IP, port 22
- Find your public IP:
  ```bash
  curl ifconfig.me
  ```

#### 4. Set up SSH key authentication (recommended)
```bash
# Generate keys if you don't have them
ssh-keygen -t ed25519

# View your public key (you'll add this to mobile app)
cat ~/.ssh/id_ed25519.pub
```

### Part B: Mobile App Setup

#### Install an SSH client

| Platform | Free Options | Paid Options |
|----------|--------------|--------------|
| **iOS** | Termius | Blink Shell ($20), Prompt |
| **Android** | Termius, JuiceSSH, ConnectBot | - |

#### Configure connection in the app

```
Host: your-mac-local-ip (or public IP if remote)
Port: 22
Username: [your Mac username]
Authentication: Password or SSH key
```

#### Import SSH key to mobile app
- Most apps allow pasting your private key or importing from files
- Termius can sync keys across devices with an account
- Keep your private key secure!

### Part C: Using Claude Code via SSH

1. **Open SSH app on phone**

2. **Connect to your Mac**

3. **Navigate to your project**
   ```bash
   cd ~/projects/apps/becky-mobile
   ```

4. **Run Claude Code**
   ```bash
   claude
   ```

5. **Work normally** - make edits, commits, etc.

6. **No pull needed** - changes are already on your Mac!

---

## Quick Comparison

| Aspect | Codespaces | SSH to Mac |
|--------|------------|------------|
| **Cost** | Free tier (120 hrs/mo) | Free |
| **Setup difficulty** | Easy | Moderate |
| **Mac needs to be on?** | No | Yes |
| **Works away from home?** | Yes | Requires port forwarding |
| **Typing experience** | Browser-based | Native terminal app |
| **Sync required?** | Push/Pull | None |

---

## Recommendations

- **Occasional quick edits**: GitHub Codespaces (simpler setup)
- **Heavy development sessions**: SSH to Mac (better terminal experience)
- **Traveling/Mac unavailable**: Codespaces only option

---

## Troubleshooting

### SSH Connection Refused
- Verify Remote Login is enabled on Mac
- Check Mac firewall allows SSH (port 22)
- Confirm correct IP address

### SSH Works Locally but Not Remotely
- Verify port forwarding is configured on router
- Check if ISP blocks port 22 (try alternate port)
- Ensure public IP is current (may change with DHCP)

### Codespace Won't Start
- Check GitHub status page
- Verify you have free hours remaining
- Try creating a new codespace

### Claude Code Auth Issues
- Re-run `claude` to re-authenticate
- Check API key is valid
- Ensure network allows Anthropic API access
