#!/bin/bash
# Fix TypeScript Errors in a Specific File
# Usage: ./scripts/fix-file.sh src/components/WeekView.tsx

set -e

if [ -z "$1" ]; then
  echo "❌ Usage: ./scripts/fix-file.sh <file-path>"
  echo "Example: ./scripts/fix-file.sh src/components/WeekView.tsx"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "🔍 Checking TypeScript errors in: $FILE"
echo "========================================"
echo ""

# Check for errors in the specific file
ERRORS=$(npx tsc --noEmit 2>&1 | grep "$FILE" || echo "No errors found")

if [ "$ERRORS" = "No errors found" ]; then
  echo "✅ No TypeScript errors in this file!"
  exit 0
fi

# Display errors
echo "$ERRORS"
echo ""

# Count errors
ERROR_COUNT=$(echo "$ERRORS" | wc -l | tr -d ' ')
echo "📊 Found $ERROR_COUNT errors in $FILE"

# Show error types
echo ""
echo "🏷️  Error types in this file:"
echo "$ERRORS" | grep -oE "error TS[0-9]+" | sort | uniq -c | sort -rn

echo ""
echo "💡 Common fixes:"
echo "  - TS7006: Add type to parameter (e.g., (item: Type) => ...)"
echo "  - TS18046: Type error in catch block (e.g., error instanceof Error)"
echo "  - TS2339: Property doesn't exist (add ? or type guard)"
echo "  - TS2322: Type mismatch (check return type or add type assertion)"
echo ""
echo "After fixing, run: ./scripts/fix-file.sh $FILE"
