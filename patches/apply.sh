#!/usr/bin/env bash
# Apply or revert local patches to pi's bundled packages.
#
# Usage:
#   patches/apply.sh            # apply all patches (skips already-applied ones)
#   patches/apply.sh status     # show applied state of each patch
#   patches/apply.sh revert     # undo all patches (reverse order)
#
# The pi install root is resolved from the `pi` binary on PATH, so this works
# regardless of how pi was installed (nvm, asdf, homebrew, ...).
#
# Patch files must use git-style relative paths (--- a/...  +++ b/...) so they
# contain no machine-specific absolute paths. Applied state is detected by
# grepping the target file for the patch's first added line — `patch` exit
# codes alone are ambiguous on BSD patch (macOS), which prompts "Unreversed
# (or previously applied) patch detected! Ignore -R?" and exits 0 either way.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() { echo "error: $*" >&2; exit 1; }

# --- resolve pi install root -------------------------------------------------
find_pi_root() {
  local bin real dir
  bin="$(command -v pi || true)"
  [[ -n "$bin" ]] || die "'pi' not found on PATH"
  if command -v python3 >/dev/null 2>&1; then
    real="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$bin")"
  elif command -v node >/dev/null 2>&1; then
    real="$(node -e 'process.stdout.write(require("fs").realpathSync(process.argv[1]))' "$bin")"
  else
    die "need python3 or node to resolve the pi binary"
  fi
  dir="$(dirname "$real")"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]] \
        && grep -q '"name"[[:space:]]*:[[:space:]]*"@earendil-works/pi-coding-agent"' "$dir/package.json"; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  die "could not locate pi install root from '$bin'"
}

PI_ROOT="$(find_pi_root)"
echo "pi install root: $PI_ROOT"

# --- patch introspection -----------------------------------------------------
# Target file (relative to $PI_ROOT) from the "+++ b/..." header.
patch_target() {
  grep -m1 '^+++ ' "$1" | sed -E 's/^\+\+\+ //; s/^b\///; s/[[:space:]].*$//' | tr -d '\r'
}

# First line the patch adds ("" for deletion-only patches).
patch_marker() {
  awk '/^@@/{ in_hunk=1; next }
       in_hunk && /^\+/ && !/^\+\+\+/ { line=substr($0,2); gsub(/\r/, "", line); print line; exit }' "$1"
}

# --- state helpers -----------------------------------------------------------
is_applied() { # $1 = patch file
  local target marker
  target="$(patch_target "$1")"
  [[ -n "$target" && -f "$PI_ROOT/$target" ]] || return 1
  marker="$(patch_marker "$1")"
  [[ -n "$marker" ]] && grep -qF -- "$marker" "$PI_ROOT/$target"
}

can_apply() { # $1 = patch file: forward dry-run succeeds
  (cd "$PI_ROOT" && patch -p1 --dry-run -s < "$1") >/dev/null 2>&1
}

# --- actions ----------------------------------------------------------------
apply_all() {
  local failed=0 patch name target
  for patch in "$SCRIPT_DIR"/*.patch; do
    [[ -f "$patch" ]] || continue
    name="$(basename "$patch")"
    target="$(patch_target "$patch")"
    if is_applied "$patch"; then
      echo "skip   $name (already applied)"
    elif can_apply "$patch"; then
      if (cd "$PI_ROOT" && patch -p1 -s < "$patch") >/dev/null 2>&1; then
        echo "apply  $name -> $target"
      else
        echo "FAIL   $name"
        failed=1
      fi
    else
      echo "WARN   $name (target '$target' does not match the patch; pi may have updated — re-check it)"
      failed=1
    fi
  done
  [[ $failed -eq 0 ]] || die "one or more patches failed"
}

revert_all() {
  local patches=() p name failed=0 i
  for p in "$SCRIPT_DIR"/*.patch; do
    [[ -f "$p" ]] && patches+=("$p")
  done
  for ((i = ${#patches[@]} - 1; i >= 0; i--)); do
    name="$(basename "${patches[$i]}")"
    if is_applied "${patches[$i]}"; then
      if (cd "$PI_ROOT" && patch -p1 -R -s < "${patches[$i]}") >/dev/null 2>&1; then
        echo "revert $name"
      else
        echo "FAIL   $name"
        failed=1
      fi
    else
      echo "skip   $name (not applied)"
    fi
  done
  [[ $failed -eq 0 ]] || die "one or more reverts failed"
}

show_status() {
  local patch name
  for patch in "$SCRIPT_DIR"/*.patch; do
    [[ -f "$patch" ]] || continue
    name="$(basename "$patch")"
    if is_applied "$patch"; then
      echo "applied     $name"
    else
      echo "not applied $name"
    fi
  done
}

case "${1:-apply}" in
  apply)  apply_all ;;
  revert) revert_all ;;
  status) show_status ;;
  *) die "usage: $0 [apply|revert|status]" ;;
esac
