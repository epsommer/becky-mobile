# Commit Commands Guide

Quick reference for committing changes in this project.

## 🚀 Quick Start

### Method 1: Interactive Commit (Recommended)
```bash
npm run commit
```
Follow the guided prompts to create a well-formatted commit.

### Method 2: Quick Commit (One-liner)
```bash
npm run qc <type> "<message>"
```

**Examples:**
```bash
npm run qc fix "correct button alignment"
npm run qc feat "add user authentication"
npm run qc refactor "extract API logic"
```

---

## 📝 Commit Types

| Command | When to Use | Example |
|---------|-------------|---------|
| `feat` | New feature | `npm run qc feat "add dark mode toggle"` |
| `fix` | Bug fix | `npm run qc fix "correct login validation"` |
| `refactor` | Code cleanup/restructure | `npm run qc refactor "simplify auth flow"` |
| `style` | Formatting only | `npm run qc style "fix indentation"` |
| `docs` | Documentation | `npm run qc docs "update API guide"` |
| `test` | Tests | `npm run qc test "add login tests"` |
| `chore` | Maintenance | `npm run qc chore "update dependencies"` |
| `perf` | Performance | `npm run qc perf "optimize images"` |

---

## 📖 Common Workflows

### Simple Bug Fix
```bash
# 1. Make your changes
# 2. Quick commit
npm run qc fix "correct navigation menu behavior"
```

### New Feature with Details
```bash
# 1. Make your changes
# 2. Interactive commit
npm run commit

# Follow prompts:
# - Select "feat"
# - Enter subject: "add user profile page"
# - Add description with details
# - Review and confirm
```

### Multiple Changes
```bash
# Use interactive mode to stage selectively
npm run commit

# Choose "s" for selective staging
# Enter files: "src/components/*.tsx"
```

---

## ✅ Commit Message Rules

### DO:
✅ Use imperative mood: "add feature" not "added feature"
✅ Keep subject under 50 characters
✅ Be specific: "fix login button color" not "fix button"
✅ Separate type and subject with colon: `fix: message`

### DON'T:
❌ Capitalize first letter: ~~"Fix button"~~ → "fix button"
❌ End with period: ~~"fix button."~~ → "fix button"
❌ Be vague: ~~"update files"~~ → "update user schema"
❌ Include AI attributions

---

## 🎯 Examples

### Good Commits ✅
```bash
npm run qc fix "correct login button text color in dark mode"
npm run qc feat "add email notification system"
npm run qc refactor "extract database queries into service layer"
npm run qc perf "lazy load images on homepage"
```

### Bad Commits ❌
```bash
npm run qc fix "Fixed stuff"           # Too vague
npm run qc feat "Added login"          # Not imperative mood
npm run qc "update button"             # Missing type
git commit -m "changes"                # No format, vague
```

---

## 🔧 Alternative Methods

### Git Aliases (Global)
These work in ANY git repository on your machine:
```bash
git fix "message"
git feat "message"
git refactor "message"
git docs "message"
git chore "message"
```

### Direct Script Execution
```bash
./commit.sh                    # Interactive
./qc.sh fix "message"         # Quick
```

### Manual Git Commands
```bash
git add .
git commit -m "fix: message"
git push
```

---

## 💡 Pro Tips

1. **Use interactive mode for important commits**
   - Allows detailed descriptions
   - Preview before committing
   - Better for code reviews

2. **Use quick commit for small fixes**
   - Fast and efficient
   - Good for typos, formatting
   - Quick iterations

3. **Review before committing**
   ```bash
   git status          # See what changed
   git diff            # See detailed changes
   npm run commit      # Then commit
   ```

4. **Keep commits atomic**
   - One logical change per commit
   - Makes history easier to understand
   - Easier to revert if needed

5. **Write for your future self**
   - You'll thank yourself later
   - Clear messages = faster debugging
   - Good history = easier collaboration

---

## 🛑 Validation

All commits are automatically validated to ensure:
- ✅ Proper format: `<type>: <subject>`
- ✅ Valid commit type
- ✅ No AI/tool attributions
- ⚠️  Warning if subject > 50 chars

If validation fails, you'll see an error message explaining the issue.

---

## 🔍 Checking Your Commits

### View Recent Commits
```bash
git log --oneline -5
```

### View Last Commit Details
```bash
git log -1
```

### View Commit History with Graph
```bash
git log --oneline --graph --all
```

---

## ❓ Troubleshooting

### "Permission denied" error
```bash
chmod +x commit.sh qc.sh
```

### "Command not found"
Make sure you're in the project root:
```bash
pwd  # Should show: /Users/epsommer/projects/evangelo-sommer
```

### Commit rejected by hook
Your message doesn't follow the format. Check:
- Does it start with a valid type?
- Is there a colon after the type?
- Does it contain AI attributions?

### Need to bypass validation (emergency)
```bash
git commit --no-verify -m "message"
```
⚠️ Use sparingly! Fix the issue properly instead.

---

## 📚 More Information

- **Detailed documentation**: See `COMMIT_SCRIPTS.md`
- **Global git setup**: See `~/GIT_COMMIT_GUIDE.md`
- **Quick reference**: See `~/GIT_COMMIT_QUICKREF.txt`

---

## 🎬 Quick Demo

Try it now:
```bash
# Make a test change
echo "# Test" >> test.txt

# Commit it
npm run qc chore "add test file"

# View the commit
git log -1 --oneline

# Clean up
git reset --soft HEAD~1
rm test.txt
```

---

**Remember:** Good commits make happy developers! 🎉

Last Updated: 2025-11-16
