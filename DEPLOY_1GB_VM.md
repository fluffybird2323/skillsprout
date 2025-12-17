# 🚀 Deploy SkillSprout on 1GB RAM Ubuntu VM

**Optimized for:** 1 vCPU, 1GB RAM AMD/ARM Ubuntu VM (Oracle Cloud, DigitalOcean, AWS, etc.)

---

## ⚡ Quick Deploy (2 Commands)

```bash
# 1. Download the deploy script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/skillsprout/main/deploy-low-mem.sh
chmod +x deploy-low-mem.sh

# 2. Run deployment (replace with your repo URL)
sudo ./deploy-low-mem.sh https://github.com/YOUR_USERNAME/skillsprout.git 3000
```

**That's it!** The script handles everything automatically.

---

## 📋 What the Script Does

The `deploy-low-mem.sh` script automatically:

1. ✅ **Updates system** packages
2. ✅ **Creates 2GB swap** space (critical for 1GB RAM)
3. ✅ **Creates app user** (`skillsprout`)
4. ✅ **Installs Node.js 20** (via NodeSource)
5. ✅ **Clones your repository**
6. ✅ **Creates `.env.local`** template
7. ✅ **Installs dependencies** (memory-optimized)
8. ✅ **Builds application** (memory-optimized)
9. ✅ **Sets up systemd service** (auto-restart, boot persistence)
10. ✅ **Configures firewall** (opens port)

---

## 🎯 Prerequisites

- ✅ Fresh Ubuntu 20.04/22.04 VM
- ✅ Minimum 1GB RAM (2GB swap will be created)
- ✅ Root access (or sudo)
- ✅ GitHub repository URL

---

## 📖 Step-by-Step Guide

### 1. Connect to Your VM

```bash
ssh root@your-server-ip
# or
ssh ubuntu@your-server-ip
```

### 2. Download Deployment Script

**Option A: From GitHub (if repo is public)**
```bash
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/skillsprout/main/deploy-low-mem.sh
chmod +x deploy-low-mem.sh
```

**Option B: Copy from local machine**
```bash
# On your local machine
scp deploy-low-mem.sh root@your-server-ip:/root/

# Then on server
chmod +x deploy-low-mem.sh
```

### 3. Run Deployment

```bash
sudo ./deploy-low-mem.sh https://github.com/YOUR_USERNAME/skillsprout.git 3000
```

**Parameters:**
- `<github-url>` - Your repository URL (required)
- `<port>` - Port number (optional, default: 3000)

**Examples:**
```bash
# Default port 3000
sudo ./deploy-low-mem.sh https://github.com/user/skillsprout.git

# Custom port 8080
sudo ./deploy-low-mem.sh https://github.com/user/skillsprout.git 8080

# Private repo (will prompt for credentials)
sudo ./deploy-low-mem.sh https://github.com/user/private-repo.git 3000
```

### 4. Update API Keys

After deployment, update the environment file:

```bash
sudo nano /home/skillsprout/app/.env.local
```

Add your API keys:
```env
GROQ_API_KEY=gsk_your_actual_groq_key_here
GEMINI_API_KEY=AIzaSy_your_actual_gemini_key_here
```

**Get API Keys:**
- Groq: https://console.groq.com/keys
- Gemini: https://aistudio.google.com/app/apikey

Save and exit: `Ctrl+X`, `Y`, `Enter`

### 5. Start the Service

```bash
sudo systemctl start skillsprout
```

### 6. Verify It's Running

```bash
# Check service status
sudo systemctl status skillsprout

# View logs
sudo journalctl -u skillsprout -f
```

### 7. Access Your App

```bash
# Get your server IP
hostname -I

# Access at:
http://YOUR_SERVER_IP:3000
```

---

## 🔧 Memory Optimization Features

The script includes specific optimizations for 1GB RAM:

### 1. **Swap Space (2GB)**
- Critical for npm install and build
- Prevents OOM (Out Of Memory) errors
- Automatically configured

### 2. **Node.js Memory Limits**
```bash
NODE_OPTIONS="--max-old-space-size=768"  # Limit to 768MB
```

### 3. **NPM Install Optimization**
```bash
NPM_CONFIG_MAXSOCKETS=1                   # Reduce concurrent downloads
npm install --omit=dev --prefer-offline    # Skip dev deps, use cache
```

### 4. **Systemd Memory Limits**
```ini
MemoryMax=900M        # Hard limit
MemoryHigh=768M       # Soft limit
```

### 5. **Sequential Build**
- One process at a time
- Prevents memory spikes
- Takes longer but stable

---

## 📊 Expected Performance

On 1 vCPU, 1GB RAM VM:

| Task | Time | Memory Used |
|------|------|-------------|
| npm install | 5-10 min | 600-800 MB |
| npm build | 10-15 min | 700-900 MB |
| Runtime | - | 300-500 MB |

**Note:** Build is slow but stable with swap space.

---

## 🎛️ Service Management

### Common Commands

```bash
# Start the service
sudo systemctl start skillsprout

# Stop the service
sudo systemctl stop skillsprout

# Restart the service
sudo systemctl restart skillsprout

# View status
sudo systemctl status skillsprout

# View logs (follow mode)
sudo journalctl -u skillsprout -f

# View last 100 lines
sudo journalctl -u skillsprout -n 100

# Enable auto-start on boot
sudo systemctl enable skillsprout

# Disable auto-start
sudo systemctl disable skillsprout
```

### Check if Service is Running

```bash
# Method 1: systemctl
sudo systemctl is-active skillsprout

# Method 2: Check process
ps aux | grep "npm start"

# Method 3: Check port
lsof -i :3000
```

---

## 🔍 Troubleshooting

### Issue: Deployment Fails During npm install

**Cause:** Out of memory

**Solution:**
```bash
# Check swap is active
free -h

# If no swap, create manually:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Then retry deployment
```

### Issue: Build Fails with "JavaScript heap out of memory"

**Cause:** Node.js ran out of memory

**Solution:**
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=900"

# Then rebuild
cd /home/skillsprout/app
sudo -u skillsprout npm run build
```

### Issue: Service Won't Start

**Check logs:**
```bash
sudo journalctl -u skillsprout -n 50 --no-pager
```

**Common causes:**
1. Missing API keys in `.env.local`
2. Port already in use
3. Build not completed

**Solution:**
```bash
# Update API keys
sudo nano /home/skillsprout/app/.env.local

# Check port availability
sudo lsof -i :3000

# Verify build exists
ls -la /home/skillsprout/app/.next/
```

### Issue: Service Crashes After Starting

**Check memory:**
```bash
free -h
top
```

**Solution:**
```bash
# Reduce memory usage in service file
sudo nano /etc/systemd/system/skillsprout.service

# Change:
Environment="NODE_OPTIONS=--max-old-space-size=600"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart skillsprout
```

### Issue: Can't Access from Browser

**Check firewall:**
```bash
# UFW
sudo ufw status
sudo ufw allow 3000/tcp

# iptables
sudo iptables -L -n | grep 3000
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
```

**Check if app is listening:**
```bash
netstat -tlnp | grep 3000
```

---

## 🔐 Security Hardening

### 1. Change Default Port

```bash
# Edit service file
sudo nano /etc/systemd/system/skillsprout.service

# Change:
Environment="PORT=8080"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart skillsprout
```

### 2. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/skillsprout
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/skillsprout /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Setup SSL (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📈 Monitoring

### CPU Usage

```bash
top -bn1 | grep "npm start"
```

### Memory Usage

```bash
# Overall
free -h

# For skillsprout process
ps aux | grep "npm start" | awk '{print $6}'
```

### Disk Space

```bash
df -h /home/skillsprout/app
```

### Log Rotation

```bash
# Configure journald log size
sudo nano /etc/systemd/journald.conf

# Set:
SystemMaxUse=100M

# Restart
sudo systemctl restart systemd-journald
```

---

## 🔄 Updating Your App

```bash
# 1. Stop service
sudo systemctl stop skillsprout

# 2. Pull latest changes
cd /home/skillsprout/app
sudo -u skillsprout git pull

# 3. Install new dependencies (if any)
sudo -u skillsprout npm install

# 4. Rebuild
sudo -u skillsprout npm run build

# 5. Start service
sudo systemctl start skillsprout

# 6. Verify
sudo systemctl status skillsprout
```

### Quick Update Script

Create `update.sh`:
```bash
#!/bin/bash
sudo systemctl stop skillsprout
cd /home/skillsprout/app
sudo -u skillsprout git pull
sudo -u skillsprout npm install
sudo -u skillsprout npm run build
sudo systemctl start skillsprout
sudo systemctl status skillsprout
```

---

## 📝 Files and Locations

| Item | Location |
|------|----------|
| Application | `/home/skillsprout/app/` |
| Environment | `/home/skillsprout/app/.env.local` |
| Service File | `/etc/systemd/system/skillsprout.service` |
| Logs | `sudo journalctl -u skillsprout` |
| User | `skillsprout` |
| Swap File | `/swapfile` (2GB) |

---

## 🆘 Complete Reset

If you need to start over:

```bash
# Stop and remove service
sudo systemctl stop skillsprout
sudo systemctl disable skillsprout
sudo rm /etc/systemd/system/skillsprout.service
sudo systemctl daemon-reload

# Remove app directory
sudo rm -rf /home/skillsprout/app

# Remove user (optional)
sudo userdel -r skillsprout

# Then run deployment script again
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Service is active: `sudo systemctl status skillsprout`
- [ ] Port is open: `sudo lsof -i :3000`
- [ ] No errors in logs: `sudo journalctl -u skillsprout -n 20`
- [ ] Can access via browser: `http://YOUR_IP:3000`
- [ ] API keys are configured
- [ ] Swap space is active: `free -h`
- [ ] Service auto-starts on boot: `sudo systemctl is-enabled skillsprout`

---

## 🎉 You're Live!

Your SkillSprout app is now running on your 1GB RAM VM!

**Access:** `http://YOUR_SERVER_IP:3000`

For production use, consider:
- Setting up Nginx reverse proxy
- Enabling SSL with Let's Encrypt
- Setting up monitoring
- Configuring automated backups

---

**Need Help?** Check the logs: `sudo journalctl -u skillsprout -f`
