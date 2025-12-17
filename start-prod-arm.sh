#!/bin/bash

################################################################################
# SkillSprout Production Startup Script for ARM-based Ubuntu
#
# Usage:
#   chmod +x start-prod-arm.sh
#   ./start-prod-arm.sh [port] [environment]
#
# Examples:
#   ./start-prod-arm.sh                    # Use default port 3000, prod env
#   ./start-prod-arm.sh 3000               # Use port 3000
#   ./start-prod-arm.sh 8080 dev           # Use port 8080, dev environment
#
# Requirements:
#   - Node.js 18+ (ARM64 compatible)
#   - npm or yarn
#   - .env.local file with API keys
#
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=${1:-3000}
ENVIRONMENT=${2:-production}
PROJECT_NAME="SkillSprout"
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/prod-server.log"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  $PROJECT_NAME Production Server Startup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 1. Check Node.js installation
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+ for ARM64."
    echo "  Install via: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    exit 1
fi

NODE_VERSION=$(node -v)
print_status "Node.js found: $NODE_VERSION"

# 2. Check npm installation
print_info "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm not found."
    exit 1
fi

NPM_VERSION=$(npm -v)
print_status "npm found: v$NPM_VERSION"

# 3. Check .env.local file
print_info "Checking environment file..."
if [ ! -f ".env.local" ]; then
    print_warning "No .env.local file found. Creating template..."
    cat > .env.local << 'ENVEOF'
# API Keys - Update with your actual keys
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_API_ENDPOINT=/api/ai

# Optional: Paid Search APIs
# BRAVE_SEARCH_API_KEY=
# SERPER_API_KEY=
ENVEOF
    print_warning "Created .env.local template. Please update with your API keys!"
    echo ""
fi
print_status ".env.local exists"

# 4. Check if build exists
print_info "Checking for build directory..."
if [ ! -d ".next" ]; then
    print_warning "No .next build directory found. Building..."
    echo ""
    npm run build
    echo ""
else
    print_status "Build directory found"
fi

# 5. Install dependencies if needed
print_info "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed. Installing..."
    npm install
fi
print_status "Dependencies ready"

# 6. Display startup information
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting $PROJECT_NAME Production Server${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

print_info "Configuration:"
echo "  Port:        $PORT"
echo "  Environment: $ENVIRONMENT"
echo "  Node.js:     $NODE_VERSION"
echo "  npm:         v$NPM_VERSION"
echo "  Log file:    $LOG_FILE"
echo ""

print_info "System Information:"
ARCH=$(uname -m)
OS=$(uname -s)
echo "  Architecture: $ARCH"
echo "  OS:           $OS"
echo ""

# 7. Start the server
print_info "Starting server (logs saved to $LOG_FILE)...\n"

# Export environment variables
export NODE_ENV=$ENVIRONMENT
export PORT=$PORT

# Start with output to both console and log file
npm start | tee -a "$LOG_FILE" &

# Get the PID of the process
SERVER_PID=$!

# Give server a moment to start
sleep 2

# Check if server is still running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    print_error "Server failed to start. Check $LOG_FILE for details."
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ $PROJECT_NAME is running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

print_status "Server started successfully (PID: $SERVER_PID)"
print_info "Access the app at: http://localhost:$PORT"
print_info "View logs:         tail -f $LOG_FILE"
print_info "Stop server:       kill $SERVER_PID"

echo ""
print_info "Next steps:"
echo "  1. Open http://localhost:$PORT in your browser"
echo "  2. If API keys are not set, update .env.local"
echo "  3. Restart server: systemctl restart skillsprout (if using systemd)"
echo ""

# Wait for the server process
wait $SERVER_PID
