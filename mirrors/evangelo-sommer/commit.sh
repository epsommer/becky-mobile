#!/bin/bash
# Interactive Git Commit Script
# Automatically stages changes and commits using standardized format

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to print header
print_header() {
    echo ""
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "$CYAN" "  $1"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_color "$RED" "Error: Not in a git repository!"
    exit 1
fi

print_header "Git Commit Helper"

# Show current status
print_color "$BLUE" "Current repository status:"
git status --short

echo ""
print_color "$YELLOW" "Stage all changes? (y/n/s for selective): "
read -r stage_option

case $stage_option in
    y|Y)
        git add -A
        print_color "$GREEN" "✓ All changes staged"
        ;;
    s|S)
        print_color "$YELLOW" "Enter file patterns to add (space-separated):"
        read -r files
        git add $files
        print_color "$GREEN" "✓ Selected files staged"
        ;;
    *)
        print_color "$YELLOW" "Using currently staged files"
        ;;
esac

echo ""
print_color "$BLUE" "Files to be committed:"
git --no-pager diff --cached --name-status

# Check if there are staged changes
if ! git diff --cached --quiet; then
    echo ""
else
    print_color "$RED" "Error: No staged changes to commit!"
    exit 1
fi

# Select commit type
print_header "Select Commit Type"
print_color "$CYAN" "1) feat      - New feature"
print_color "$CYAN" "2) fix       - Bug fix"
print_color "$CYAN" "3) refactor  - Code refactoring"
print_color "$CYAN" "4) style     - Code formatting"
print_color "$CYAN" "5) docs      - Documentation"
print_color "$CYAN" "6) test      - Tests"
print_color "$CYAN" "7) chore     - Maintenance"
print_color "$CYAN" "8) perf      - Performance"
echo ""
print_color "$YELLOW" "Select type (1-8): "
read -r type_choice

case $type_choice in
    1) commit_type="feat" ;;
    2) commit_type="fix" ;;
    3) commit_type="refactor" ;;
    4) commit_type="style" ;;
    5) commit_type="docs" ;;
    6) commit_type="test" ;;
    7) commit_type="chore" ;;
    8) commit_type="perf" ;;
    *)
        print_color "$RED" "Invalid choice!"
        exit 1
        ;;
esac

# Get commit subject
echo ""
print_color "$YELLOW" "Enter commit subject (imperative mood, <50 chars):"
print_color "$YELLOW" "Example: 'add user authentication' or 'fix button alignment'"
read -r subject

# Validate subject length
if [ ${#subject} -gt 50 ]; then
    print_color "$YELLOW" "⚠ Warning: Subject is ${#subject} characters (recommended: 50 or less)"
fi

# Ask for commit body
echo ""
print_color "$YELLOW" "Add detailed description? (y/n): "
read -r add_body

commit_message="${commit_type}: ${subject}"

if [ "$add_body" = "y" ] || [ "$add_body" = "Y" ]; then
    print_color "$YELLOW" "Enter description (empty line to finish):"
    print_color "$YELLOW" "Use bullet points with '-' for multiple items"
    echo ""

    body=""
    while IFS= read -r line; do
        [ -z "$line" ] && break
        body="${body}${line}\n"
    done

    if [ -n "$body" ]; then
        commit_message="${commit_message}\n\n${body}"
    fi
fi

# Preview commit message
print_header "Commit Preview"
echo -e "$commit_message"
echo ""

# Show diff summary
print_color "$BLUE" "Changes summary:"
git --no-pager diff --cached --stat

echo ""
print_color "$YELLOW" "Proceed with commit? (y/n): "
read -r confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    # Perform the commit
    echo -e "$commit_message" | git commit -F -

    if [ $? -eq 0 ]; then
        print_color "$GREEN" "✓ Commit successful!"
        echo ""
        print_color "$BLUE" "Latest commit:"
        git --no-pager log -1 --pretty=format:"%C(yellow)%h%Creset - %s %C(dim)(%cr)%Creset"
        echo ""
        echo ""

        print_color "$YELLOW" "Push to remote? (y/n): "
        read -r push_confirm

        if [ "$push_confirm" = "y" ] || [ "$push_confirm" = "Y" ]; then
            current_branch=$(git branch --show-current)
            git push origin "$current_branch"
            print_color "$GREEN" "✓ Pushed to origin/$current_branch"
        fi
    else
        print_color "$RED" "✗ Commit failed (possibly rejected by validation hook)"
        exit 1
    fi
else
    print_color "$YELLOW" "Commit cancelled"
    exit 0
fi

echo ""
print_color "$GREEN" "Done!"
