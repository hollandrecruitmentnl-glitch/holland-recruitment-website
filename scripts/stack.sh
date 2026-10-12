#!/bin/bash
# Start lokale DB + Next (productie-build), voer opdracht uit, stop alles. Gebruik: scripts/stack.sh [--vers] "<opdracht>"
cd "$(dirname "$0")/.."
VERS=""; if [ "$1" == "--vers" ]; then VERS="--vers"; shift; fi
node scripts/local-db.mjs $VERS --demo > /tmp/pg.log 2>&1 &
DB=$!
for i in $(seq 1 30); do grep -q luistert /tmp/pg.log && break; sleep 0.5; done
npx next start -p 3100 > /tmp/next.log 2>&1 &
NX=$!
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3100/inloggen && break; sleep 0.5; done
bash -c "$1"; RC=$?
kill $NX $DB 2>/dev/null; wait 2>/dev/null
exit $RC
