#!/usr/bin/env bash
# Refresh the superpowers skills (github.com/obra/superpowers) and upload a new snapshot.
#
# Thin wrapper over tools/update-skill-source.sh - see that script for the four steps.
#
#   ./tools/update-superpowers.sh
#   CHECK=1 ./tools/update-superpowers.sh      # print the upstream version only
#   NO_SYNC=1 ./tools/update-superpowers.sh    # update the live library, do not snapshot
#   FORCE=1 ./tools/update-superpowers.sh      # copy even when the commit is unchanged
#
# ASCII-only on purpose.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ID=superpowers \
LABEL=superpowers \
UPSTREAM=https://github.com/obra/superpowers \
REF="${REF:-main}" \
SKILLS_SUBDIR=skills \
LICENSE=MIT \
bash "$SCRIPT_DIR/update-skill-source.sh"
