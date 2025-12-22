# Automatic Versioning System

This project uses automatic version bumping based on git commits.

## How It Works

### Automatic Patch Bumps
- **Every commit** automatically increments the patch version (0.1.0 → 0.1.1)
- Happens via git pre-commit hook

### Manual Version Bumps
Include these keywords in your commit message:

- `[major]` - Breaking changes (1.0.0 → 2.0.0)
- `[minor]` - New features (1.0.0 → 1.1.0)  
- `[patch]` - Bug fixes (1.0.0 → 1.0.1) - default behavior
- `[no-bump]` - Skip version increment

### Examples

```bash
# Auto patch bump
git commit -m "Fix image loading issue"
# 0.1.0 → 0.1.1

# Minor bump for new features
git commit -m "Add preset playlists feature [minor]"
# 0.1.1 → 0.2.0

# Major bump for breaking changes
git commit -m "Redesign API endpoints [major]"
# 0.2.0 → 1.0.0

# Skip version bump
git commit -m "Update README [no-bump]"
# Version stays the same
```

## Version Display

- **Production**: Shows clean version (e.g., "1.2.3")
- **Development**: Shows version with build time (e.g., "1.2.3-dev (2025-12-22 15:00)")

## Setup

The git hook is already configured. If you need to reinstall it:

```bash
chmod +x .git/hooks/pre-commit
```
