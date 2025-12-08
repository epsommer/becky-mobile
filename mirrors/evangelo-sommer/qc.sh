#!/bin/bash
# Quick Commit Script - One-liner commits
# Usage: ./qc.sh <type> <message>
# Example: ./qc.sh fix "correct button alignment"

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <type> <message>${NC}"
    echo ""
    echo "Types: feat, fix, refactor, style, docs, test, chore, perf"
    echo ""
    echo "Example:"
    echo "  $0 fix \"correct navigation alignment\""
    echo "  $0 feat \"add dark mode support\""
    exit 1
fi

type=$1
shift
message="$*"

# Validate type
valid_types="feat fix refactor style docs test chore perf"
if ! echo "$valid_types" | grep -q "\b$type\b"; then
    echo -e "${RED}Error: Invalid type '$type'${NC}"
    echo "Valid types: $valid_types"
    exit 1
fi

# Stage all changes
git add -A

# Check if there are changes
if git diff --cached --quiet; then
    echo -e "${RED}Error: No changes to commit${NC}"
    exit 1
fi

# Show what will be committed
echo -e "${YELLOW}Committing:${NC}"
git --no-pager diff --cached --name-status

# Create commit message
commit_msg="${type}: ${message}"

echo ""
echo -e "${YELLOW}Message: ${NC}$commit_msg"
echo ""

# Commit
if git commit -m "$commit_msg"; then
    echo -e "${GREEN}✓ Commit successful!${NC}"
    git --no-pager log -1 --oneline

    # Ask about push
    echo -n "Push to remote? (y/n): "
    read -r push_confirm
    if [ "$push_confirm" = "y" ] || [ "$push_confirm" = "Y" ]; then
        current_branch=$(git branch --show-current)
        git push origin "$current_branch"
        echo -e "${GREEN}✓ Pushed to origin/$current_branch${NC}"
    fi
else
    echo -e "${RED}✗ Commit failed${NC}"
    exit 1
fi
