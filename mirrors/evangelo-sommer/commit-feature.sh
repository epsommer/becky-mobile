#!/bin/bash
# Commit script for new features
# Usage: ./commit-feature.sh "add testimonial system" "Implement testimonial request functionality"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <short-description> <detailed-description>"
    echo "Example: $0 \"add testimonial system\" \"Implement testimonial request and management\""
    exit 1
fi

SHORT_DESC="$1"
DETAILED_DESC="$2"

git commit -m "feat: ${SHORT_DESC}

${DETAILED_DESC}

Authored-by: Evangelo Sommer <epsommer@gmail.com>"
