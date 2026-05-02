---
name: git
description: Use when creating branches, commits, PRs, and managing git workflow. Enforces the project's branch naming, commit conventions, and PR rules.
---

# Git Specialist

## Purpose

Enforce the project's git workflow conventions for branches, commits, and PRs.

## Branch Model

| Branch | Purpose |
|--------|---------|
| `main` | Production — stable, deployed code |
| `dev` | Development — continuous feature integration |

### Work branches

Format: `<type>/<user>/<short-description>`

| Type | When |
|------|------|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `refact` | Refactoring without behavior change |
| `docs` | Documentation only |
| `test` | Test additions or fixes |
| `chore` | Dependencies, CI, tooling |

Example: `feat/ricardo/search-tag-filter`

### Creating a branch

```bash
git checkout dev
git pull origin dev

# Clean up local branches already merged into dev.
# Uses gh to detect squash-merged PRs (git branch --merged misses these).
for branch in $(git branch | grep -v -E '^\*|dev|main' | sed 's/^ *//'); do
  if gh pr list --state merged --head "$branch" --json number --jq '.[0].number' 2>/dev/null | grep -q .; then
    git branch -D "$branch"
  fi
done

git checkout -b <type>/<user>/<description>
```

Always branch from an up-to-date `dev`. Prune merged branches on every branch creation to keep the local tree clean. Uses `gh pr list --state merged` because GitHub squash-merges create new commits that `git branch --merged` doesn't detect.

## Commits

Prefix with type. Messages in English, clear and descriptive:

```
feat: add tag filter to search endpoint
fix: correct tenant null handling in search query
refactor: extract subdomain resolver from service
docs: document git workflow
test: add tests for domain enumeration endpoint
chore: update dependencies
```

## Pull Requests

### Rules

1. **Never push directly to `dev` or `main`.** All code enters via PR.
2. **Target branch is `dev`** (unless hotfix to `main`).
3. **Run CI checks locally before opening PR:**
   - `npx eslint src/ App.tsx index.js __tests__/`
   - `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"`
   - `npx tsc --noEmit`
   - `npx jest --coverage`
   - `npm run build`
4. **CI must pass + review before merge.**
5. **Merge strategy:** squash or merge commit (via GitHub).

### PR flow

1. `git checkout dev && git pull`
2. `git checkout -b <type>/<user>/<description>`
3. Develop, commit with clear messages
4. Run lint + test + build locally
5. `git push -u origin <branch>`
6. Open PR to `dev` on GitHub
7. Wait for CI + review
8. Merge via GitHub

## Releasing — `/git tag main`

When the user asks to tag/release main (`/git tag main`, `/git release`, etc.), trigger the manual release workflow but ONLY if the version isn't already tagged.

```bash
# 1. Sync main and read the version that would be tagged.
git fetch origin main --tags
VERSION=$(git show origin/main:package.json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
TAG="v$VERSION"

# 2. Bail if the tag already exists locally OR on the remote.
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null \
   || git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Tag $TAG already exists. Bump package.json on dev → main first."
  exit 1
fi

# 3. Confirm the dev → main release-train PR has actually merged
#    (refuse if main hasn't picked up the version bump commit yet).
echo "Will tag $TAG from $(git rev-parse --short origin/main) on origin/main"

# 4. Trigger the workflow.
gh workflow run release.yml --ref main

# 5. Surface the run URL so the user can watch it.
sleep 2
gh run list --workflow=release.yml --limit 1
```

Notes:
- The release workflow is tag-only (does NOT push commits to main). It reads the version from `package.json` on main and pushes the annotated `vX.Y.Z` tag.
- If the version override is needed (one-off renumber), pass it: `gh workflow run release.yml --ref main -f version=X.Y.Z` — only do this when the user explicitly asks.
- After triggering, optionally `gh run watch` the latest run id.

## Output

1. Branch name (validated against convention)
2. Commit messages (validated against prefix convention)
3. Pre-PR checklist results
4. PR creation command or link
5. For `/git tag main`: tag pre-existence check result + workflow run URL
