#!/bin/bash
# TypeScript Progress Checker
# Usage: ./scripts/check-ts-progress.sh

set -e

echo "🔍 Checking TypeScript Progress..."
echo "=================================="
echo ""

# Count total errors
TOTAL_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
echo "📊 Total TypeScript Errors: $TOTAL_ERRORS"

# Count by file (top 15)
echo ""
echo "📁 Top Files with Errors:"
echo "-------------------------"
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -15

# Count by error type
echo ""
echo "🏷️  Error Types:"
echo "---------------"
npx tsc --noEmit 2>&1 | grep "error TS" | grep -oE "error TS[0-9]+" | sort | uniq -c | sort -rn | head -10

# ESLint summary
echo ""
echo "🔧 ESLint Summary:"
echo "------------------"
npx eslint . --ext .ts,.tsx,.js,.jsx 2>&1 | tail -3

# Calculate progress
BASELINE=229
FIXED=$((BASELINE - TOTAL_ERRORS))
PERCENTAGE=$((FIXED * 100 / BASELINE))

echo ""
echo "📈 Overall Progress:"
echo "-------------------"
echo "Started with: $BASELINE errors"
echo "Fixed: $FIXED errors"
echo "Remaining: $TOTAL_ERRORS errors"
echo "Progress: $PERCENTAGE% complete"

# Save to progress file
DATE=$(date +%Y-%m-%d)
echo ""
echo "💾 Updating progress file..."
# This would update the JSON file, but requires jq. Simplified for now.
echo "Last checked: $DATE - $TOTAL_ERRORS errors remaining"

echo ""
echo "✅ Check complete!"
