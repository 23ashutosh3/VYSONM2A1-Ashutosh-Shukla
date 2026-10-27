#!/bin/bash
# Ramps up concurrency on both endpoints (one endpoint at a time) and writes
# p50/p90/p95/p99 for every level to loadtest/results.csv.
#
# Usage (server must already be running with `npm start`):
#   ./loadtest/run.sh <short_code>
#
# Q12/Q13: point it at the deployed API with a separate output file, e.g.
#   BASE=https://my-app.vercel.app OUT=loadtest/results-vercel.csv \
#   LEVELS="10 50 100 200" ./loadtest/run.sh <short_code>

CODE=${1:?usage: ./loadtest/run.sh <short_code>}
LEVELS=${LEVELS:-"10 50 100 200 500 1000 2000 5000"}
BASE=${BASE:-http://localhost:3000}
OUT=${OUT:-loadtest/results.csv}

echo "endpoint,concurrency,requests,success_rate,p50_ms,p90_ms,p95_ms,p99_ms,req_per_sec,errors" > $OUT

for ep in shorten redirect; do
  for c in $LEVELS; do
    n=$((c * 10))   # 10 requests per connection, so every level gets a fair sample

    if [ $ep = shorten ]; then
      args=(-m POST -H "Content-Type: application/json" -D body.json "$BASE/shorten")
    else
      args=(--redirect 0 "$BASE/redirect?code=$CODE")
    fi

    echo "→ /$ep  concurrency=$c  requests=$n"
    # -t 5s: any request slower than 5 seconds counts as timed out
    oha -n $n -c $c -t 5s --no-tui --output-format json "${args[@]}" 2>/dev/null |
      jq -r --arg ep "/$ep" --argjson c $c --argjson n $n '
        def ms: if . == null then "" else (. * 100000 | round / 100) end;
        [$ep, $c, $n,
         (.summary.successRate * 100 | round),
         (.latencyPercentiles.p50 | ms), (.latencyPercentiles.p90 | ms),
         (.latencyPercentiles.p95 | ms), (.latencyPercentiles.p99 | ms),
         (.summary.requestsPerSec | round),
         ([.errorDistribution[]] | add // 0)] | @csv' >> $OUT

    tail -1 $OUT
    sleep 3   # let the server settle between levels
  done
done

echo "Done → $OUT"
