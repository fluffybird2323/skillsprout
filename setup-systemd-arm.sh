#!/bin/bash

################################################################################
# Setup systemd service for Manabu on ARM-based Ubuntu
#
# This script creates a systemd service to run Manabu as a daemon
# Requires: sudo privileges
#
# Usage:
#   sudo ./setup-systemd-arm.sh [app_path] [port]
#
# Examples:
#   sudo ./setup-systemd-arm.sh /home/manabu/app 3000
#   sudo ./setup-systemd-arm.sh                          # Use current dir & port 3000
#
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_PATH=${1:-.}
PORT=${2:-3000}
SERVICE_NAME="manabu"
SERVICE_USER="manabu"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Manabu systemd Service Setup (ARM64)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run as root (use sudo)${NC}"
   exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}\n"

# Check if app directory exists
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}✗ App directory not found: $APP_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✓ App directory found: $APP_PATH${NC}\n"

# Create service user if it doesn't exist
if ! id "$SERVICE_USER" &>/dev/null; then
    echo -e "${YELLOW}⚠ Creating service user: $SERVICE_USER${NC}"
    useradd -r -s /bin/bash "$SERVICE_USER"
    echo -e "${GREEN}✓ Service user created${NC}"
else
    echo -e "${GREEN}✓ Service user exists: $SERVICE_USER${NC}"
fi

# Set ownership
echo -e "${YELLOW}⚠ Setting directory ownership...${NC}"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_PATH"
echo -e "${GREEN}✓ Ownership updated${NC}\n"

# Create systemd service file
echo -e "${YELLOW}⚠ Creating systemd service file...${NC}"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Manabu AI Learning Platform (Next.js)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$APP_PATH
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Environment
Environment="NODE_ENV=production"
Environment="PORT=$PORT"

# Load environment file
EnvironmentFile=-$APP_PATH/.env.local

# Resource limits
LimitNOFILE=65536
LimitNPROC=512

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$APP_PATH

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Service file created: $SERVICE_FILE${NC}\n"

# Reload systemd daemon
echo -e "${YELLOW}⚠ Reloading systemd daemon...${NC}"
systemctl daemon-reload
echo -e "${GREEN}✓ systemd reloaded${NC}\n"

# Enable the service
echo -e "${YELLOW}⚠ Enabling service...${NC}"
systemctl enable "$SERVICE_NAME"
echo -e "${GREEN}✓ Service enabled${NC}\n"

# Display usage information
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Service Information:${NC}"
echo "  Service Name:     $SERVICE_NAME"
echo "  Service File:     $SERVICE_FILE"
echo "  Service User:     $SERVICE_USER"
echo "  App Path:         $APP_PATH"
echo "  Port:             $PORT\n"

echo -e "${BLUE}Common Commands:${NC}"
echo "  Start service:    sudo systemctl start $SERVICE_NAME"
echo "  Stop service:     sudo systemctl stop $SERVICE_NAME"
echo "  Restart service:  sudo systemctl restart $SERVICE_NAME"
echo "  View status:      sudo systemctl status $SERVICE_NAME"
echo "  View logs:        sudo journalctl -u $SERVICE_NAME -f"
echo "  Disable service:  sudo systemctl disable $SERVICE_NAME\n"

echo -e "${YELLOW}⚠ Important:${NC}"
echo "  1. Update .env.local with your API keys:"
echo "     nano $APP_PATH/.env.local"
echo "  2. Start the service:"
echo "     sudo systemctl start $SERVICE_NAME"
echo "  3. Verify it's running:"
echo "     sudo systemctl status $SERVICE_NAME\n"

echo -e "${GREEN}Ready to start the service!${NC}\n"
