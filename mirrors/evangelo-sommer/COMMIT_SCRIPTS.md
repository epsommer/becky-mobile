# Commit Helper Scripts

This project includes automated commit scripts that enforce standardized commit message formats.

## Available Scripts

### 1. Interactive Commit (`commit.sh`)

Full-featured interactive commit wizard with guided prompts.

**Usage:**
```bash
# Direct execution
./commit.sh

# Or via npm
npm run commit
```

**Features:**
- ✅ Interactive file staging (all/selective/existing)
- ✅ Menu-driven commit type selection
- ✅ Subject line validation
- ✅ Optional detailed description
- ✅ Commit preview before execution
- ✅ Optional push to remote
- ✅ Colored terminal output

**Workflow:**
1. Shows current git status
2. Asks how to stage files
3. Shows files to be committed
4. Menu to select commit type
5. Prompts for subject line
6. Option to add detailed description
7. Preview and confirm
8. Commit and optionally push

---

### 2. Quick Commit (`qc.sh`)

Fast one-liner commits for quick changes.

**Usage:**
```bash
# Direct execution
./qc.sh <type> <message>

# Examples
./qc.sh fix "correct button alignment"
./qc.sh feat "add user authentication"
./qc.sh refactor "extract utility functions"

# Or via npm
npm run qc fix "correct button alignment"
```

**Features:**
- ⚡ Fast one-line commits
- ✅ Automatic staging of all changes
- ✅ Type validation
- ✅ Optional push to remote
- ✅ Shows commit summary

---

## Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add dark mode toggle` |
| `fix` | Bug fix | `fix: correct navigation alignment` |
| `refactor` | Code refactoring | `refactor: extract auth logic` |
| `style` | Code formatting | `style: fix indentation` |
| `docs` | Documentation | `docs: update API documentation` |
| `test` | Tests | `test: add login flow tests` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf: optimize image loading` |

---

## Examples

### Interactive Commit Example

```bash
$ npm run commit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Git Commit Helper
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current repository status:
 M src/app/page.tsx
 M src/app/globals.css

Stage all changes? (y/n/s for selective): y
✓ All changes staged

Files to be committed:
M       src/app/page.tsx
M       src/app/globals.css

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Select Commit Type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) feat      - New feature
2) fix       - Bug fix
3) refactor  - Code refactoring
4) style     - Code formatting
5) docs      - Documentation
6) test      - Tests
7) chore     - Maintenance
8) perf      - Performance

Select type (1-8): 2

Enter commit subject (imperative mood, <50 chars):
Example: 'add user authentication' or 'fix button alignment'
correct dark mode text colors

Add detailed description? (y/n): y
Enter description (empty line to finish):
Use bullet points with '-' for multiple items

- Fix login button text visibility
- Update social link colors
- Remove conflicting CSS rules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Commit Preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fix: correct dark mode text colors

- Fix login button text visibility
- Update social link colors
- Remove conflicting CSS rules

Changes summary:
 src/app/page.tsx    | 12 ++++++------
 src/app/globals.css |  8 ++++++++
 2 files changed, 14 insertions(+), 6 deletions(-)

Proceed with commit? (y/n): y
✓ Commit successful!

Latest commit:
a1b2c3d - fix: correct dark mode text colors (2 seconds ago)

Push to remote? (y/n): y
✓ Pushed to origin/main

Done!
```

### Quick Commit Example

```bash
$ npm run qc fix "correct button text color"

Committing:
M       src/app/neomorphic.css

Message: fix: correct button text color

[main a1b2c3d] fix: correct button text color
 1 file changed, 5 insertions(+)
✓ Commit successful!
a1b2c3d fix: correct button text color

Push to remote? (y/n): y
✓ Pushed to origin/main
```

---

## Commit Message Format

All commits follow this standardized format:

```
<type>: <subject>

[optional body]
```

### Rules:
- ✅ Use imperative mood ("add" not "added")
- ✅ Subject under 50 characters
- ✅ No capitalization (except proper nouns)
- ✅ No period at end
- ❌ NO AI/tool attributions

---

## Validation

Both scripts work with the git commit hook (`.git/hooks/commit-msg`) that validates:
- Proper format
- Valid commit type
- No AI attributions
- Subject length warning

If validation fails, the commit will be rejected with an error message.

---

## Alternative Methods

If you prefer not to use the scripts:

### Git Aliases (Global)
```bash
git fix "description"
git feat "description"
git refactor "description"
```

### Manual Format
```bash
git commit -m "fix: description"
```

---

## Tips

1. **Use interactive mode** for complex commits with detailed descriptions
2. **Use quick commit** for simple one-line changes
3. **Review changes** before committing with `git diff`
4. **Keep subjects concise** - focus on WHAT changed, not HOW
5. **Use body for context** - explain WHY the change was needed

---

## Troubleshooting

### Permission Denied
```bash
chmod +x commit.sh qc.sh
```

### Scripts Not Found
Make sure you're in the project root directory:
```bash
cd /path/to/evangelo-sommer
./commit.sh
```

### Validation Errors
The commit hook validates your message. Common issues:
- Missing type prefix
- Invalid type
- AI attribution detected

To bypass validation (emergency only):
```bash
git commit --no-verify -m "message"
```

---

Last Updated: 2025-11-16
