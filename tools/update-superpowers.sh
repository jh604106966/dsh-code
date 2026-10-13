#!/usr/bin/env bash
# Refresh the superpowers skills (github.com/obra/superpowers) and upload a new snapshot.
#
#   1) clones / updates the upstream checkout (default <DSH_HOME>/skill-sources/superpowers)
#   2) copies its skills/* into <AGENTS_HOME>/skills (upstream wins, no backup)
#   3) records version + commit in profile/manifest.json > skillSources
#   4) runs tools/sync.sh, which re-snapshots skills/ and pushes to GitHub
#
# Usage:
#   ./tools/update-superpowers.sh
#   CHECK=1 ./tools/update-superpowers.sh          # only print the upstream version
#   NO_SYNC=1 ./tools/update-superpowers.sh        # update the live library, do not snapshot
#   NO_PROXY=1 ./tools/update-superpowers.sh       # skip the local proxy
#   SRC=/path/to/checkout AGENTS_HOME=~/.agents ./tools/update-superpowers.sh
#
# ASCII-only on purpose.

set -euo pipefail

UPSTREAM="${UPSTREAM:-https://github.com/obra/superpowers}"
REF="${REF:-main}"
ID="${ID:-superpowers}"
PROXY="${PROXY:-http://127.0.0.1:7897}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
AGENTS_HOME="${AGENTS_HOME:-${DSH_AGENTS_HOME:-$HOME/.agents}}"
SRC="${SRC:-$DSH_HOME/skill-sources/superpowers}"
SKILLS_DST="$AGENTS_HOME/skills"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

command -v git >/dev/null 2>&1 || { echo "error: git not found on PATH." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "error: node not found on PATH." >&2; exit 1; }

echo
echo "superpowers skill refresh"
echo "  upstream : $UPSTREAM ($REF)"
echo "  checkout : $SRC"
echo "  skills   : $SKILLS_DST"
echo "  repo     : $REPO_ROOT"
if [ "${CHECK:-0}" = "1" ]; then echo "  mode     : CHECK - nothing will be changed"; fi

# --------------------------------------------------------- 1) clone / update
update_checkout() {
  local pre=("$@")
  if [ -d "$SRC/.git" ]; then
    git "${pre[@]}" -C "$SRC" fetch --depth 1 origin "$REF"
    git "${pre[@]}" -C "$SRC" reset --hard FETCH_HEAD
  else
    mkdir -p "$(dirname "$SRC")"
    git "${pre[@]}" clone --depth 1 --branch "$REF" "$UPSTREAM" "$SRC"
  fi
}

echo
echo "[1/4] upstream checkout"
done_ok=0
if [ "${NO_PROXY:-0}" != "1" ]; then
  if update_checkout -c "http.proxy=$PROXY"; then
    echo "  ok (proxy $PROXY)"; done_ok=1
  else
    echo "  ! proxy $PROXY failed, falling back to direct" >&2
  fi
fi
if [ "$done_ok" = 0 ]; then
  update_checkout
  echo "  ok (direct)"
fi

COMMIT="$(git -C "$SRC" rev-parse HEAD)"
VERSION=""
for meta in .claude-plugin/plugin.json package.json; do
  if [ -f "$SRC/$meta" ]; then
    VERSION="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.version||"")' "$SRC/$meta")"
    [ -n "$VERSION" ] && break
  fi
done
LICENSE="MIT"
echo "  version  : $VERSION"
echo "  commit   : $COMMIT"
if [ "${CHECK:-0}" = "1" ]; then
  echo
  echo "check only - nothing changed."
  exit 0
fi

# --------------------------------------------------------------- 2) install
echo
echo "[2/4] copy skills -> $SKILLS_DST"
[ -d "$SRC/skills" ] || { echo "error: no skills/ directory in $SRC" >&2; exit 1; }
mkdir -p "$SKILLS_DST"
COPIED=()
for d in "$SRC"/skills/*; do
  [ -d "$d" ] || continue
  if [ ! -f "$d/SKILL.md" ]; then echo "  ! no SKILL.md, skipped: $(basename "$d")" >&2; continue; fi
  n="$(basename "$d")"
  rm -rf "$SKILLS_DST/$n"
  cp -R "$d" "$SKILLS_DST/$n"
  COPIED+=("$n")
done
echo "  + ${#COPIED[@]} skills"

# ------------------------------------------------------------ 3) provenance
echo
echo "[3/4] record provenance in profile/manifest.json"
SKILLS_CSV="$(IFS=,; echo "${COPIED[*]:-}")"
node "$SCRIPT_DIR/skill-source.mjs" --id "$ID" --upstream "$UPSTREAM" --ref "$REF" \
  --checkout "$SRC" --license "$LICENSE" --version "$VERSION" --commit "$COMMIT" --skills "$SKILLS_CSV"

# --------------------------------------------------------------- 4) snapshot
echo
echo "[4/4] re-snapshot + push"
if [ "${NO_SYNC:-0}" = "1" ]; then
  echo "  skipped (NO_SYNC=1). Run tools/sync.sh to snapshot + push."
else
  if [ "${NO_PROXY:-0}" = "1" ]; then
    NO_PROXY=1 bash "$SCRIPT_DIR/sync.sh"
  else
    bash "$SCRIPT_DIR/sync.sh"
  fi
fi

echo
echo "Done. superpowers $VERSION (${COMMIT:0:7}) is live and snapshotted."
