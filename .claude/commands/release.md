# Release Management Skill

Execute the complete Pisscord release workflow. This skill encodes expert knowledge about version management, multi-platform builds, and release artifact coordination.

## When to Activate

- User mentions "release", "new version", "ship", "deploy", or "publish"
- User provides a version number like "1.5.2" or "bump to X.X.X"
- User asks to "update the version" across the codebase

## Mental Model

A Pisscord release is a **coordinated state change** across 7 locations:
1. `package.json` - npm ecosystem version
2. `App.tsx` (APP_VERSION constant) - runtime version display
3. `CLAUDE.md` - handoff documentation
4. `scripts/setup-pissbot-config.js` - AI context version
5. `scripts/setup-release-notes.js` - user-facing notes
6. Git tag - release anchor point
7. Firebase `/system/` paths - client update detection

Think of it like a database transaction: all must succeed or the release is inconsistent.

## Release Workflow

### Phase 1: Version Bump (Deterministic)

1. **Read current version** from `package.json`
2. **Determine new version** (user-provided or semantic bump)
3. **Update all version locations** in parallel:

```bash
# package.json - edit "version" field
# App.tsx - find APP_VERSION = 'X.X.X' and update
# CLAUDE.md - update version in header and "Current Version" line
# scripts/setup-pissbot-config.js - update version in context
# scripts/setup-release-notes.js - update CURRENT_VERSION constant
```

### Phase 2: Release Notes

Gather changes since last release:
```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Draft release notes in this format:
```markdown
### v{VERSION} ({DATE})
- **Feature Name:** Brief description
- **Bug Fix:** What was fixed
- **Improvement:** What improved
```

Update `scripts/setup-release-notes.js` with the new notes.

### Phase 3: Build Verification

```bash
# Type check
npx tsc --noEmit

# Build all platforms
npm run build        # Desktop
npm run build:web    # Web browser
```

If builds fail, stop and fix before proceeding.

### Phase 4: Git Operations

```bash
# Stage all version changes
git add package.json App.tsx CLAUDE.md scripts/

# Commit with conventional message
git commit -m "chore: bump version to vX.X.X"

# Create annotated tag
git tag -a vX.X.X -m "Release vX.X.X"

# Push with tags
git push origin main --tags
```

### Phase 5: GitHub Release

```bash
gh release create vX.X.X \
  --title "Pisscord vX.X.X" \
  --notes-file RELEASE_NOTES.md
```

For desktop releases, after `npm run dist`:
```bash
gh release upload vX.X.X \
  "dist/Pisscord Setup X.X.X.exe" \
  "dist/latest.yml"
```

### Phase 6: Firebase Updates

```bash
node scripts/setup-pissbot-config.js
node scripts/setup-release-notes.js
```

### Phase 7: Web Deployment (if applicable)

```bash
npx firebase deploy --only hosting
```

## Decision Points

| Situation | Action |
|-----------|--------|
| Only patch changes (bug fixes) | Bump Z in X.Y.Z |
| New features, backward compatible | Bump Y in X.Y.Z |
| Breaking changes | Bump X in X.Y.Z |
| Desktop-only release | Skip `build:web` and Firebase hosting |
| Web-only hotfix | Skip `npm run dist` and GitHub release assets |

## Version Locations Reference

| File | Pattern to Find | Example |
|------|-----------------|---------|
| `package.json` | `"version": "X.X.X"` | `"version": "1.5.1"` |
| `App.tsx` | `APP_VERSION = 'X.X.X'` | `APP_VERSION = '1.5.1'` |
| `CLAUDE.md` | `**Current Version:** X.X.X` | `**Current Version:** 1.5.1` |
| `setup-pissbot-config.js` | `version: 'X.X.X'` in context | `version: '1.5.1'` |
| `setup-release-notes.js` | `CURRENT_VERSION = 'X.X.X'` | `CURRENT_VERSION = '1.5.1'` |

## Anti-Patterns

- **Never** push to main without version bump commit
- **Never** create tag before updating all version locations
- **Never** upload release assets before tag exists
- **Never** run Firebase scripts before git push (allows rollback)

## Rollback Procedure

If release fails mid-way:
```bash
# Delete local tag
git tag -d vX.X.X

# Delete remote tag (if pushed)
git push origin :refs/tags/vX.X.X

# Revert version commit
git revert HEAD

# Delete GitHub release (if created)
gh release delete vX.X.X --yes
```

## Example Usage

User: "Release version 1.5.2 with voice message improvements"

Claude should:
1. Update all 5 version locations to 1.5.2
2. Generate release notes mentioning voice messages
3. Run builds and verify success
4. Create git commit and tag
5. Push and create GitHub release
6. Update Firebase configs
7. Report completion with links

---
Created: 2025-12-25
Version: 1.0
Author: Claude Code Analysis
