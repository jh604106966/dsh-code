#!/usr/bin/env bash
# tools/sync.sh - refresh this repo's DSH plugin snapshot and push it.
#
#   bash tools/sync.sh
#
# Steps: node tools/sync.mjs -> git add -A -> commit only when something changed
# -> push (with the local proxy first, without it as a fallback).
set -uo pipefail

PROFILE="${PROFILE:-desktop}"
BRANCH="${BRANCH:-main}"
PROXY="${PROXY:-http://127.0.0.1:7897}"
GIT_NAME="${GIT_NAME:-jh604106966}"
GIT_EMAIL="${GIT_EMAIL:-604106966@qq.com}"
DSH_HOME_ARG=""
MESSAGE=""
CHECK=0
NO_PUSH=0
NO_PROXY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK=1 ;;
    --no-push) NO_PUSH=1 ;;
    --no-proxy) NO_PROXY=1 ;;
    --profile) PROFILE="$2"; shift ;;
    --dsh-home) DSH_HOME_ARG="$2"; shift ;;
    --branch) BRANCH="$2"; shift ;;
    -m|--message) MESSAGE="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

cd "$(dirname "$0")/.." || exit 1

command -v node >/dev/null 2>&1 || { echo "x node not found in PATH" >&2; exit 1; }

args=(tools/sync.mjs --profile "$PROFILE")
if [ -n "$DSH_HOME_ARG" ]; then args+=(--dsh-home "$DSH_HOME_ARG"); fi
if [ "$CHECK" = 1 ]; then args+=(--check); fi

node "${args[@]}" || exit 1
if [ "$CHECK" = 1 ]; then exit 0; fi

# repo-local git identity (a global .gitconfig is not guaranteed)
if [ -z "$(git config --local --get user.name 2>/dev/null)" ]; then git config --local user.name "$GIT_NAME"; fi
if [ -z "$(git config --local --get user.email 2>/dev/null)" ]; then git config --local user.email "$GIT_EMAIL"; fi

git add -A
pending="$(git status --porcelain)"
if [ -z "$pending" ]; then
  echo "OK: snapshot already up to date - nothing to upload."
  exit 0
fi

echo ""
echo "changes to upload:"
echo "$pending" | head -40

if [ -z "$MESSAGE" ]; then MESSAGE="sync: plugin snapshot $(date '+%Y-%m-%d %H:%M')"; fi
git commit -m "$MESSAGE" -m "$(echo "$pending" | head -40)" >/dev/null || { echo "x git commit failed" >&2; exit 1; }
echo "committed: $MESSAGE"

if [ "$NO_PUSH" = 1 ]; then
  echo "NoPush set - commit kept locally, run \"git push origin $BRANCH\" when ready."
  exit 0
fi

ok=0
if [ -n "$PROXY" ] && [ "$NO_PROXY" != 1 ]; then
  if git -c "http.proxy=$PROXY" push -u origin "$BRANCH"; then ok=1; else echo "! push through the proxy failed - retrying without it"; fi
fi
if [ "$ok" != 1 ]; then
  if git push -u origin "$BRANCH"; then ok=1; fi
fi
if [ "$ok" != 1 ]; then
  echo "x push failed - the commit is local, fix the network and run: git push origin $BRANCH" >&2
  exit 1
fi
echo "uploaded."
