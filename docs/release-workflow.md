# Release Workflow

This document describes the release workflow for WinShot using semantic-release with beta and stable channels.

## Branch Structure

```
main (stable)     ←── PR from dev ←── stable releases (v1.5.0, v1.6.0)
  │
  └── dev (beta)  ←── PR from feature branches ←── beta releases (v1.6.0-beta.0)
        │
        └── feature branches (goon, feature/*, fix/*)
```

| Branch | Purpose | Release Channel | Version Format |
|--------|---------|-----------------|----------------|
| `main` | Production releases | `latest` | `v1.6.0` |
| `dev` | Beta/preview releases | `beta` | `v1.6.0-beta.0` |
| `goon`, `feature/*` | Development work | None (no auto-release) | N/A |

## Semantic-Release Configuration

Located in `.releaserc.json`:

```json
{
  "branches": [
    { "name": "main", "channel": "latest" },
    { "name": "dev", "prerelease": "beta", "channel": "beta" }
  ]
}
```

### Version Bump Rules

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | Minor | 1.5.0 → 1.6.0 |
| `fix:` | Patch | 1.5.0 → 1.5.1 |
| `perf:` | Patch | 1.5.0 → 1.5.1 |
| `feat!:` or `BREAKING CHANGE:` | Major | 1.5.0 → 2.0.0 |
| `chore:`, `docs:`, `style:`, `refactor:` | No release | - |

## Release Workflows

### Beta Release (dev branch)

1. **Create feature branch from dev**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-feature
   ```

2. **Develop and commit with conventional commits**
   ```bash
   git commit -m "feat(scope): add new feature"
   git commit -m "fix(scope): fix bug"
   ```

3. **Create PR to dev**
   ```bash
   git push origin feature/my-feature
   gh pr create --base dev --head feature/my-feature
   ```

4. **Merge PR triggers semantic-release**
   - GitHub Actions runs semantic-release on `dev` branch
   - Creates version like `v1.6.0-beta.0`, `v1.6.0-beta.1`, etc.
   - Updates `package.json` and `CHANGELOG.md`
   - Creates GitHub release with beta tag

### Stable Release (main branch)

1. **Ensure dev is stable and tested**

2. **Create PR from dev to main**
   ```bash
   git checkout dev
   git pull origin dev
   gh pr create --base main --head dev --title "Release v1.6.0"
   ```

3. **Merge PR triggers semantic-release**
   - GitHub Actions runs semantic-release on `main` branch
   - Creates stable version like `v1.6.0`
   - Updates `package.json` and `CHANGELOG.md`
   - Creates GitHub release with installers

4. **Sync dev with main after stable release**
   ```bash
   git checkout dev
   git pull origin dev
   git merge origin/main
   git push origin dev
   ```

## Version Calculation

Semantic-release calculates the next version based on:

1. **Last release tag** on the current branch/channel
2. **Commits since** that tag
3. **Commit types** determine bump level

### Beta Channel Versioning

After stable `v1.5.0` on main:
- First `feat` commit on dev → `v1.6.0-beta.0`
- Next `feat` or `fix` commit on dev → `v1.6.0-beta.1`
- Continue incrementing beta number until merged to main

### Important: Version Continuity

- Beta versions (`v1.6.0-beta.x`) are PRE-RELEASES of `v1.6.0`
- When dev is merged to main, it becomes `v1.6.0` (stable)
- New features on dev after that become `v1.7.0-beta.0`

## Common Pitfalls

### 1. Wrong Version Calculated

**Symptom:** semantic-release creates `v1.5.0-beta.1` instead of `v1.6.0-beta.0`

**Causes:**
- Git history/tags in inconsistent state
- Comparing against wrong base version
- Tags not pushed to remote

**Fix:**
```bash
# Check what semantic-release sees
git fetch --tags
git tag -l "v1.*" --sort=-v:refname | head -10

# If needed, manually fix package.json and CHANGELOG
# Then create correct tag
git tag v1.6.0-beta.1
git push origin --tags
```

### 2. Duplicate Release Commits

**Symptom:** Multiple `chore(release):` commits with same version

**Cause:** Multiple PRs merged in quick succession before CI completes

**Prevention:** Wait for CI to complete before merging next PR

### 3. Tags Not on Expected Branch

**Symptom:** Tag exists but semantic-release doesn't see it

**Fix:**
```bash
# Check which branches contain the tag
git branch -a --contains v1.6.0-beta.0

# Ensure tag is reachable from current branch
git merge origin/dev  # or appropriate branch
```

## Manual Version Override

When semantic-release fails, manually fix:

1. **Update package.json**
   ```json
   { "version": "1.6.0-beta.1" }
   ```

2. **Update CHANGELOG.md header**
   ```markdown
   # [1.6.0-beta.1](compare-url) (date)
   ```

3. **Commit with skip CI**
   ```bash
   git commit -m "chore(release): fix version to 1.6.0-beta.1 [skip ci]"
   ```

4. **Create and push tag**
   ```bash
   git tag v1.6.0-beta.1
   git push origin HEAD --tags
   ```

## GitHub Actions Workflow

Release workflow (`.github/workflows/release.yml`) triggers on:
- Push to `main` → stable release
- Push to `dev` → beta release

The workflow:
1. Checks out code
2. Builds the application
3. Runs semantic-release
4. Uploads installers to GitHub release

## Quick Reference

| Action | Command |
|--------|---------|
| Check current version | `cat package.json \| grep version` |
| List recent tags | `git tag -l "v1.*" --sort=-v:refname \| head -10` |
| Check tag commit | `git show v1.6.0-beta.1 --oneline` |
| Delete local tag | `git tag -d v1.6.0-beta.0` |
| Delete remote tag | `git push origin :refs/tags/v1.6.0-beta.0` |
| Create tag | `git tag v1.6.0-beta.1` |
| Push tag | `git push origin --tags` |

## Checklist Before Merging to dev

- [ ] Commits use conventional format (`feat:`, `fix:`, etc.)
- [ ] No `[skip ci]` in commit messages (unless intentional)
- [ ] Branch is up-to-date with dev
- [ ] Tests pass

## Checklist Before Merging to main

- [ ] All beta testing complete
- [ ] dev branch is stable
- [ ] CHANGELOG reflects all changes
- [ ] Version number is correct in package.json
