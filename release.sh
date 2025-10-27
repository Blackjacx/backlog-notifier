!/usr/bin/env bash
set -euo pipefail

# -------------------------------
# Backlog Notifier Release Script
# -------------------------------
# Usage: ./release.sh <version>
# Example: ./release.sh 1.5.0
# --------------------------------

REPO_URL="https://github.com/Blackjacx/backlog-notifier"

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

VERSION=$1
TAG="v$VERSION"
DATE=$(date +"%Y-%m-%d")

echo "🚀 Starting release process for version $VERSION..."

# Step 1: Ensure clean working tree
if ! git diff-index --quiet HEAD --; then
  echo "❌ Working directory not clean. Commit or stash changes first."
  exit 1
fi

# Step 2: Ensure main branch is up to date
git checkout main
git pull origin main

# Step 3: Find last release tag
LAST_TAG=$(git tag --sort=-creatordate | head -n1)
if [ -z "$LAST_TAG" ]; then
  echo "⚠️ No previous tag found, considering initial release."
  # Get the first commit hash
  LAST_TAG=$(git rev-list --max-parents=0 HEAD)
fi
echo "Last release tag: $LAST_TAG"

# Step 4: Generate changelog entries for merged PRs
echo "🧾 Collecting merged PRs since $LAST_TAG..."

PR_LINES_ARRAY=()

while IFS='|' read -r TITLE AUTHOR; do
  if [[ "$TITLE" == "Merge pull request "* ]]; then
    PR_NUMBER=$(echo "$TITLE" | grep -Eo '#[0-9]+' | tr -d '#')

    if [ -n "$PR_NUMBER" ]; then
      CLEAN_TITLE=$(echo "$TITLE" | sed -E 's/Merge pull request #[0-9]+ from [^ ]+ //')
      PR_LINES_ARRAY+=("* [#$PR_NUMBER]($REPO_URL/pull/$PR_NUMBER): $CLEAN_TITLE - [@$AUTHOR](https://github.com/$AUTHOR)")
    fi
  fi
done < <(git log "$LAST_TAG"..HEAD --merges --pretty=format:'%s|%an')


if [ ${#PR_LINES_ARRAY[@]} -eq 0 ]; then
  echo "⚠️ No merged PRs found since $LAST_TAG. Skipping changelog update."
  PR_LINES="* No changes."
else
  printf -v PR_LINES '%s\n' "${PR_LINES_ARRAY[@]}"
  PR_LINES="${PR_LINES%?}"
fi

# Step 5: Update CHANGELOG.md
echo "📝 Updating CHANGELOG.md..."

TMP_FILE=$(mktemp)
{
  echo "## [$VERSION] - $DATE"
  echo "$PR_LINES"
  echo
} >"$TMP_FILE"

export TMP_FILE_PATH="$TMP_FILE"

awk '
  /^## \[Unreleased\]/ {
    print;
    print "";
    system("cat \"$TMP_FILE_PATH\""); # Use system() to cat the file
    next
  }
  { print }
' CHANGELOG.md > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md

rm "$TMP_FILE"
unset TMP_FILE_PATH 

# Step 6: Update dependencies
echo "📦 Updating dependencies using npm-check-updates..."
npm install --save-dev npm-check-updates

if ! npx ncu -u; then
  echo "⚠️ npm-check-updates failed. Please check dependencies manually, commit, and re-run."
  exit 1
fi

echo "📦 Installing updated dependencies..."
if ! npm install; then
  echo "⚠️ npm install failed after updating dependencies. Please check manually."
  exit 1
fi

# Step 7: Update version in package.json
echo "🔢 Updating package.json version to $VERSION..."
npm version "$VERSION" --no-git-tag-version

# Step 8: Build/package
echo "🏗️ Building the project..."
echo "⚠️ Skipping 'npm run lint' due to ESLint v9 incompatibility with .yml config."
npm run format:write && npm run test && npm run package

# Step 9: Commit + tag
git add package.json package-lock.json CHANGELOG.md
git commit -m "Release version $VERSION"
git tag -a "$TAG" -m "Release version $VERSION"

# Step 10: Push
git push origin main
git push origin "$TAG"

echo "✅ Release $VERSION complete!"
echo "📢 Next step: Go to GitHub → Releases → Draft new release for tag $TAG"