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

## Output

1. Branch name (validated against convention)
2. Commit messages (validated against prefix convention)
3. Pre-PR checklist results
4. PR creation command or link
