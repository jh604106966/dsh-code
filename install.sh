#!/usr/bin/env bash
# Restore the DSH plugin environment captured in this repository.
#
#   1) installs the local plugins shipped under plugins/ (linked into the profile)
#   2) copies the agent presets into <DSH_HOME>/.agent-presets/
#   3) installs the pinned community plugins from npm
#
# Usage:
#   ./install.sh
#   PROFILE=web ./install.sh
#   SKIP_REGISTRY=1 ./install.sh
#   DRY_RUN=1 ./install.sh
#   DSH_EXE=/path/to/dsh DSH_HOME=~/.dsh ./install.sh
#
# ASCII-only on purpose.

set -euo pipefail

PROFILE="${PROFILE:-desktop}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
export DSH_HOME

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
if [ "${DRY_RUN:-0}" = "1" ]; then echo "  mode     : DRY RUN - nothing will be changed"; fi

# --------------------------------------------------------- 1) local plugins
LOCAL_PLUGINS=(
  "plugins/dsh-routing-suite/injector"
  "plugins/dsh-routing-suite/graded"
  "plugins/dsh-memory-evolve"
  "plugins/only-memory"
)

if [ "${SKIP_LOCAL:-0}" != "1" ]; then
  echo
  echo "[1/3] Local plugins (shipped in this repo)"
  for rel in "${LOCAL_PLUGINS[@]}"; do
    full="$REPO_ROOT/$rel"
    if [ ! -d "$full" ]; then echo "  ! missing directory, skipped: $rel" >&2; continue; fi
    run_dsh plugin --profile "$PROFILE" add "$full"
  done
fi

# -------------------------------------------------------------- 2) presets
PRESET_NAMES=(router-standard router-spec router-react)
PRESET_SRC="$REPO_ROOT/plugins/dsh-routing-suite/preset"
PRESET_DST="$DSH_HOME/.agent-presets"

if [ "${SKIP_PRESETS:-0}" != "1" ]; then
  echo
  echo "[2/3] Agent presets -> $PRESET_DST"
  if [ ! -d "$PRESET_SRC" ]; then
    echo "  ! missing directory, skipped: plugins/dsh-routing-suite/preset" >&2
  elif [ "${DRY_RUN:-0}" = "1" ]; then
    for n in "${PRESET_NAMES[@]}"; do echo "  > cp -r $PRESET_SRC/$n $PRESET_DST/$n"; done
  else
    mkdir -p "$PRESET_DST"
    for n in "${PRESET_NAMES[@]}"; do
      if [ ! -d "$PRESET_SRC/$n" ]; then echo "  ! missing preset, skipped: $n" >&2; continue; fi
      if [ -e "$PRESET_DST/$n" ]; then
        bak="$PRESET_DST/$n.bak-$(date +%Y%m%d-%H%M%S)"
        echo "  ~ existing preset backed up: $n -> $(basename "$bak")"
        mv "$PRESET_DST/$n" "$bak"
      fi
      cp -R "$PRESET_SRC/$n" "$PRESET_DST/$n"
      echo "  + $n"
    done
  fi
fi

# ----------------------------------------------------- 3) registry plugins
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
  echo "[3/3] Community plugins from npm (pinned versions)"
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
echo "Details: see README.md and PLUGINS.md."
