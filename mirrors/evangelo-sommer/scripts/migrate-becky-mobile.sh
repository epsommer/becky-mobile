#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVANGELO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_MOBILE_ROOT="$(cd "$EVANGELO_ROOT/../../apps/becky-mobile" && pwd)"
DEFAULT_MIRROR_DIR="$DEFAULT_MOBILE_ROOT/mirrors/evangelo-sommer"
DEFAULT_SCHEMA_DEST="$DEFAULT_MOBILE_ROOT/prisma/evangelo-schema.prisma"

SOURCE_DIR="$EVANGELO_ROOT"
MOBILE_ROOT="$DEFAULT_MOBILE_ROOT"
MIRROR_DIR="$DEFAULT_MIRROR_DIR"
SCHEMA_DEST="$DEFAULT_SCHEMA_DEST"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

 Options:
   --source <path>         Override the Becky CRM source directory (defaults to this repo)
   --mobile-root <path>    Target Becky Mobile project root (defaults to ../apps/becky-mobile)
   --mirror-dir <path>     Where to drop the mirrored web app (defaults to mirrors/evangelo-sommer inside the mobile project)
   --schema-dest <path>    Destination for the Prisma schema copy inside Becky Mobile (defaults to prisma/evangelo-schema.prisma)
   --help                  Show this help message
EOF
  local code=${1:-1}
  exit "$code"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_DIR="$(cd "$2" && pwd)"
      shift 2
      ;;
    --mobile-root)
      MOBILE_ROOT="$(cd "$2" && pwd)"
      shift 2
      ;;
    --mirror-dir)
      MIRROR_DIR="$(cd "$2" && pwd)"
      shift 2
      ;;
    --schema-dest)
      SCHEMA_DEST="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
      shift 2
      ;;
    --help|-h)
      usage 0
      ;;
    *)
      usage
      ;;
  esac
done

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "ERROR: Becky CRM source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -d "$MOBILE_ROOT" ]]; then
  echo "ERROR: Becky Mobile root directory not found: $MOBILE_ROOT" >&2
  exit 1
fi

mkdir -p "$MIRROR_DIR"
mkdir -p "$(dirname "$SCHEMA_DEST")"

EXCLUDES=(
  ".git"
  "node_modules"
  "dist"
  ".next"
  "yarn.lock"
  "pnpm-lock.yaml"
  "dev.db"
  "tsconfig.tsbuildinfo"
  "package-lock.json"
  "node_modules"
)

RSYNC_EXCLUDE_ARGS=()
for entry in "${EXCLUDES[@]}"; do
  RSYNC_EXCLUDE_ARGS+=(--exclude "$entry")
done

echo "Mirroring Becky CRM web app from $SOURCE_DIR into $MIRROR_DIR..."
rsync -a "${RSYNC_EXCLUDE_ARGS[@]}" \
  --delete \
  "$SOURCE_DIR/" \
  "$MIRROR_DIR/"

if [[ -f "$SOURCE_DIR/prisma/schema.prisma" ]]; then
  echo "Copying Prisma schema to $SCHEMA_DEST..."
  cp "$SOURCE_DIR/prisma/schema.prisma" "$SCHEMA_DEST"
else
  echo "WARNING: Prisma schema not found in $SOURCE_DIR/prisma/schema.prisma"
fi

echo "Migration snapshot complete:"
echo "  - Web app mirror: $MIRROR_DIR"
echo "  - Schema copy:    $SCHEMA_DEST"
echo
echo "You can now reference the mirrored Next.js source for porting or diffing, and keep $SCHEMA_DEST next to your mobile project for database scaffolding."
