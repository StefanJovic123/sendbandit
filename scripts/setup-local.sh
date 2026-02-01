#!/bin/bash

# SendBandit Local Development Setup Script for macOS
# Run with: ./scripts/setup-local.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SendBandit Local Development Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script is designed for macOS${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to add hosts entry
add_hosts_entry() {
    local domain=$1
    if grep -q "$domain" /etc/hosts; then
        echo -e "${YELLOW}  ✓ $domain already in /etc/hosts${NC}"
    else
        echo "127.0.0.1 $domain" | sudo tee -a /etc/hosts > /dev/null
        echo -e "${GREEN}  ✓ Added $domain to /etc/hosts${NC}"
    fi
}

# ============ Step 1: Check Dependencies ============
echo -e "${BLUE}Step 1: Checking dependencies...${NC}"
echo ""

# Check for Homebrew
if ! command_exists brew; then
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
echo -e "${GREEN}  ✓ Homebrew installed${NC}"

# Check for Node.js
if ! command_exists node; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    brew install node
fi
echo -e "${GREEN}  ✓ Node.js $(node --version) installed${NC}"

# Check for pnpm
if ! command_exists pnpm; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}  ✓ pnpm $(pnpm --version) installed${NC}"

# Check for Caddy
if ! command_exists caddy; then
    echo -e "${YELLOW}Installing Caddy...${NC}"
    brew install caddy
fi
echo -e "${GREEN}  ✓ Caddy $(caddy version | head -n1) installed${NC}"

# Check for PM2
if ! command_exists pm2; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}  ✓ PM2 $(pm2 --version) installed${NC}"

# Check for Wrangler
if ! command_exists wrangler; then
    echo -e "${YELLOW}Installing Wrangler...${NC}"
    npm install -g wrangler
fi
echo -e "${GREEN}  ✓ Wrangler $(wrangler --version) installed${NC}"

echo ""

# ============ Step 2: Configure /etc/hosts ============
echo -e "${BLUE}Step 2: Configuring /etc/hosts...${NC}"
echo -e "${YELLOW}  (This requires sudo access)${NC}"
echo ""

# Backup hosts file
if [ ! -f /etc/hosts.backup.sendbandit ]; then
    sudo cp /etc/hosts /etc/hosts.backup.sendbandit
    echo -e "${GREEN}  ✓ Created backup at /etc/hosts.backup.sendbandit${NC}"
fi

# Add local domains
add_hosts_entry "api.sendbandit.local"
add_hosts_entry "app.sendbandit.local"
add_hosts_entry "webhooks.sendbandit.local"
add_hosts_entry "realtime.sendbandit.local"
add_hosts_entry "media.sendbandit.local"

echo ""

# ============ Step 3: Create Local Directories ============
echo -e "${BLUE}Step 3: Creating local directories...${NC}"

# Create storage directories for local development
mkdir -p storage/media
mkdir -p .wrangler

echo -e "${GREEN}  ✓ Created storage/media${NC}"
echo -e "${GREEN}  ✓ Created .wrangler${NC}"

echo ""

# ============ Step 4: Install Dependencies ============
echo -e "${BLUE}Step 4: Installing project dependencies...${NC}"
echo ""

pnpm install

echo ""
echo -e "${GREEN}  ✓ Dependencies installed${NC}"
echo ""

# ============ Step 5: Create Local Environment Files ============
echo -e "${BLUE}Step 5: Creating environment files...${NC}"

# Create .dev.vars for workers if it doesn't exist
if [ ! -f .dev.vars ]; then
    cat > .dev.vars << 'EOF'
# Local development environment variables
# These are loaded by wrangler dev

# ============ REQUIRED: Supabase Database ============
# Get these from your Supabase project settings > Database
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# ============ Authentication ============
# Clerk (get from https://dashboard.clerk.dev)
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# ============ Payments ============
# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ============ Channel Providers (Optional) ============
# WhatsApp Business API
# WHATSAPP_ACCESS_TOKEN=xxxxx
# WHATSAPP_PHONE_NUMBER_ID=xxxxx
# WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx

# Telegram Bot
# TELEGRAM_BOT_TOKEN=xxxxx

# Facebook Messenger
# FACEBOOK_PAGE_ACCESS_TOKEN=xxxxx

# Instagram
# INSTAGRAM_ACCESS_TOKEN=xxxxx

# Slack
# SLACK_BOT_TOKEN=xoxb-xxxxx

# Discord
# DISCORD_BOT_TOKEN=xxxxx
EOF
    echo -e "${GREEN}  ✓ Created .dev.vars (add your API keys)${NC}"
else
    echo -e "${YELLOW}  ✓ .dev.vars already exists${NC}"
fi

# Create database .env for drizzle-kit if it doesn't exist
if [ ! -f packages/database/.env ]; then
    cat > packages/database/.env << 'EOF'
# Database URL for Drizzle Kit migrations
# Get from Supabase project settings > Database > Connection string (URI)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
EOF
    echo -e "${GREEN}  ✓ Created packages/database/.env (add your DATABASE_URL)${NC}"
else
    echo -e "${YELLOW}  ✓ packages/database/.env already exists${NC}"
fi

# Create frontend .env.local if it doesn't exist
if [ ! -f apps/web/.env.local ]; then
    cat > apps/web/.env.local << 'EOF'
# Local development environment variables for Next.js

# API URL (points to local Caddy reverse proxy)
NEXT_PUBLIC_API_URL=http://api.sendbandit.local

# Clerk (get from https://dashboard.clerk.dev)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
EOF
    echo -e "${GREEN}  ✓ Created apps/web/.env.local (add your API keys)${NC}"
else
    echo -e "${YELLOW}  ✓ apps/web/.env.local already exists${NC}"
fi

echo ""

# ============ Step 6: Build Packages ============
echo -e "${BLUE}Step 6: Building shared packages...${NC}"
echo ""

pnpm build --filter=@sendbandit/shared --filter=@sendbandit/database --filter=@sendbandit/middleware --filter=@sendbandit/channel-providers

echo ""
echo -e "${GREEN}  ✓ Packages built${NC}"
echo ""

# ============ Summary ============
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Local domains configured:"
echo -e "  ${GREEN}http://app.sendbandit.local${NC}      - Frontend"
echo -e "  ${GREEN}http://api.sendbandit.local${NC}      - API Gateway"
echo -e "  ${GREEN}http://webhooks.sendbandit.local${NC} - Webhooks"
echo -e "  ${GREEN}http://realtime.sendbandit.local${NC} - WebSocket"
echo -e "  ${GREEN}http://media.sendbandit.local${NC}    - Media files"
echo ""
echo -e "Service ports:"
echo -e "  api-auth:        ${YELLOW}8787${NC}"
echo -e "  api-clients:     ${YELLOW}8788${NC}"
echo -e "  api-templates:   ${YELLOW}8789${NC}"
echo -e "  api-campaigns:   ${YELLOW}8790${NC}"
echo -e "  api-analytics:   ${YELLOW}8791${NC}"
echo -e "  api-billing:     ${YELLOW}8792${NC}"
echo -e "  scheduler:       ${YELLOW}8793${NC}"
echo -e "  queue-processor: ${YELLOW}8794${NC}"
echo -e "  webhooks:        ${YELLOW}8795${NC}"
echo -e "  realtime:        ${YELLOW}8796${NC}"
echo -e "  web (Next.js):   ${YELLOW}3000${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Create a Supabase project at ${BLUE}https://supabase.com${NC}"
echo -e "  2. Add your DATABASE_URL to ${BLUE}.dev.vars${NC} and ${BLUE}packages/database/.env${NC}"
echo -e "  3. Run migrations: ${GREEN}pnpm db:push${NC}"
echo -e "  4. Add other API keys to ${BLUE}.dev.vars${NC} and ${BLUE}apps/web/.env.local${NC}"
echo -e "  5. Start all services: ${GREEN}pnpm dev:local${NC}"
echo -e "  6. View logs: ${GREEN}pm2 logs${NC}"
echo -e "  7. Monitor: ${GREEN}pm2 monit${NC}"
echo -e "  8. Stop all: ${GREEN}pm2 stop all${NC}"
echo ""
echo -e "${YELLOW}Database commands:${NC}"
echo -e "  ${GREEN}pnpm db:generate${NC}  - Generate migrations from schema"
echo -e "  ${GREEN}pnpm db:push${NC}      - Push schema directly to database"
echo -e "  ${GREEN}pnpm db:studio${NC}    - Open Drizzle Studio to browse data"
echo ""
echo -e "${YELLOW}To remove local hosts entries later:${NC}"
echo -e "  ${GREEN}./scripts/cleanup-local.sh${NC}"
echo ""
