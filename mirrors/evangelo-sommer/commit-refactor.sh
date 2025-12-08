#!/bin/bash
# Commit script for refactoring
# Usage: ./commit-refactor.sh "simplify auth logic" "Extract authentication into separate service"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <short-description> <detailed-description>"
    echo "Example: $0 \"simplify auth logic\" \"Extract authentication into separate service\""
    exit 1
fi

SHORT_DESC="$1"
DETAILED_DESC="$2"

git commit -m "refactor: ${SHORT_DESC}

${DETAILED_DESC}

Authored-by: Evangelo Sommer <epsommer@gmail.com>"
