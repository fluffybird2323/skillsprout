#!/bin/bash

################################################################################
# Manabu - Low Memory Production Deployment Script
# Optimized for: 1 vCPU, 1GB RAM Ubuntu VM (AMD/ARM)
#
# This script:
# - Clones repository
# - Installs Node.js 20
# - Sets up swap space (for low memory)
# - Installs dependencies with memory optimization
# - Builds the application
# - Sets up systemd service
# - Starts the server
#
# Usage:
#   chmod +x deploy-low-mem.sh
#   sudo ./deploy-low-mem.sh [github-url] [port]
#
# Example:
#   sudo ./deploy-low-mem.sh https://github.com/username/manabu.git 3000
#
################################################################################

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REPO_URL="${1:-}"
PORT="${2:-3000}"
APP_USER="manabu"
APP_DIR="/home/$APP_USER/app"
SERVICE_NAME="manabu"
NODE_VERSION="20"

# Memory optimization settings
export NODE_OPTIONS="--max-old-space-size=768"  # Limit Node to 768MB
export NPM_CONFIG_MAXSOCKETS=1                   # Reduce concurrent downloads

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_memory() {
    local total_mem=$(free -m | awk '/^Mem:/{print $2}')
    print_info "Total memory: ${total_mem}MB"

    if [ "$total_mem" -lt 900 ]; then
        print_warning "Very low memory detected. Swap space is critical."
    fi
}

################################################################################
# Main Script
################################################################################

clear
print_header "Manabu Production Deployment"
print_header "Low Memory Setup (1GB RAM Optimized)"

# Check if running as root
check_root

# Check memory
check_memory

# Validate repository URL
if [ -z "$REPO_URL" ]; then
    print_error "Repository URL is required!"
    echo ""
    echo "Usage: sudo $0 <github-url> [port]"
    echo "Example: sudo $0 https://github.com/fluffybird2323/manabu.git 3000"
    echo ""
    exit 1
fi

print_info "Configuration:"
echo "  Repository:  $REPO_URL"
echo "  App User:    $APP_USER"
echo "  Install Dir: $APP_DIR"
echo "  Port:        $PORT"
echo "  Node.js:     v$NODE_VERSION"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled."
    exit 0
fi

################################################################################
# Step 1: System Updates
################################################################################

print_header "Step 1/9: Updating System"

print_step "Updating package lists..."
apt-get update -qq

print_step "Installing essential packages..."
apt-get install -y -qq git curl build-essential

print_success "System updated"

################################################################################
# Step 2: Create Swap Space (Critical for 1GB RAM)
################################################################################

print_header "Step 2/9: Setting Up Swap Space"

SWAP_SIZE="2G"
SWAP_FILE="/swapfile"

if [ -f "$SWAP_FILE" ]; then
    print_info "Swap file already exists"
else
    print_step "Creating ${SWAP_SIZE} swap file (required for npm install)..."
    fallocate -l $SWAP_SIZE $SWAP_FILE
    chmod 600 $SWAP_FILE
    mkswap $SWAP_FILE > /dev/null 2>&1
    swapon $SWAP_FILE

    # Make swap permanent
    if ! grep -q "$SWAP_FILE" /etc/fstab; then
        echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
    fi

    print_success "Swap space created and activated"
fi

# Verify swap
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')
print_info "Total swap: ${SWAP_TOTAL}MB"

################################################################################
# Step 3: Create Application User
################################################################################

print_header "Step 3/9: Creating Application User"

if id "$APP_USER" &>/dev/null; then
    print_info "User $APP_USER already exists"
else
    print_step "Creating user: $APP_USER..."
    useradd -r -m -s /bin/bash "$APP_USER"
    print_success "User created"
fi

################################################################################
# Step 4: Install Node.js
################################################################################

print_header "Step 4/9: Installing Node.js"

print_step "Installing Node.js v${NODE_VERSION} via NodeSource..."

# Remove old Node.js if exists
apt-get remove -y -qq nodejs npm 2>/dev/null || true

# Install Node.js from NodeSource
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs

# Verify installation
NODE_INSTALLED=$(node -v)
NPM_INSTALLED=$(npm -v)

print_success "Node.js installed: $NODE_INSTALLED"
print_success "npm installed: v$NPM_INSTALLED"

################################################################################
# Step 5: Clone Repository
################################################################################

print_header "Step 5/9: Cloning Repository"

# Remove existing directory if present
if [ -d "$APP_DIR" ]; then
    print_warning "Directory $APP_DIR exists. Removing..."
    rm -rf "$APP_DIR"
fi

print_step "Cloning from: $REPO_URL..."
sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"

print_success "Repository cloned to $APP_DIR"

################################################################################
# Step 6: Setup Environment Variables
################################################################################

print_header "Step 6/9: Setting Up Environment"

print_step "Creating .env.local template..."

sudo -u "$APP_USER" cat > "$APP_DIR/.env.local" << 'ENVEOF'
# Manabu API Keys Configuration

# Required: Groq API (Free Tier - Primary Provider)
# Get your key from: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# Required: Google Gemini API (Free Tier - Fallback Provider)
# Get your key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# API Configuration
NEXT_PUBLIC_API_ENDPOINT=/api/ai

# Optional: Enhanced Search APIs (for better reference materials)
# Brave Search API (Get from: https://brave.com/search/api/)
# BRAVE_SEARCH_API_KEY=your_brave_key_here

# Serper API (Get from: https://serper.dev/)
# SERPER_API_KEY=your_serper_key_here
ENVEOF

print_success "Environment template created at $APP_DIR/.env.local"
print_warning "⚠️  IMPORTANT: Update .env.local with your actual API keys before starting!"

################################################################################
# Step 7: Install Dependencies (Memory Optimized)
################################################################################

print_header "Step 7/9: Installing Dependencies"

cd "$APP_DIR"

print_step "Installing npm packages (this may take 5-10 minutes)..."
print_info "Using memory-optimized settings..."

# Run as app user with memory limits
sudo -u "$APP_USER" bash -c "
    export NODE_OPTIONS='--max-old-space-size=768'
    export NPM_CONFIG_MAXSOCKETS=1
    cd $APP_DIR
    npm install --omit=dev --prefer-offline --no-audit --progress=false
"

print_success "Dependencies installed"

################################################################################
# Step 8: Build Application (Memory Optimized)
################################################################################

print_header "Step 8/9: Building Application"

print_step "Building Next.js production bundle..."
print_info "This may take 10-15 minutes on low-memory systems..."

# Build with memory limits
sudo -u "$APP_USER" bash -c "
    export NODE_OPTIONS='--max-old-space-size=768'
    cd $APP_DIR
    npm run build
"

print_success "Application built successfully"

################################################################################
# Step 9: Setup Systemd Service
################################################################################

print_header "Step 9/9: Setting Up Systemd Service"

print_step "Creating systemd service file..."

cat > "/etc/systemd/system/${SERVICE_NAME}.service" << SERVICEEOF
[Unit]
Description=Manabu AI Learning Platform
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR

# Start command
ExecStart=/usr/bin/npm start

# Environment
Environment="NODE_ENV=production"
Environment="PORT=$PORT"
Environment="NODE_OPTIONS=--max-old-space-size=768"

# Load .env.local
EnvironmentFile=-$APP_DIR/.env.local

# Restart policy
Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Resource limits (important for 1GB RAM)
LimitNOFILE=4096
LimitNPROC=512
MemoryMax=900M
MemoryHigh=768M

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
SERVICEEOF

print_success "Service file created"

print_step "Reloading systemd daemon..."
systemctl daemon-reload

print_step "Enabling service to start on boot..."
systemctl enable "$SERVICE_NAME"

print_success "Service configured"

################################################################################
# Step 10: Configure Firewall
################################################################################

print_header "Configuring Firewall"

if command -v ufw &> /dev/null; then
    print_step "Configuring UFW firewall..."
    ufw allow "$PORT"/tcp > /dev/null 2>&1 || true
    print_success "Firewall configured (port $PORT opened)"
else
    print_info "UFW not installed, skipping firewall configuration"
fi

################################################################################
# Deployment Complete
################################################################################

print_header "✓ Deployment Complete!"

echo ""
print_success "Manabu has been deployed successfully!"
echo ""

print_info "Installation Summary:"
echo "  App Location:    $APP_DIR"
echo "  Service Name:    $SERVICE_NAME"
echo "  User:            $APP_USER"
echo "  Port:            $PORT"
echo "  Node.js:         $NODE_INSTALLED"
echo "  Memory Limit:    768MB (with 2GB swap)"
echo ""

print_warning "⚠️  NEXT STEPS REQUIRED:"
echo ""
echo "  1. Update API keys in environment file:"
echo "     ${YELLOW}sudo nano $APP_DIR/.env.local${NC}"
echo ""
echo "  2. Get your API keys:"
echo "     - Groq API:   https://console.groq.com/keys"
echo "     - Gemini API: https://aistudio.google.com/app/apikey"
echo ""
echo "  3. Start the service:"
echo "     ${GREEN}sudo systemctl start $SERVICE_NAME${NC}"
echo ""
echo "  4. Check service status:"
echo "     ${GREEN}sudo systemctl status $SERVICE_NAME${NC}"
echo ""
echo "  5. View logs:"
echo "     ${GREEN}sudo journalctl -u $SERVICE_NAME -f${NC}"
echo ""

print_info "Access your app at:"
echo "  Local:  ${CYAN}http://localhost:$PORT${NC}"
echo "  Remote: ${CYAN}http://$(hostname -I | awk '{print $1}'):$PORT${NC}"
echo ""

print_info "Common Commands:"
echo "  Start:   ${GREEN}sudo systemctl start $SERVICE_NAME${NC}"
echo "  Stop:    ${GREEN}sudo systemctl stop $SERVICE_NAME${NC}"
echo "  Restart: ${GREEN}sudo systemctl restart $SERVICE_NAME${NC}"
echo "  Status:  ${GREEN}sudo systemctl status $SERVICE_NAME${NC}"
echo "  Logs:    ${GREEN}sudo journalctl -u $SERVICE_NAME -f${NC}"
echo ""

print_success "Deployment script completed!"
echo ""
