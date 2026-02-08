#!/bin/sh
set -eu

if [ -z "${CURRENT_DATE:-}" ]; then
  echo "CURRENT_DATE is required (YYYY-MM-DD)."
  exit 1
fi

set -- --current "$CURRENT_DATE"

if [ -n "${TARGET_DATE:-}" ]; then
  set -- "$@" --target "$TARGET_DATE"
fi

if [ -n "${MIN_DATE:-}" ]; then
  set -- "$@" --min "$MIN_DATE"
fi

if [ -n "${DATE_RANGES:-}" ]; then
  OLD_IFS=$IFS
  IFS=','
  for r in $DATE_RANGES; do
    r=$(printf "%s" "$r" | tr -d '[:space:]')
    if [ -n "$r" ]; then
      set -- "$@" --range "$r"
    fi
  done
  IFS=$OLD_IFS
fi

if [ "${STOP_AFTER_BOOK:-}" = "true" ] || [ "${STOP_AFTER_BOOK:-}" = "1" ]; then
  set -- "$@" --stop-after-book
fi

if [ "${DRY_RUN:-}" = "true" ] || [ "${DRY_RUN:-}" = "1" ]; then
  set -- "$@" --dry-run
fi

exec node src/index.js "$@"
