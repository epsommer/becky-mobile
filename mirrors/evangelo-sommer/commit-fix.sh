#!/bin/bash
# Commit script for bug fixes
# Usage: ./commit-fix.sh "header border-radius issue" "Remove border-radius from header in neomorphic mode"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <short-description> <detailed-description>"
    echo "Example: $0 \"login button color\" \"Fix text visibility in dark mode\""
    exit 1
fi

SHORT_DESC="$1"
DETAILED_DESC="$2"

git commit -m "fix: ${SHORT_DESC}

${DETAILED_DESC}

Authored-by: Evangelo Sommer <epsommer@gmail.com>"
