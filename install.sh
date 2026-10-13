#!/usr/bin/env bash
# Restore the DSH plugin environment captured in this repository.
#
#   1) installs the local plugins shipped under plugins/ (linked into the profile)
#   2) copies the agent presets into <DSH_HOME>/.agent-presets/
#   3) copies the skills snapshot into <AGENTS_HOME>/skills (default ~/.agents/skills)
#   4) installs the pinned community plugins from npm
#
# Usage:
#   ./install.sh
#   PROFILE=web ./install.sh
#   SKIP_REGISTRY=1 ./install.sh
#   SKIP_SKILLS=1 ./install.sh
#   DRY_RUN=1 ./install.sh
#   DSH_EXE=/path/to/dsh DSH_HOME=~/.dsh ./install.sh
#
# ASCII-only on purpose.

set -euo pipefail

PROFILE="${PROFILE:-desktop}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
export DSH_HOME
AGENTS_HOME="${AGENTS_HOME:-${DSH_AGENTS_HOME:-$HOME/.agents}}"
SKILLS_DST="$AGENTS_HOME/skills"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ------------------------------------------------------------- resolve dsh
if [ -n "${DSH_EXE:-}" ]; then
  DSH_BIN="$DSH_EXE"
  DSH_PREFIX=()
elif command -v dsh >/dev/null 2>&1; then
  DSH_BIN="dsh"
  DSH_PREFIX=()
elif command -v npx >/dev/null 2>&1; then
  DSH_BIN="npx"
  DSH_PREFIX=(-y @deepseek-ai/dsh)
else
  echo "error: dsh not found on PATH. Install DeepSeek Harness first, or set DSH_EXE." >&2
  exit 1
fi

run_dsh() {
  echo "  > ${DSH_BIN} ${DSH_PREFIX[*]:-} $*"
  if [ "${DRY_RUN:-0}" = "1" ]; then return 0; fi
  "${DSH_BIN}" "${DSH_PREFIX[@]+"${DSH_PREFIX[@]}"}" "$@"
}

echo
echo "DSH plugin snapshot restore"
echo "  repo     : $REPO_ROOT"
echo "  profile  : $PROFILE"
echo "  DSH_HOME : $DSH_HOME"
echo "  skills   : $SKILLS_DST"
if [ "${DRY_RUN:-0}" = "1" ]; then echo "  mode     : DRY RUN - nothing will be changed"; fi

# --------------------------------------------------------- 1) local plugins
# Read the list from profile/manifest.json (written by tools/sync.sh) so a newly
# synced plugin is installed without editing this script.
MANIFEST="$REPO_ROOT/profile/manifest.json"
LOCAL_PLUGINS=()
if [ ! -f "$MANIFEST" ]; then
  echo "  ! missing profile/manifest.json - run tools/sync.sh first, or 'git pull'" >&2
else
  while IFS= read -r rel; do
    [ -n "$rel" ] && LOCAL_PLUGINS+=("$rel")
  done <<EOF
$(grep -o '"path": *"plugins/[^"]*"' "$MANIFEST" | sed 's/.*"\(plugins\/[^"]*\)".*/\1/')
EOF
fi

if [ "${SKIP_LOCAL:-0}" != "1" ]; then
  echo
  echo "[1/4] Local plugins (shipped in this repo) - ${#LOCAL_PLUGINS[@]} entries"
  if [ "${#LOCAL_PLUGINS[@]}" -eq 0 ]; then echo "  ! nothing to install" >&2; fi
  for rel in ${LOCAL_PLUGINS[@]+"${LOCAL_PLUGINS[@]}"}; do
    full="$REPO_ROOT/$rel"
    if [ ! -d "$full" ]; then echo "  ! missing directory, skipped: $rel" >&2; continue; fi
    run_dsh plugin --profile "$PROFILE" add "$full"
  done
fi

# -------------------------------------------------------------- 2) presets
# A preset is any directory carrying preset.yml / agent.cordis.yml; they live either
# inside the plugin repo that ships them (plugins/<plugin>/preset/<name>) or, for
# standalone ones, in presets/<name>. Both are enumerated, so a freshly synced preset
# is installed without touching this script.
PRESET_DST="$DSH_HOME/.agent-presets"

is_preset() {
  [ -f "$1/preset.yml" ] || [ -f "$1/agent.cordis.yml" ] || [ -f "$1/agent.cordis.yaml" ]
}

if [ "${SKIP_PRESETS:-0}" != "1" ]; then
  echo
  echo "[2/4] Agent presets -> $PRESET_DST"
  SEEN=" "
  FOUND=0
  if [ "${DRY_RUN:-0}" != "1" ]; then mkdir -p "$PRESET_DST"; fi
  for root in "$REPO_ROOT/presets" "$REPO_ROOT"/plugins/*/preset; do
    [ -d "$root" ] || continue
    for d in "$root"/*; do
      [ -d "$d" ] || continue
      is_preset "$d" || continue
      n="$(basename "$d")"
      case "$SEEN" in *" $n "*) continue ;; esac
      SEEN="$SEEN$n "
      FOUND=1
      if [ "${DRY_RUN:-0}" = "1" ]; then
        echo "  > cp -R $d $PRESET_DST/$n"
        continue
      fi
      if [ -e "$PRESET_DST/$n" ]; then
        bak="$PRESET_DST/$n.bak-$(date +%Y%m%d-%H%M%S)"
        echo "  ~ existing preset backed up: $n -> $(basename "$bak")"
        mv "$PRESET_DST/$n" "$bak"
      fi
      cp -R "$d" "$PRESET_DST/$n"
      echo "  + $n"
    done
  done
  if [ "$FOUND" = 0 ]; then echo "  ! no preset found in this repo, skipped" >&2; fi
fi

# --------------------------------------------------------------- 3) skills
# Mirror the skills/ snapshot back into the live skill library. Skills a repo-carried
# plugin syncs by itself (dsh-memory-evolve ships 5) are deliberately NOT in the
# snapshot - installing that plugin in step 1 restores them.
if [ "${SKIP_SKILLS:-0}" != "1" ]; then
  echo
  echo "[3/4] Skills -> $SKILLS_DST"
  FOUND=0
  if [ "${DRY_RUN:-0}" != "1" ]; then mkdir -p "$SKILLS_DST"; fi
  for d in "$REPO_ROOT"/skills/*; do
    [ -d "$d" ] || continue
    [ -f "$d/SKILL.md" ] || { echo "  ! no SKILL.md, skipped: $(basename "$d")" >&2; continue; }
    n="$(basename "$d")"
    FOUND=1
    if [ "${DRY_RUN:-0}" = "1" ]; then
      echo "  > cp -R $d $SKILLS_DST/$n"
      continue
    fi
    if [ -e "$SKILLS_DST/$n" ]; then
      # Back up OUTSIDE the skill root: a sibling <name>.bak-* directory would still
      # carry SKILL.md and register as a second copy of the same skill.
      mkdir -p "$AGENTS_HOME/skill-backups"
      bak="$AGENTS_HOME/skill-backups/$n.bak-$(date +%Y%m%d-%H%M%S)"
      echo "  ~ existing skill backed up: $n -> skill-backups/$(basename "$bak")"
      mv "$SKILLS_DST/$n" "$bak"
    fi
    cp -R "$d" "$SKILLS_DST/$n"
    echo "  + $n"
  done
  if [ "$FOUND" = 0 ]; then echo "  ! no skill snapshot in this repo, skipped" >&2; fi
fi

# ----------------------------------------------------- 4) registry plugins
REGISTRY_PLUGINS=(
  "billion-context@0.1.194"
  "dsh-context@0.66.0"
  "dsh-cost-meter@1.8.15"
  "dshmarket@1.66.9"
  "@nanmicoder/dsh-agent-teams@0.1.22"
  "@linxin666/dsh-client-ui-skill-explorer@0.4.5"
)

if [ "${SKIP_REGISTRY:-0}" != "1" ]; then
  echo
  echo "[4/4] Community plugins from npm (pinned versions)"
  profile_dir="$DSH_HOME/profiles/$PROFILE"
  if [ "${DRY_RUN:-0}" != "1" ] && [ -d "$profile_dir" ] && [ ! -f "$profile_dir/.npmrc" ]; then
    echo "ignore-workspace-root-check=true" > "$profile_dir/.npmrc"
    echo "  + wrote $profile_dir/.npmrc (ignore-workspace-root-check=true)"
  fi
  for pkg in "${REGISTRY_PLUGINS[@]}"; do
    run_dsh plugin --profile "$PROFILE" add "$pkg"
  done
fi

echo
echo "Done."
echo "Next: restart DSH, then open a new session and pick a preset (Router Standard / Router Spec)."
echo "Skills are live immediately (no restart needed)."
echo "Details: see README.md, PLUGINS.md and SKILLS.md."
