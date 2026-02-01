#!/bin/bash

# SendBandit Local Development Cleanup Script
# Run with: ./scripts/cleanup-local.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SendBandit Local Cleanup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script is designed for macOS${NC}"
    exit 1
fi

# ============ Step 1: Stop PM2 Processes ============
echo -e "${BLUE}Step 1: Stopping PM2 processes...${NC}"

if command -v pm2 >/dev/null 2>&1; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    echo -e "${GREEN}  ✓ PM2 processes stopped${NC}"
else
    echo -e "${YELLOW}  ✓ PM2 not installed, skipping${NC}"
fi

echo ""

# ============ Step 2: Remove /etc/hosts Entries ============
echo -e "${BLUE}Step 2: Removing /etc/hosts entries...${NC}"
echo -e "${YELLOW}  (This requires sudo access)${NC}"
echo ""

# Remove sendbandit.local entries
sudo sed -i '' '/sendbandit\.local/d' /etc/hosts

echo -e "${GREEN}  ✓ Removed sendbandit.local entries from /etc/hosts${NC}"

# Restore backup if desired
if [ -f /etc/hosts.backup.sendbandit ]; then
    echo -e "${YELLOW}  Backup available at /etc/hosts.backup.sendbandit${NC}"
    echo -e "${YELLOW}  To restore: sudo cp /etc/hosts.backup.sendbandit /etc/hosts${NC}"
fi

echo ""

# ============ Step 3: Clean Local Data (Optional) ============
echo -e "${BLUE}Step 3: Cleaning local data...${NC}"

read -p "Do you want to remove local storage data? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf storage/
    rm -rf .wrangler/
    echo -e "${GREEN}  ✓ Removed storage/ and .wrangler/${NC}"
else
    echo -e "${YELLOW}  ✓ Skipped storage cleanup${NC}"
fi

echo ""

# ============ Summary ============
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Cleanup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
