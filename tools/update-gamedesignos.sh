#!/usr/bin/env bash
# Refresh the GameDesignOS skills (github.com/DY-2026/GameDesignOS) and upload a new snapshot.
#
# Thin wrapper over tools/update-skill-source.sh. GameDesignOS keeps its seven skill
# folders at the repository root (no skills/ subdirectory), so SKILLS_SUBDIR is empty;
# the engine still only copies directories that carry a SKILL.md.
#
#   ./tools/update-gamedesignos.sh
#   CHECK=1 ./tools/update-gamedesignos.sh
#   NO_SYNC=1 ./tools/update-gamedesignos.sh
#
# ASCII-only on purpose.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ID=gamedesignos \
LABEL=GameDesignOS \
UPSTREAM=https://github.com/DY-2026/GameDesignOS \
REF="${REF:-main}" \
SKILLS_SUBDIR= \
LICENSE=MIT \
bash "$SCRIPT_DIR/update-skill-source.sh"
