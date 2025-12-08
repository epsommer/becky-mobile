#!/bin/bash
# Commit script for styling changes
# Usage: ./commit-style.sh "update button styles" "Enhance neomorphic button appearance"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <short-description> <detailed-description>"
    echo "Example: $0 \"update button styles\" \"Enhance neomorphic button appearance\""
    exit 1
fi

SHORT_DESC="$1"
DETAILED_DESC="$2"

git commit -m "style: ${SHORT_DESC}

${DETAILED_DESC}

Authored-by: Evangelo Sommer <epsommer@gmail.com>"
