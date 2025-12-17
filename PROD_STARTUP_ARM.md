# 🚀 SkillSprout Production Startup Guide - ARM-based Ubuntu

This guide helps you start the SkillSprout production server on ARM-based systems (Raspberry Pi, Oracle Ampere, etc.).

---

## 📋 Quick Start (5 minutes)

### Option 1: Simple Startup Script (Recommended for Testing)

```bash
# Make script executable
chmod +x start-prod-arm.sh

# Run with default settings (port 3000)
./start-prod-arm.sh

# Or specify custom port
./start-prod-arm.sh 8080
```

**What it does:**
- ✅ Checks Node.js and npm installation
- ✅ Creates `.env.local` template if missing
- ✅ Installs dependencies if needed
- ✅ Rebuilds if necessary
- ✅ Starts the server with logging

---

### Option 2: Systemd Service Setup (Recommended for Production)

```bash
# 1. Setup systemd service (requires sudo)
sudo ./setup-systemd-arm.sh /home/skillsprout/app 3000

# 2. Update environment variables
nano /home/skillsprout/app/.env.local

# 3. Start the service
sudo systemctl start skillsprout

# 4. Check status
sudo systemctl status skillsprout

# 5. View logs
sudo journalctl -u skillsprout -f
```

**Service Commands:**
```bash
sudo systemctl start skillsprout      # Start
sudo systemctl stop skillsprout       # Stop
sudo systemctl restart skillsprout    # Restart
sudo systemctl status skillsprout     # Status
sudo systemctl enable skillsprout     # Auto-start on boot
sudo systemctl disable skillsprout    # Don't auto-start
sudo journalctl -u skillsprout -f     # Follow logs
```

---

## 🔧 Environment Setup

### 1. Install Node.js (ARM64-compatible)

**Using NVM (Recommended):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20 (LTS)
nvm install 20

# Verify
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x
```

**Using APT (Ubuntu):**
```bash
# Ubuntu 22.04+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v
npm -v
```

---

### 2. Prepare Application

```bash
# Clone repository
git clone <your-repo-url> /home/skillsprout/app
cd /home/skillsprout/app

# Install dependencies
npm install

# Build for production
npm run build
```

---

### 3. Configure Environment Variables

Create `.env.local` with your API keys:

```bash
cat > .env.local << 'EOF'
# Required: Groq API (Free Tier)
# Get from: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# Required: Google Gemini API (Free Tier)
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# API Configuration
NEXT_PUBLIC_API_ENDPOINT=/api/ai

# Optional: Enhanced search (if you have these)
# BRAVE_SEARCH_API_KEY=
# SERPER_API_KEY=
EOF
```

---

## 🚀 Starting the Server

### Method 1: Direct Startup

```bash
cd /home/skillsprout/app

# Development
npm run dev

# Production
npm run build
npm start
```

### Method 2: Using Startup Script

```bash
cd /home/skillsprout/app

# Default (port 3000)
./start-prod-arm.sh

# Custom port
./start-prod-arm.sh 8080

# Development mode
./start-prod-arm.sh 3000 dev
```

### Method 3: As Systemd Service

```bash
# Setup once (requires sudo)
sudo ./setup-systemd-arm.sh

# Then manage with:
sudo systemctl start skillsprout
sudo systemctl status skillsprout
sudo journalctl -u skillsprout -f
```

---

## 🔍 Verification

### Check if Server is Running

```bash
# Check if port is listening
lsof -i :3000
# or
netstat -tlnp | grep 3000
```

### Test the API

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Should respond with 200 OK
```

### View Logs

```bash
# Using script
tail -f logs/prod-server.log

# Using systemd
sudo journalctl -u skillsprout -f

# Using npm (live output)
npm start
```

---

## 🌐 Access the Application

Once running, access at:
- **Local:** `http://localhost:3000` (or your custom port)
- **Remote:** `http://<server-ip>:3000`

For remote access on Orange Cloud/AWS/etc:
1. Open firewall port: `sudo ufw allow 3000`
2. Access via: `http://<server-ip>:3000`

---

## 🔐 Security Setup (Production)

### 1. Firewall Configuration

```bash
# UFW (Ubuntu Firewall)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # SkillSprout
sudo ufw enable

# Or iptables
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### 2. Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/skillsprout
```

Add this configuration:
```nginx
upstream skillsprout {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    location / {
        proxy_pass http://skillsprout;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/skillsprout /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📊 Monitoring

### Check System Resources

```bash
# CPU and Memory usage
top -p $(pgrep -f "npm start")

# Or using htop
sudo apt-get install -y htop
htop -p $(pgrep -f "npm start")
```

### Enable Auto-Restart

With systemd, auto-restart is already configured:
```ini
Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3
```

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
./start-prod-arm.sh 8080
```

### Node.js Not Found

```bash
# Check installation
which node
which npm

# If not found, install via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
```

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### API Keys Not Working

```bash
# Check .env.local exists
cat .env.local

# Verify API keys are valid
# - Groq: https://console.groq.com/keys
# - Gemini: https://aistudio.google.com/app/apikey

# Restart server after updating
sudo systemctl restart skillsprout
```

### Memory Issues on ARM

If running out of memory:

```bash
# Check available memory
free -h

# Increase swap (if needed)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📈 Performance Tips

### For Raspberry Pi / Low-Memory Devices

```bash
# Use production build (smaller than dev)
NODE_ENV=production npm start

# Disable source maps
NEXT_TELEMETRY_DISABLED=1 npm start

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name "skillsprout" -- start
pm2 startup
pm2 save
```

### For High-Traffic Servers

```bash
# Use PM2 cluster mode
pm2 start npm --name "skillsprout" -i max -- start

# Or use multiple workers with Nginx
# (see Nginx section above)
```

---

## 📋 Checklist

- [ ] Node.js 20+ installed
- [ ] npm 10+ installed
- [ ] Application cloned/downloaded
- [ ] `.env.local` created with API keys
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] `npm start` works locally
- [ ] Firewall port opened (3000)
- [ ] Systemd service created (optional)
- [ ] Logs being captured

---

## 🎉 Success!

Your SkillSprout production server is ready!

**Access it at:**
```
http://localhost:3000        (local)
http://<server-ip>:3000      (remote)
```

**Useful links:**
- [Next.js Production Deployment](https://nextjs.org/docs/pages/building-your-application/deploying)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance-best-practices/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

---

**Questions?** Check logs or run: `./start-prod-arm.sh --help`
