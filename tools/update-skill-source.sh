#!/usr/bin/env bash
# Refresh one external skill source into the live DSH skill library and upload a new snapshot.
#
# Generic engine behind tools/update-superpowers.sh and tools/update-gamedesignos.sh:
#   1) clones / updates the upstream checkout (default <DSH_HOME>/skill-sources/<ID>)
#   2) copies its skill directories into <AGENTS_HOME>/skills (upstream wins; the copy is
#      skipped when the checkout is already at the commit recorded in
#      profile/manifest.json, unless FORCE=1)
#   3) records version + commit + kept-skill list in profile/manifest.json > skillSources
#   4) runs tools/sync.sh, which re-snapshots skills/ and pushes to GitHub
#
# Required env: ID, UPSTREAM (or pass them as $1/$2). Optional: LABEL, REF, SRC,
# SKILLS_SUBDIR (default "skills"; set empty for a repo whose skills sit at the root),
# DSH_HOME, AGENTS_HOME, PROXY, LICENSE, NO_PROXY=1, NO_SYNC=1, CHECK=1, FORCE=1.
#
# ASCII-only on purpose.

set -euo pipefail

ID="${ID:-${1:-}}"
UPSTREAM="${UPSTREAM:-${2:-}}"
if [ -z "$ID" ] || [ -z "$UPSTREAM" ]; then
  echo "usage: ID=<id> UPSTREAM=<url> $0   (optionally REF/SRC/SKILLS_SUBDIR/...)" >&2
  exit 2
fi
LABEL="${LABEL:-$ID}"
REF="${REF:-main}"
SKILLS_SUBDIR="${SKILLS_SUBDIR-skills}"
PROXY="${PROXY:-http://127.0.0.1:7897}"
LICENSE="${LICENSE:-MIT}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
AGENTS_HOME="${AGENTS_HOME:-${DSH_AGENTS_HOME:-$HOME/.agents}}"
SRC="${SRC:-$DSH_HOME/skill-sources/$ID}"
if [ -n "$SKILLS_SUBDIR" ]; then SRC_SKILLS="$SRC/$SKILLS_SUBDIR"; else SRC_SKILLS="$SRC"; fi
SKILLS_DST="$AGENTS_HOME/skills"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$REPO_ROOT/profile/manifest.json"

command -v git >/dev/null 2>&1 || { echo "error: git not found on PATH." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "error: node not found on PATH." >&2; exit 1; }

echo
echo "$LABEL skill refresh"
echo "  upstream : $UPSTREAM ($REF)"
echo "  checkout : $SRC"
echo "  skills   : $SRC_SKILLS"
echo "  target   : $SKILLS_DST"
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

version_from_manifest() {
  node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.version||"")' "$1" 2>/dev/null || true
}
VERSION=""
for meta in .claude-plugin/plugin.json package.json; do
  if [ -f "$SRC/$meta" ]; then
    VERSION="$(version_from_manifest "$SRC/$meta")"
    [ -n "$VERSION" ] && break
  fi
done
if [ -z "$VERSION" ]; then
  for cand in "$SRC/_version.py" "$SRC"/*/_version.py; do
    [ -f "$cand" ] || continue
    VERSION="$(sed -n 's/^VERSION[[:space:]]*=[[:space:]]*["'"'"']\([^"'"'"']*\)["'"'"'].*/\1/p' "$cand" | head -n 1)"
    [ -n "$VERSION" ] && break
  done
fi
if [ -z "$VERSION" ] && [ -f "$SRC/pyproject.toml" ]; then
  VERSION="$(sed -n 's/^version[[:space:]]*=[[:space:]]*["'"'"']\([^"'"'"']*\)["'"'"'].*/\1/p' "$SRC/pyproject.toml" | head -n 1)"
fi
echo "  version  : $VERSION"
echo "  commit   : $COMMIT"
if [ "${CHECK:-0}" = "1" ]; then
  echo
  echo "check only - nothing changed."
  exit 0
fi

PREV_COMMIT=""
PREV_COUNT=0
if [ -f "$MANIFEST" ]; then
  PREV_COMMIT="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const s=(j.skillSources||[]).find(x=>x.id===process.argv[2]);process.stdout.write(s&&s.commit?s.commit:"")' "$MANIFEST" "$ID" 2>/dev/null || true)"
  PREV_COUNT="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const s=(j.skillSources||[]).find(x=>x.id===process.argv[2]);process.stdout.write(String(s&&s.skills?s.skills.length:0))' "$MANIFEST" "$ID" 2>/dev/null || true)"
fi

# --------------------------------------------------------------- 2) install
echo
echo "[2/4] copy skills -> $SKILLS_DST"
[ -d "$SRC_SKILLS" ] || { echo "error: no skill directory at $SRC_SKILLS" >&2; exit 1; }
COPIED=()
if [ "$PREV_COMMIT" = "$COMMIT" ] && [ "${FORCE:-0}" != "1" ] && [ "${PREV_COUNT:-0}" != "0" ]; then
  echo "  = already at ${COMMIT:0:7} with $PREV_COUNT recorded skills - copy skipped (FORCE=1 to redo)"
  COPIED=($(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const s=(j.skillSources||[]).find(x=>x.id===process.argv[2]);process.stdout.write((s&&s.skills?s.skills:[]).join(" "))' "$MANIFEST" "$ID"))
else
  mkdir -p "$SKILLS_DST"
  for d in "$SRC_SKILLS"/*/; do
    [ -d "$d" ] || continue
    [ -f "$d/SKILL.md" ] || continue
    n="$(basename "$d")"
    rm -rf "$SKILLS_DST/$n"
    cp -R "$d" "$SKILLS_DST/$n"
    COPIED+=("$n")
  done
  echo "  + ${#COPIED[@]} skills"
fi

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
if [ "${NO_SYNC:-0}" = "1" ]; then
  echo "Done. $LABEL $VERSION (${COMMIT:0:7}) is live (snapshot skipped)."
else
  echo "Done. $LABEL $VERSION (${COMMIT:0:7}) is live and snapshotted."
fi
