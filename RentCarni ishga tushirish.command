#!/bin/bash
RENTCAR_ROOT="$(cd "$(dirname "$0")" && pwd)"
exec /bin/bash "$RENTCAR_ROOT/scripts/start-local.sh"
